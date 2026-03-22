/**
 * MetadataService - Service pour les données de référence (lookup tables)
 * Gère : Langue, Categorie, Genre, TypeOeuvre, Editeur, TypeUser, TagMotCle,
 *         Materiau, Technique, Wilaya, Daira, Commune, TypeEvenement, TypeOrganisation
 */
const { Op } = require('sequelize');
const { mergeTranslations, prepareMultiLangField, buildMultiLangExactMatch, SUPPORTED_LANGUAGES } = require('../helpers/i18n');
const { sanitizeLike } = require('../utils/sanitize');
const CacheManager = require('../utils/CacheManager');

class MetadataService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.cache = CacheManager.create({
      namespace: 'metadata',
      defaultTTL: 10 * 60 * 1000, // 10 min — tables de référence changent rarement
      maxSize: 100
    });
  }

  /**
   * Récupère depuis le cache ou exécute le générateur
   */
  async _cached(key, generator, ttl) {
    return this.cache.getOrSet(key, generator, ttl);
  }

  /**
   * Invalide le cache pour un pattern donné (ou tout le cache)
   */
  clearCache(pattern = null) {
    this.cache.invalidate(pattern);
  }

  // ========================================================================
  // LECTURE — Données de référence
  // ========================================================================

  async getAllMetadata() {
    return this._cached('all_metadata', async () => {
      const [langues, categories, genres, types_oeuvres, editeurs, types_users, tags, materiaux, techniques] = await Promise.all([
        this.models.Langue?.findAll({ order: [['nom', 'ASC']] }) || [],
        this.models.Categorie?.findAll({ order: [['id_categorie', 'ASC']] }) || [],
        this.models.Genre?.findAll({ order: [['id_genre', 'ASC']] }) || [],
        this.models.TypeOeuvre?.findAll({ order: [['id_type_oeuvre', 'ASC']] }) || [],
        this.models.Editeur?.findAll({ where: { actif: true }, order: [['nom', 'ASC']] }) || [],
        this.models.TypeUser?.findAll({ order: [['id_type_user', 'ASC']] }) || [],
        this.models.TagMotCle?.findAll({ order: [['id_tag', 'ASC']], limit: 100 }) || [],
        this.models.Materiau?.findAll({ order: [['id_materiau', 'ASC']] }) || [],
        this.models.Technique?.findAll({ order: [['id_technique', 'ASC']] }) || []
      ]);
      return { langues, categories, genres, types_oeuvres, editeurs, types_users, tags, materiaux, techniques };
    });
  }

  async getTypesOeuvres() {
    return this._cached('types_oeuvres', () =>
      this.models.TypeOeuvre.findAll({ order: [['id_type_oeuvre', 'ASC']] })
    );
  }

  async getGenresParType(typeId) {
    return this._cached(`genres_type_${typeId}`, async () => {
      const typeGenres = await this.models.TypeOeuvreGenre.findAll({
        where: { id_type_oeuvre: typeId, actif: true },
        include: [{
          model: this.models.Genre, as: 'genre',
          attributes: ['id_genre', 'nom', 'description']
        }],
        order: [['ordre_affichage', 'ASC']]
      });
      return typeGenres.map(tg => ({
        ...(tg.genre?.toJSON() || tg.genre),
        ordre_affichage: tg.ordre_affichage
      }));
    });
  }

  async getCategoriesParGenre(genreId) {
    return this._cached(`categories_genre_${genreId}`, async () => {
      const genreCategories = await this.models.GenreCategorie.findAll({
        where: { id_genre: genreId, actif: true },
        include: [{
          model: this.models.Categorie, as: 'categorie',
          attributes: ['id_categorie', 'nom', 'description']
        }],
        order: [['ordre_affichage', 'ASC']]
      });
      return genreCategories.map(gc => ({
        ...(gc.categorie?.toJSON() || gc.categorie),
        ordre_affichage: gc.ordre_affichage
      }));
    });
  }

  async getHierarchieComplete() {
    return this._cached('hierarchie_complete', () =>
      this.models.TypeOeuvre.findAll({
        include: [{
          model: this.models.TypeOeuvreGenre, as: 'typeOeuvreGenres',
          where: { actif: true }, required: false,
          include: [{
            model: this.models.Genre, as: 'genre',
            include: [{
              model: this.models.GenreCategorie, as: 'genreCategories',
              where: { actif: true }, required: false,
              include: [{ model: this.models.Categorie, as: 'categorie' }]
            }]
          }]
        }],
        order: [['id_type_oeuvre', 'ASC']]
      })
    );
  }

  async getGenres() {
    return this._cached('genres', () =>
      this.models.Genre.findAll({ order: [['id_genre', 'ASC']] })
    );
  }

  async getTags({ search, limit = 50 } = {}) {
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);

    // Sans recherche : retourne les tags triés par fréquence d'utilisation
    if (!search) {
      return this._cached(`tags_${parsedLimit}`, async () => {
        // Trier par nombre d'oeuvres associées (les plus utilisés en premier)
        if (this.models.OeuvreTag) {
          return this.models.TagMotCle.findAll({
            attributes: {
              include: [[
                this.sequelize.literal('(SELECT COUNT(*) FROM oeuvretag WHERE oeuvretag.id_tag = TagMotCle.id_tag)'),
                'usage_count'
              ]]
            },
            order: [[this.sequelize.literal('usage_count'), 'DESC']],
            limit: parsedLimit
          });
        }
        return this.models.TagMotCle.findAll({ order: [['id_tag', 'ASC']], limit: parsedLimit });
      });
    }

    // Avec recherche : recherche multilingue via JSON_EXTRACT, pas de cache
    const where = {};
    where[Op.or] = SUPPORTED_LANGUAGES.map(l => {
      const jsonPath = l.includes('-') ? `$."${l}"` : `$.${l}`;
      return this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), this.sequelize.literal(`'${jsonPath}'`)),
        { [Op.like]: `%${sanitizeLike(search)}%` }
      );
    });

    const queryOptions = { where, limit: parsedLimit };

    // Trier par fréquence si possible
    if (this.models.OeuvreTag) {
      queryOptions.attributes = {
        include: [[
          this.sequelize.literal('(SELECT COUNT(*) FROM oeuvretag WHERE oeuvretag.id_tag = TagMotCle.id_tag)'),
          'usage_count'
        ]]
      };
      queryOptions.order = [[this.sequelize.literal('usage_count'), 'DESC']];
    } else {
      queryOptions.order = [['id_tag', 'ASC']];
    }

    return this.models.TagMotCle.findAll(queryOptions);
  }

  _findAllIfExists(modelName, options = {}) {
    if (!this.models[modelName]) return [];
    return this.models[modelName].findAll(options);
  }

  async getMateriaux() {
    return this._cached('materiaux', () =>
      this._findAllIfExists('Materiau', { order: [['id_materiau', 'ASC']] })
    );
  }

  async getTechniques() {
    return this._cached('techniques', () =>
      this._findAllIfExists('Technique', { order: [['id_technique', 'ASC']] })
    );
  }

  async getLangues() {
    return this._cached('langues', () =>
      this._findAllIfExists('Langue', { order: [['nom', 'ASC']] })
    );
  }

  async getWilayas({ includeDairas = false, includeCommunes = false } = {}) {
    if (!this.models.Wilaya) return [];

    const cacheKey = `wilayas_${includeDairas ? 'd' : ''}${includeCommunes ? 'c' : ''}`;
    return this._cached(cacheKey, () => {
      const include = [];
      if (includeDairas && this.models.Daira) {
        const dairaInclude = {
          model: this.models.Daira, as: 'Dairas',
          attributes: ['id_daira', 'nom', 'daira_name_ascii', 'wilayaId']
        };
        if (includeCommunes && this.models.Commune) {
          dairaInclude.include = [{
            model: this.models.Commune, as: 'Communes',
            attributes: ['id_commune', 'nom', 'commune_name_ascii', 'dairaId']
          }];
        }
        include.push(dairaInclude);
      }

      return this.models.Wilaya.findAll({
        attributes: ['id_wilaya', 'codeW', 'nom', 'wilaya_name_ascii'],
        include, order: [['codeW', 'ASC']]
      });
    });
  }

  async getDairasParWilaya(wilayaId) {
    if (!this.models.Daira) return [];
    return this._cached(`dairas_wilaya_${wilayaId}`, () =>
      this.models.Daira.findAll({
        where: { wilayaId }, attributes: ['id_daira', 'nom', 'daira_name_ascii', 'wilayaId'],
        order: [['daira_name_ascii', 'ASC']]
      })
    );
  }

  async getCommunesParDaira(dairaId) {
    if (!this.models.Commune) return [];
    return this._cached(`communes_daira_${dairaId}`, () =>
      this.models.Commune.findAll({
        where: { dairaId }, attributes: ['id_commune', 'nom', 'commune_name_ascii', 'dairaId'],
        order: [['commune_name_ascii', 'ASC']]
      })
    );
  }

  async getTypesEvenements() {
    return this._cached('types_evenements', () =>
      this._findAllIfExists('TypeEvenement', { order: [['id_type_evenement', 'ASC']] })
    );
  }

  async getTypesUsers() {
    return this._cached('types_users', () =>
      this._findAllIfExists('TypeUser', { order: [['id_type_user', 'ASC']] })
    );
  }

  async getTypesOrganisations() {
    return this._cached('types_organisations', () =>
      this._findAllIfExists('TypeOrganisation', { order: [['id_type_organisation', 'ASC']] })
    );
  }

  async getEditeurs({ search, limit = 50 } = {}) {
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);

    if (!search) {
      return this._cached(`editeurs_${parsedLimit}`, () =>
        this._findAllIfExists('Editeur', {
          where: { actif: true },
          order: [['nom', 'ASC']],
          limit: parsedLimit
        })
      );
    }

    // Recherche multilingue sur le nom
    const where = { actif: true };
    where[Op.and] = [{
      [Op.or]: SUPPORTED_LANGUAGES.map(l => {
        const jsonPath = l.includes('-') ? `$."${l}"` : `$.${l}`;
        return this.sequelize.where(
          this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), this.sequelize.literal(`'${jsonPath}'`)),
          { [Op.like]: `%${sanitizeLike(search)}%` }
        );
      })
    }];

    return this.models.Editeur.findAll({
      where,
      order: [['nom', 'ASC']],
      limit: parsedLimit
    });
  }

  // ========================================================================
  // TRADUCTION ADMIN — get/update translations
  // ========================================================================

  async _getEntityTranslations(modelName, id, fields) {
    if (!this.models[modelName]) return null;
    const entity = await this.models[modelName].findByPk(id);
    if (!entity) return null;
    const result = {};
    for (const f of fields) {
      result[f] = entity[f];
    }
    return result;
  }

  async _updateEntityTranslation(modelName, id, targetLang, fieldsMap) {
    if (!this.models[modelName]) return null;
    const entity = await this.models[modelName].findByPk(id);
    if (!entity) return null;

    const updates = {};
    for (const [bodyField, dbField] of Object.entries(fieldsMap)) {
      if (bodyField !== undefined) {
        updates[dbField] = mergeTranslations(entity[dbField], { [targetLang]: bodyField });
      }
    }
    await entity.update(updates);
    return entity;
  }

  // Categorie
  async getCategorieTranslations(id) {
    return this._getEntityTranslations('Categorie', id, ['id_categorie', 'nom', 'description']);
  }
  async updateCategorieTranslation(id, targetLang, { nom, description }) {
    const cat = await this.models.Categorie.findByPk(id);
    if (!cat) return null;
    const updates = {};
    if (nom !== undefined) updates.nom = mergeTranslations(cat.nom, { [targetLang]: nom });
    if (description !== undefined) updates.description = mergeTranslations(cat.description, { [targetLang]: description });
    await cat.update(updates);
    this.clearCache();
    return cat;
  }

  // Genre
  async getGenreTranslations(id) {
    return this._getEntityTranslations('Genre', id, ['id_genre', 'nom', 'description']);
  }
  async updateGenreTranslation(id, targetLang, { nom, description }) {
    const genre = await this.models.Genre.findByPk(id);
    if (!genre) return null;
    const updates = {};
    if (nom !== undefined) updates.nom = mergeTranslations(genre.nom, { [targetLang]: nom });
    if (description !== undefined) updates.description = mergeTranslations(genre.description, { [targetLang]: description });
    await genre.update(updates);
    this.clearCache();
    return genre;
  }

  // TypeOeuvre
  async getTypeOeuvreTranslations(id) {
    return this._getEntityTranslations('TypeOeuvre', id, ['id_type_oeuvre', 'nom_type', 'description']);
  }
  async updateTypeOeuvreTranslation(id, targetLang, { nom, description }) {
    const type = await this.models.TypeOeuvre.findByPk(id);
    if (!type) return null;
    const updates = {};
    if (nom !== undefined) updates.nom_type = mergeTranslations(type.nom_type, { [targetLang]: nom });
    if (description !== undefined) updates.description = mergeTranslations(type.description, { [targetLang]: description });
    await type.update(updates);
    this.clearCache();
    return type;
  }

  // Tag
  async getTagTranslations(id) {
    return this._getEntityTranslations('TagMotCle', id, ['id_tag', 'nom']);
  }
  async updateTagTranslation(id, targetLang, { nom }) {
    const tag = await this.models.TagMotCle.findByPk(id);
    if (!tag) return null;
    if (nom !== undefined) await tag.update({ nom: mergeTranslations(tag.nom, { [targetLang]: nom }) });
    this.clearCache('tag');
    return tag;
  }

  // Materiau
  async getMateriauTranslations(id) {
    return this._getEntityTranslations('Materiau', id, ['id_materiau', 'nom', 'description']);
  }
  async updateMateriauTranslation(id, targetLang, { nom, description }) {
    if (!this.models.Materiau) return null;
    const mat = await this.models.Materiau.findByPk(id);
    if (!mat) return null;
    const updates = {};
    if (nom !== undefined) updates.nom = mergeTranslations(mat.nom, { [targetLang]: nom });
    if (description !== undefined) updates.description = mergeTranslations(mat.description, { [targetLang]: description });
    await mat.update(updates);
    this.clearCache('materiau');
    return mat;
  }

  // Technique
  async getTechniqueTranslations(id) {
    return this._getEntityTranslations('Technique', id, ['id_technique', 'nom', 'description']);
  }
  async updateTechniqueTranslation(id, targetLang, { nom, description }) {
    if (!this.models.Technique) return null;
    const tech = await this.models.Technique.findByPk(id);
    if (!tech) return null;
    const updates = {};
    if (nom !== undefined) updates.nom = mergeTranslations(tech.nom, { [targetLang]: nom });
    if (description !== undefined) updates.description = mergeTranslations(tech.description, { [targetLang]: description });
    await tech.update(updates);
    this.clearCache('technique');
    return tech;
  }

  // ========================================================================
  // CRÉATION ADMIN
  // ========================================================================

  async createTypeOeuvre(lang, { nom, description }) {
    // Vérifier si un type avec le même nom existe déjà (insensible à la casse)
    const existing = await this._findByMultiLangName(this.models.TypeOeuvre, 'nom_type', nom, lang);
    if (existing) return existing;

    this.clearCache();
    return this.models.TypeOeuvre.create({
      nom_type: prepareMultiLangField(nom, lang),
      description: prepareMultiLangField(description, lang)
    });
  }

  async createGenre(lang, { nom, description, id_type_oeuvre }) {
    // Vérifier si un genre avec le même nom existe déjà
    const existing = await this._findByMultiLangName(this.models.Genre, 'nom', nom, lang);
    if (existing) {
      // Associer au type si nécessaire
      if (id_type_oeuvre && this.models.TypeOeuvreGenre) {
        await this.models.TypeOeuvreGenre.findOrCreate({
          where: { id_type_oeuvre, id_genre: existing.id_genre },
          defaults: { actif: true, ordre_affichage: 0 }
        });
      }
      return existing;
    }

    this.clearCache();
    const genre = await this.models.Genre.create({
      nom: prepareMultiLangField(nom, lang),
      description: prepareMultiLangField(description, lang)
    });
    if (id_type_oeuvre) {
      await this.models.TypeOeuvreGenre.findOrCreate({
        where: { id_type_oeuvre, id_genre: genre.id_genre },
        defaults: { actif: true, ordre_affichage: 0 }
      });
    }
    return genre;
  }

  async createCategorie(lang, { nom, description, id_genre }) {
    // Vérifier si une catégorie avec le même nom existe déjà
    const existing = await this._findByMultiLangName(this.models.Categorie, 'nom', nom, lang);
    if (existing) {
      if (id_genre && this.models.GenreCategorie) {
        await this.models.GenreCategorie.findOrCreate({
          where: { id_genre, id_categorie: existing.id_categorie },
          defaults: { actif: true, ordre_affichage: 0 }
        });
      }
      return existing;
    }

    this.clearCache();
    const categorie = await this.models.Categorie.create({
      nom: prepareMultiLangField(nom, lang),
      description: prepareMultiLangField(description, lang)
    });
    if (id_genre) {
      await this.models.GenreCategorie.findOrCreate({
        where: { id_genre, id_categorie: categorie.id_categorie },
        defaults: { actif: true, ordre_affichage: 0 }
      });
    }
    return categorie;
  }

  async createTag(lang, { nom }) {
    // Vérifier si un tag avec le même nom existe déjà (insensible à la casse)
    const existing = await this._findByMultiLangName(this.models.TagMotCle, 'nom', nom, lang);
    if (existing) return existing;

    this.clearCache('tag');
    return this.models.TagMotCle.create({ nom: prepareMultiLangField(nom, lang) });
  }

  async createMateriau(lang, { nom, description }) {
    if (!this.models.Materiau) return null;
    const existing = await this._findByMultiLangName(this.models.Materiau, 'nom', nom, lang);
    if (existing) return existing;

    this.clearCache('materiau');
    return this.models.Materiau.create({
      nom: prepareMultiLangField(nom, lang),
      description: prepareMultiLangField(description, lang)
    });
  }

  async createTechnique(lang, { nom, description }) {
    if (!this.models.Technique) return null;
    const existing = await this._findByMultiLangName(this.models.Technique, 'nom', nom, lang);
    if (existing) return existing;

    this.clearCache('technique');
    return this.models.Technique.create({
      nom: prepareMultiLangField(nom, lang),
      description: prepareMultiLangField(description, lang)
    });
  }

  async createEditeur(lang, { nom, type_editeur, site_web, email, telephone, description }) {
    if (!this.models.Editeur) return null;
    // Vérifier si un éditeur avec le même nom existe déjà
    const existing = await this._findByMultiLangName(this.models.Editeur, 'nom', nom, lang);
    if (existing) return existing;

    this.clearCache('editeur');
    return this.models.Editeur.create({
      nom: prepareMultiLangField(nom, lang),
      type_editeur: type_editeur || 'autre',
      site_web: site_web || null,
      email: email || null,
      telephone: telephone || null,
      description: prepareMultiLangField(description, lang),
      actif: true
    });
  }

  // ========================================================================
  // UTILITAIRES — Déduplication
  // ========================================================================

  /**
   * Cherche une entité existante par correspondance exacte (insensible à la casse)
   * sur un champ JSON multilingue. Cherche dans toutes les langues supportées.
   * @param {Model} Model - Modèle Sequelize
   * @param {string} field - Nom du champ JSON (ex: 'nom', 'nom_type')
   * @param {string|Object} value - Valeur à chercher (string ou objet multilingue)
   * @param {string} lang - Langue courante
   * @returns {Object|null} - Entité existante ou null
   */
  async _findByMultiLangName(Model, field, value, lang = 'fr') {
    if (!Model || !value) return null;

    // Extraire la string à comparer
    const searchStr = typeof value === 'string'
      ? value.trim()
      : (value[lang] || value.fr || Object.values(value).find(v => typeof v === 'string' && v.trim()) || '');

    if (!searchStr) return null;

    const whereClause = buildMultiLangExactMatch(field, searchStr);
    if (!whereClause || !whereClause[Op.or]) return null;

    return Model.findOne({ where: whereClause });
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getUsageStatistics() {
    const [langues, categories, genres, typesOeuvres, editeurs, tags, materiaux, techniques] = await Promise.all([
      this.models.Langue?.count() || 0,
      this.models.Categorie?.count() || 0,
      this.models.Genre?.count() || 0,
      this.models.TypeOeuvre?.count() || 0,
      this.models.Editeur?.count({ where: { actif: true } }) || 0,
      this.models.TagMotCle?.count() || 0,
      this.models.Materiau?.count() || 0,
      this.models.Technique?.count() || 0
    ]);
    return { langues, categories, genres, typesOeuvres, editeurs, tags, materiaux, techniques };
  }
}

module.exports = MetadataService;
