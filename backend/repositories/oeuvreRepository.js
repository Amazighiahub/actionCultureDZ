/**
 * OeuvreRepository - Repository pour les œuvres
 * Optimise les requêtes et évite les problèmes N+1
 */
const BaseRepository = require('./baseRepository');
const { Op, fn, col, literal, where: seqWhere } = require('sequelize');

class OeuvreRepository extends BaseRepository {
  constructor(models) {
    super(models.Oeuvre);
    this.models = models;
  }

  /**
   * Includes par défaut optimisés
   */
  getDefaultIncludes() {
    return [
      {
        model: this.models.User,
        as: 'Saiseur',
        attributes: ['id_user', 'nom', 'prenom', 'photo_url']
      },
      {
        model: this.models.TypeOeuvre,
        as: 'TypeOeuvre',
        attributes: ['id_type_oeuvre', 'nom_type', 'description']
      },
      {
        model: this.models.Langue,
        as: 'Langue',
        attributes: ['id_langue', 'nom', 'code']
      },
      {
        model: this.models.Media,
        attributes: ['id_media', 'url', 'type_media', 'titre', 'is_Principale', 'thumbnail_url', 'ordre'],
        required: false
      }
    ];
  }

  /**
   * Trouve les œuvres publiées
   */
  async findPublished(options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        statut: 'publie'
      },
      include: options.include || this.getDefaultIncludes()
    });
  }

  /**
   * Trouve les œuvres en attente
   */
  async findPending(options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        statut: 'en_attente'
      },
      include: options.include || this.getDefaultIncludes()
    });
  }

  /**
   * Trouve les œuvres par type
   */
  async findByType(typeOeuvreId, options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        id_type_oeuvre: typeOeuvreId,
        statut: 'publie'
      },
      include: options.include || this.getDefaultIncludes()
    });
  }

  /**
   * Trouve les œuvres d'un créateur
   */
  async findByCreator(userId, options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        saisi_par: userId
      },
      include: options.include || this.getDefaultIncludes()
    });
  }

  /**
   * Trouve les œuvres par catégorie
   */
  async findByCategory(categoryId, options = {}) {
    return this.findAll({
      ...options,
      include: [
        ...this.getDefaultIncludes(),
        {
          model: this.models.Categorie,
          as: 'Categories',
          where: { id_categorie: categoryId },
          through: { attributes: [] }
        }
      ],
      where: {
        ...options.where,
        statut: 'publie'
      }
    });
  }

  /**
   * Recherche avancée d'œuvres
   */
  async searchAdvanced(params = {}) {
    const {
      query,
      typeOeuvre,
      langue,
      categories,
      anneeMin,
      anneeMax,
      prixMin,
      prixMax,
      page = 1,
      limit = 20,
      sortBy = 'date_creation',
      sortOrder = 'DESC'
    } = params;

    const where = { statut: 'publie' };
    const include = [...this.getDefaultIncludes()];

    // Recherche texte
    if (query) {
      const likePattern = `%${this._sanitizeSearchQuery(query)}%`;
      where[Op.or] = [
        seqWhere(fn('JSON_EXTRACT', col('Oeuvre.titre'), literal("'$.fr'")), { [Op.like]: likePattern }),
        seqWhere(fn('JSON_EXTRACT', col('Oeuvre.titre'), literal("'$.ar'")), { [Op.like]: likePattern }),
        seqWhere(fn('JSON_EXTRACT', col('Oeuvre.titre'), literal("'$.en'")), { [Op.like]: likePattern }),
        seqWhere(fn('JSON_EXTRACT', col('Oeuvre.description'), literal("'$.fr'")), { [Op.like]: likePattern })
      ];
    }

    // Filtres
    if (typeOeuvre) where.id_type_oeuvre = typeOeuvre;
    if (langue) where.id_langue = langue;
    if (anneeMin || anneeMax) {
      where.annee_creation = {};
      if (anneeMin) where.annee_creation[Op.gte] = anneeMin;
      if (anneeMax) where.annee_creation[Op.lte] = anneeMax;
    }
    if (prixMin !== undefined || prixMax !== undefined) {
      where.prix = {};
      if (prixMin !== undefined) where.prix[Op.gte] = prixMin;
      if (prixMax !== undefined) where.prix[Op.lte] = prixMax;
    }

    // Filtre par catégories
    if (categories && categories.length > 0) {
      include.push({
        model: this.models.Categorie,
        as: 'Categories',
        where: { id_categorie: { [Op.in]: categories } },
        through: { attributes: [] },
        required: true
      });
    }

    return this.findAll({
      page,
      limit,
      where,
      include,
      order: [[sortBy, sortOrder]]
    });
  }

  /**
   * Trouve une œuvre avec tous ses détails
   */
  async findWithFullDetails(oeuvreId) {
    const includes = [
      ...this.getDefaultIncludes(),
      {
        model: this.models.TagMotCle,
        as: 'Tags',
        through: { attributes: [] }
      },
      {
        model: this.models.User,
        as: 'Users',
        through: { attributes: ['id_type_user', 'role_principal', 'personnage', 'description_role', 'ordre_apparition'] }
      }
    ];

    // Associations optionnelles (peuvent ne pas exister)
    if (this.models.Categorie) {
      includes.push({
        model: this.models.Categorie,
        through: { attributes: [] }
      });
    }
    if (this.models.OeuvreIntervenant) {
      includes.push({
        model: this.models.OeuvreIntervenant,
        include: [
          { model: this.models.Intervenant, as: 'Intervenant', required: false },
          { model: this.models.TypeUser, as: 'TypeUser', required: false }
        ],
        required: false
      });
    }
    if (this.models.Livre) {
      includes.push({ model: this.models.Livre, required: false });
    }
    if (this.models.OeuvreArt) {
      includes.push({ model: this.models.OeuvreArt, required: false });
    }
    if (this.models.Article) {
      includes.push({ model: this.models.Article, required: false });
    }
    if (this.models.ArticleScientifique) {
      includes.push({ model: this.models.ArticleScientifique, required: false });
    }
    if (this.models.Film) {
      includes.push({ model: this.models.Film, required: false });
    }
    if (this.models.AlbumMusical) {
      includes.push({ model: this.models.AlbumMusical, required: false });
    }

    return this.findById(oeuvreId, { include: includes });
  }

  /**
   * Incrémente le compteur de vues
   */
  async incrementViews(oeuvreId) {
    return this.model.increment('nb_vues', {
      by: 1,
      where: { id_oeuvre: oeuvreId }
    });
  }

  /**
   * Obtient les œuvres populaires
   */
  async findPopular(limit = 10) {
    return this.model.findAll({
      where: { statut: 'publie' },
      include: this.getDefaultIncludes(),
      order: [['nb_vues', 'DESC'], ['date_creation', 'DESC']],
      limit
    });
  }

  /**
   * Obtient les œuvres récentes
   */
  async findRecent(limit = 10) {
    return this.model.findAll({
      where: { statut: 'publie' },
      include: this.getDefaultIncludes(),
      order: [['date_creation', 'DESC']],
      limit
    });
  }

  /**
   * Œuvres similaires
   */
  async findSimilar(oeuvreId, limit = 5) {
    const oeuvre = await this.findById(oeuvreId);
    if (!oeuvre) return [];

    // Fetch more candidates ordered by views, then shuffle in JS
    // Avoids ORDER BY RAND() which causes full table scans
    const candidates = await this.model.findAll({
      where: {
        id_oeuvre: { [Op.ne]: oeuvreId },
        statut: 'publie',
        id_type_oeuvre: oeuvre.id_type_oeuvre
      },
      include: this.getDefaultIncludes(),
      order: [['nb_vues', 'DESC']],
      limit: limit * 3
    });

    // Fisher-Yates shuffle in application layer
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, limit);
  }

  /**
   * Valide une œuvre
   */
  async validate(oeuvreId, validatorId) {
    return this.update(oeuvreId, {
      statut: 'publie',
      date_validation: new Date(),
      validateur_id: validatorId
    });
  }

  /**
   * Refuse une œuvre
   */
  async reject(oeuvreId, validatorId, motif) {
    return this.update(oeuvreId, {
      statut: 'rejete',
      date_validation: new Date(),
      validateur_id: validatorId,
      raison_rejet: motif
    });
  }

  /**
   * Statistiques œuvres
   */
  async getStats() {
    const [
      total,
      published,
      pending,
      rejected,
      byType
    ] = await Promise.all([
      this.count(),
      this.count({ statut: 'publie' }),
      this.count({ statut: 'en_attente' }),
      this.count({ statut: 'rejete' }),
      this.model.findAll({
        attributes: [
          'id_type_oeuvre',
          [fn('COUNT', col('id_oeuvre')), 'count']
        ],
        where: { statut: 'publie' },
        group: ['id_type_oeuvre'],
        raw: true
      })
    ]);

    return {
      total,
      published,
      pending,
      rejected,
      byType
    };
  }
}

module.exports = OeuvreRepository;
