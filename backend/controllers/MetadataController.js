// controllers/MetadataController.js - VERSION i18n COMPLÈTE
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations, prepareMultiLangField, SUPPORTED_LANGUAGES } = require('../helpers/i18n');

class MetadataController {
  constructor(models) {
    if (!models) {
      throw new Error('MetadataController: Les modèles sont requis');
    }
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // MÉTHODES DE CONSULTATION PUBLIQUES
  // ========================================================================

  /**
   * GET /api/metadata/ ou /api/metadata/all
   */
  async getAllMetadata(req, res) {
    try {
      const lang = req.lang || 'fr';

      const [
        langues,
        categories,
        genres,
        types_oeuvres,
        editeurs,
        types_users,
        tags,
        materiaux,
        techniques
      ] = await Promise.all([
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

      res.json({
        success: true,
        data: {
          langues: translateDeep(langues, lang),
          categories: translateDeep(categories, lang),
          genres: translateDeep(genres, lang),
          types_oeuvres: translateDeep(types_oeuvres, lang),
          editeurs,
          types_users: translateDeep(types_users, lang),
          tags: translateDeep(tags, lang),
          materiaux: translateDeep(materiaux, lang),
          techniques: translateDeep(techniques, lang)
        },
        lang
      });
    } catch (error) {
      console.error('Erreur getAllMetadata:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/types-oeuvres
   */
  async getTypesOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';

      const types = await this.models.TypeOeuvre.findAll({
        order: [['id_type_oeuvre', 'ASC']]
      });
      
      res.json({
        success: true,
        data: translateDeep(types, lang),
        lang
      });
    } catch (error) {
      console.error('Erreur getTypesOeuvres:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/genres/:typeId
   */
  async getGenresParType(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { typeId } = req.params;
      
      const typeGenres = await this.models.TypeOeuvreGenre.findAll({
        where: { id_type_oeuvre: typeId, actif: true },
        include: [{
          model: this.models.Genre,
          attributes: ['id_genre', 'nom', 'description']
        }],
        order: [['ordre_affichage', 'ASC']]
      });

      const genres = typeGenres.map(tg => ({
        ...translateDeep(tg.Genre?.toJSON() || tg.Genre, lang),
        ordre_affichage: tg.ordre_affichage
      }));

      res.json({ success: true, data: genres, lang });
    } catch (error) {
      console.error('Erreur getGenresParType:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/categories/:genreId
   */
  async getCategoriesParGenre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { genreId } = req.params;
      
      const genreCategories = await this.models.GenreCategorie.findAll({
        where: { id_genre: genreId, actif: true },
        include: [{
          model: this.models.Categorie,
          attributes: ['id_categorie', 'nom', 'description']
        }],
        order: [['ordre_affichage', 'ASC']]
      });

      const categories = genreCategories.map(gc => ({
        ...translateDeep(gc.Categorie?.toJSON() || gc.Categorie, lang),
        ordre_affichage: gc.ordre_affichage
      }));

      res.json({ success: true, data: categories, lang });
    } catch (error) {
      console.error('Erreur getCategoriesParGenre:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/hierarchie
   */
  async getHierarchieComplete(req, res) {
    try {
      const lang = req.lang || 'fr';

      const types = await this.models.TypeOeuvre.findAll({
        include: [{
          model: this.models.TypeOeuvreGenre,
          as: 'type_oeuvre_genres',
          where: { actif: true },
          required: false,
          include: [{
            model: this.models.Genre,
            include: [{
              model: this.models.GenreCategorie,
              as: 'genre_categories',
              where: { actif: true },
              required: false,
              include: [{ model: this.models.Categorie }]
            }]
          }]
        }],
        order: [['id_type_oeuvre', 'ASC']]
      });

      const hierarchy = types.map(type => {
        const typeJson = type.toJSON ? type.toJSON() : type;
        return {
          id_type_oeuvre: typeJson.id_type_oeuvre,
          nom_type: translate(typeJson.nom_type, lang),
          description: translate(typeJson.description, lang),
          genres: typeJson.type_oeuvre_genres?.map(tg => ({
            id_genre: tg.Genre?.id_genre,
            nom: translate(tg.Genre?.nom, lang),
            description: translate(tg.Genre?.description, lang),
            ordre_affichage: tg.ordre_affichage,
            categories: tg.Genre?.genre_categories?.map(gc => ({
              id_categorie: gc.Categorie?.id_categorie,
              nom: translate(gc.Categorie?.nom, lang),
              description: translate(gc.Categorie?.description, lang),
              ordre_affichage: gc.ordre_affichage
            })) || []
          })) || []
        };
      });

      res.json({ success: true, data: hierarchy, lang });
    } catch (error) {
      console.error('Erreur getHierarchieComplete:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/genres
   */
  async getGenres(req, res) {
    try {
      const lang = req.lang || 'fr';
      const genres = await this.models.Genre.findAll({ order: [['id_genre', 'ASC']] });
      res.json({ success: true, data: translateDeep(genres, lang), lang });
    } catch (error) {
      console.error('Erreur getGenres:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/tags
   */
  async getTags(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { search, limit = 50 } = req.query;

      const where = {};
      if (search) {
        where[Op.or] = SUPPORTED_LANGUAGES.map(l => 
          this.sequelize.where(
            this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), `$.${l}`),
            { [Op.like]: `%${search}%` }
          )
        );
      }

      const tags = await this.models.TagMotCle.findAll({
        where,
        order: [['id_tag', 'ASC']],
        limit: parseInt(limit)
      });

      res.json({ success: true, data: translateDeep(tags, lang), lang });
    } catch (error) {
      console.error('Erreur getTags:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/materiaux
   */
  async getMateriaux(req, res) {
    try {
      const lang = req.lang || 'fr';
      if (!this.models.Materiau) {
        return res.json({ success: true, data: [], lang });
      }
      const materiaux = await this.models.Materiau.findAll({ order: [['id_materiau', 'ASC']] });
      res.json({ success: true, data: translateDeep(materiaux, lang), lang });
    } catch (error) {
      console.error('Erreur getMateriaux:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/techniques
   */
  async getTechniques(req, res) {
    try {
      const lang = req.lang || 'fr';
      if (!this.models.Technique) {
        return res.json({ success: true, data: [], lang });
      }
      const techniques = await this.models.Technique.findAll({ order: [['id_technique', 'ASC']] });
      res.json({ success: true, data: translateDeep(techniques, lang), lang });
    } catch (error) {
      console.error('Erreur getTechniques:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/langues
   */
  async getLangues(req, res) {
    try {
      const lang = req.lang || 'fr';
      if (!this.models.Langue) {
        return res.json({ success: true, data: [], lang });
      }
      const langues = await this.models.Langue.findAll({ order: [['nom', 'ASC']] });
      res.json({ success: true, data: translateDeep(langues, lang), lang });
    } catch (error) {
      console.error('Erreur getLangues:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/wilayas
   */
  async getWilayas(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { includeDairas = 'false', includeCommunes = 'false' } = req.query;

      if (!this.models.Wilaya) {
        return res.json({ success: true, data: [], lang });
      }

      const include = [];
      
      if (includeDairas === 'true' && this.models.Daira) {
        const dairaInclude = {
          model: this.models.Daira,
          as: 'Dairas',
          attributes: ['id_daira', 'nom', 'daira_name_ascii', 'wilayaId']
        };
        
        if (includeCommunes === 'true' && this.models.Commune) {
          dairaInclude.include = [{
            model: this.models.Commune,
            as: 'Communes',
            attributes: ['id_commune', 'nom', 'commune_name_ascii', 'dairaId']
          }];
        }
        
        include.push(dairaInclude);
      }

      const wilayas = await this.models.Wilaya.findAll({
        attributes: ['id_wilaya', 'codeW', 'nom', 'wilaya_name_ascii'],
        include,
        order: [['codeW', 'ASC']]
      });
      
      res.json({
        success: true,
        data: translateDeep(wilayas, lang),
        lang
      });
    } catch (error) {
      console.error('Erreur getWilayas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/wilayas/:wilayaId/dairas
   */
  async getDairasParWilaya(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { wilayaId } = req.params;

      if (!this.models.Daira) {
        return res.json({ success: true, data: [], lang });
      }
      
      const dairas = await this.models.Daira.findAll({
        where: { wilayaId: wilayaId },
        attributes: ['id_daira', 'nom', 'daira_name_ascii', 'wilayaId'],
        order: [['daira_name_ascii', 'ASC']]
      });
      
      res.json({ success: true, data: translateDeep(dairas, lang), lang });
    } catch (error) {
      console.error('Erreur getDairasParWilaya:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/dairas/:dairaId/communes
   */
  async getCommunesParDaira(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { dairaId } = req.params;

      if (!this.models.Commune) {
        return res.json({ success: true, data: [], lang });
      }
      
      const communes = await this.models.Commune.findAll({
        where: { dairaId: dairaId },
        attributes: ['id_commune', 'nom', 'commune_name_ascii', 'dairaId'],
        order: [['commune_name_ascii', 'ASC']]
      });
      
      res.json({ success: true, data: translateDeep(communes, lang), lang });
    } catch (error) {
      console.error('Erreur getCommunesParDaira:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/metadata/types-evenements
   */
  async getTypesEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';
      
      if (!this.models.TypeEvenement) {
        return res.json({ success: true, data: [], lang });
      }

      const types = await this.models.TypeEvenement.findAll({
        order: [['id_type_evenement', 'ASC']]
      });
      
      res.json({ success: true, data: translateDeep(types, lang), lang });
    } catch (error) {
      console.error('Erreur getTypesEvenements:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // ⚡ MÉTHODES DE TRADUCTION (ADMIN) - CATÉGORIES
  // ========================================================================

  async getCategorieTranslations(req, res) {
    try {
      const { id } = req.params;
      const categorie = await this.models.Categorie.findByPk(id);
      
      if (!categorie) {
        return res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
      }

      res.json({
        success: true,
        data: {
          id_categorie: categorie.id_categorie,
          nom: categorie.nom,
          description: categorie.description
        }
      });
    } catch (error) {
      console.error('Erreur getCategorieTranslations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateCategorieTranslation(req, res) {
    try {
      const { id } = req.params;
      const targetLang = req.targetLanguage || req.params.lang;
      const { nom, description } = req.body;

      const categorie = await this.models.Categorie.findByPk(id);
      if (!categorie) {
        return res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
      }

      const updates = {};
      if (nom !== undefined) {
        updates.nom = mergeTranslations(categorie.nom, { [targetLang]: nom });
      }
      if (description !== undefined) {
        updates.description = mergeTranslations(categorie.description, { [targetLang]: description });
      }

      await categorie.update(updates);

      res.json({
        success: true,
        message: `Traduction ${targetLang} mise à jour`,
        data: { nom: categorie.nom, description: categorie.description }
      });
    } catch (error) {
      console.error('Erreur updateCategorieTranslation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // ⚡ MÉTHODES DE TRADUCTION (ADMIN) - GENRES
  // ========================================================================

  async getGenreTranslations(req, res) {
    try {
      const { id } = req.params;
      const genre = await this.models.Genre.findByPk(id);
      
      if (!genre) {
        return res.status(404).json({ success: false, error: 'Genre non trouvé' });
      }

      res.json({
        success: true,
        data: { id_genre: genre.id_genre, nom: genre.nom, description: genre.description }
      });
    } catch (error) {
      console.error('Erreur getGenreTranslations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateGenreTranslation(req, res) {
    try {
      const { id } = req.params;
      const targetLang = req.targetLanguage || req.params.lang;
      const { nom, description } = req.body;

      const genre = await this.models.Genre.findByPk(id);
      if (!genre) {
        return res.status(404).json({ success: false, error: 'Genre non trouvé' });
      }

      const updates = {};
      if (nom !== undefined) updates.nom = mergeTranslations(genre.nom, { [targetLang]: nom });
      if (description !== undefined) updates.description = mergeTranslations(genre.description, { [targetLang]: description });

      await genre.update(updates);
      res.json({ success: true, message: `Traduction ${targetLang} mise à jour` });
    } catch (error) {
      console.error('Erreur updateGenreTranslation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // ⚡ MÉTHODES DE TRADUCTION (ADMIN) - TYPES D'ŒUVRES
  // ========================================================================

  async getTypeOeuvreTranslations(req, res) {
    try {
      const { id } = req.params;
      const type = await this.models.TypeOeuvre.findByPk(id);
      
      if (!type) {
        return res.status(404).json({ success: false, error: 'Type non trouvé' });
      }

      res.json({
        success: true,
        data: { id_type_oeuvre: type.id_type_oeuvre, nom_type: type.nom_type, description: type.description }
      });
    } catch (error) {
      console.error('Erreur getTypeOeuvreTranslations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateTypeOeuvreTranslation(req, res) {
    try {
      const { id } = req.params;
      const targetLang = req.targetLanguage || req.params.lang;
      const { nom, description } = req.body;

      const type = await this.models.TypeOeuvre.findByPk(id);
      if (!type) {
        return res.status(404).json({ success: false, error: 'Type non trouvé' });
      }

      const updates = {};
      if (nom !== undefined) updates.nom_type = mergeTranslations(type.nom_type, { [targetLang]: nom });
      if (description !== undefined) updates.description = mergeTranslations(type.description, { [targetLang]: description });

      await type.update(updates);
      res.json({ success: true, message: `Traduction ${targetLang} mise à jour` });
    } catch (error) {
      console.error('Erreur updateTypeOeuvreTranslation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // ⚡ MÉTHODES DE TRADUCTION (ADMIN) - TAGS
  // ========================================================================

  async getTagTranslations(req, res) {
    try {
      const { id } = req.params;
      const tag = await this.models.TagMotCle.findByPk(id);
      
      if (!tag) {
        return res.status(404).json({ success: false, error: 'Tag non trouvé' });
      }

      res.json({ success: true, data: { id_tag: tag.id_tag, nom: tag.nom } });
    } catch (error) {
      console.error('Erreur getTagTranslations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateTagTranslation(req, res) {
    try {
      const { id } = req.params;
      const targetLang = req.targetLanguage || req.params.lang;
      const { nom } = req.body;

      const tag = await this.models.TagMotCle.findByPk(id);
      if (!tag) {
        return res.status(404).json({ success: false, error: 'Tag non trouvé' });
      }

      if (nom !== undefined) {
        await tag.update({ nom: mergeTranslations(tag.nom, { [targetLang]: nom }) });
      }

      res.json({ success: true, message: `Traduction ${targetLang} mise à jour` });
    } catch (error) {
      console.error('Erreur updateTagTranslation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // ⚡ MÉTHODES DE TRADUCTION (ADMIN) - MATÉRIAUX
  // ========================================================================

  async getMateriauTranslations(req, res) {
    try {
      const { id } = req.params;
      if (!this.models.Materiau) {
        return res.status(404).json({ success: false, error: 'Modèle Materiau non disponible' });
      }
      const materiau = await this.models.Materiau.findByPk(id);
      
      if (!materiau) {
        return res.status(404).json({ success: false, error: 'Matériau non trouvé' });
      }

      res.json({ success: true, data: { id_materiau: materiau.id_materiau, nom: materiau.nom, description: materiau.description } });
    } catch (error) {
      console.error('Erreur getMateriauTranslations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateMateriauTranslation(req, res) {
    try {
      const { id } = req.params;
      const targetLang = req.targetLanguage || req.params.lang;
      const { nom, description } = req.body;

      if (!this.models.Materiau) {
        return res.status(404).json({ success: false, error: 'Modèle Materiau non disponible' });
      }

      const materiau = await this.models.Materiau.findByPk(id);
      if (!materiau) {
        return res.status(404).json({ success: false, error: 'Matériau non trouvé' });
      }

      const updates = {};
      if (nom !== undefined) updates.nom = mergeTranslations(materiau.nom, { [targetLang]: nom });
      if (description !== undefined) updates.description = mergeTranslations(materiau.description, { [targetLang]: description });

      await materiau.update(updates);
      res.json({ success: true, message: `Traduction ${targetLang} mise à jour` });
    } catch (error) {
      console.error('Erreur updateMateriauTranslation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // ⚡ MÉTHODES DE TRADUCTION (ADMIN) - TECHNIQUES
  // ========================================================================

  async getTechniqueTranslations(req, res) {
    try {
      const { id } = req.params;
      if (!this.models.Technique) {
        return res.status(404).json({ success: false, error: 'Modèle Technique non disponible' });
      }
      const technique = await this.models.Technique.findByPk(id);
      
      if (!technique) {
        return res.status(404).json({ success: false, error: 'Technique non trouvée' });
      }

      res.json({ success: true, data: { id_technique: technique.id_technique, nom: technique.nom, description: technique.description } });
    } catch (error) {
      console.error('Erreur getTechniqueTranslations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateTechniqueTranslation(req, res) {
    try {
      const { id } = req.params;
      const targetLang = req.targetLanguage || req.params.lang;
      const { nom, description } = req.body;

      if (!this.models.Technique) {
        return res.status(404).json({ success: false, error: 'Modèle Technique non disponible' });
      }

      const technique = await this.models.Technique.findByPk(id);
      if (!technique) {
        return res.status(404).json({ success: false, error: 'Technique non trouvée' });
      }

      const updates = {};
      if (nom !== undefined) updates.nom = mergeTranslations(technique.nom, { [targetLang]: nom });
      if (description !== undefined) updates.description = mergeTranslations(technique.description, { [targetLang]: description });

      await technique.update(updates);
      res.json({ success: true, message: `Traduction ${targetLang} mise à jour` });
    } catch (error) {
      console.error('Erreur updateTechniqueTranslation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // MÉTHODES DE CRÉATION (ADMIN)
  // ========================================================================

  async createTypeOeuvre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, description } = req.body;

      const type = await this.models.TypeOeuvre.create({
        nom_type: prepareMultiLangField(nom, lang),
        description: prepareMultiLangField(description, lang)
      });

      res.status(201).json({
        success: true,
        message: 'Type d\'œuvre créé',
        data: translateDeep(type, lang)
      });
    } catch (error) {
      console.error('Erreur createTypeOeuvre:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createGenre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, description, id_type_oeuvre } = req.body;

      const genre = await this.models.Genre.create({
        nom: prepareMultiLangField(nom, lang),
        description: prepareMultiLangField(description, lang)
      });

      // Créer la liaison avec le type d'œuvre
      if (id_type_oeuvre) {
        await this.models.TypeOeuvreGenre.create({
          id_type_oeuvre,
          id_genre: genre.id_genre,
          actif: true,
          ordre_affichage: 0
        });
      }

      res.status(201).json({
        success: true,
        message: 'Genre créé',
        data: translateDeep(genre, lang)
      });
    } catch (error) {
      console.error('Erreur createGenre:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createCategorie(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, description, id_genre } = req.body;

      const categorie = await this.models.Categorie.create({
        nom: prepareMultiLangField(nom, lang),
        description: prepareMultiLangField(description, lang)
      });

      // Créer la liaison avec le genre
      if (id_genre) {
        await this.models.GenreCategorie.create({
          id_genre,
          id_categorie: categorie.id_categorie,
          actif: true,
          ordre_affichage: 0
        });
      }

      res.status(201).json({
        success: true,
        message: 'Catégorie créée',
        data: translateDeep(categorie, lang)
      });
    } catch (error) {
      console.error('Erreur createCategorie:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createTag(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom } = req.body;

      const tag = await this.models.TagMotCle.create({
        nom: prepareMultiLangField(nom, lang)
      });

      res.status(201).json({
        success: true,
        message: 'Tag créé',
        data: translateDeep(tag, lang)
      });
    } catch (error) {
      console.error('Erreur createTag:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createMateriau(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, description } = req.body;

      if (!this.models.Materiau) {
        return res.status(404).json({ success: false, error: 'Modèle Materiau non disponible' });
      }

      const materiau = await this.models.Materiau.create({
        nom: prepareMultiLangField(nom, lang),
        description: prepareMultiLangField(description, lang)
      });

      res.status(201).json({
        success: true,
        message: 'Matériau créé',
        data: translateDeep(materiau, lang)
      });
    } catch (error) {
      console.error('Erreur createMateriau:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createTechnique(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, description } = req.body;

      if (!this.models.Technique) {
        return res.status(404).json({ success: false, error: 'Modèle Technique non disponible' });
      }

      const technique = await this.models.Technique.create({
        nom: prepareMultiLangField(nom, lang),
        description: prepareMultiLangField(description, lang)
      });

      res.status(201).json({
        success: true,
        message: 'Technique créée',
        data: translateDeep(technique, lang)
      });
    } catch (error) {
      console.error('Erreur createTechnique:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getUsageStatistics(req, res) {
    try {
      const [
        totalLangues,
        totalCategories,
        totalGenres,
        totalTypesOeuvres,
        totalEditeurs,
        totalTags,
        totalMateriaux,
        totalTechniques
      ] = await Promise.all([
        this.models.Langue?.count() || 0,
        this.models.Categorie?.count() || 0,
        this.models.Genre?.count() || 0,
        this.models.TypeOeuvre?.count() || 0,
        this.models.Editeur?.count({ where: { actif: true } }) || 0,
        this.models.TagMotCle?.count() || 0,
        this.models.Materiau?.count() || 0,
        this.models.Technique?.count() || 0
      ]);

      res.json({
        success: true,
        data: {
          totals: {
            langues: totalLangues,
            categories: totalCategories,
            genres: totalGenres,
            typesOeuvres: totalTypesOeuvres,
            editeurs: totalEditeurs,
            tags: totalTags,
            materiaux: totalMateriaux,
            techniques: totalTechniques
          }
        }
      });
    } catch (error) {
      console.error('Erreur getUsageStatistics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = MetadataController;