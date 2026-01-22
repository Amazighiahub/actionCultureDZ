/**
 * OeuvreRepository - Repository pour les œuvres
 * Optimise les requêtes et évite les problèmes N+1
 */
const BaseRepository = require('./BaseRepository');
const { Op, fn, col, literal } = require('sequelize');

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
        as: 'Createur',
        attributes: ['id_user', 'nom', 'prenom', 'photo_url']
      },
      {
        model: this.models.TypeOeuvre,
        as: 'TypeOeuvre',
        attributes: ['id_type_oeuvre', 'nom', 'code']
      },
      {
        model: this.models.Langue,
        as: 'Langue',
        attributes: ['id_langue', 'nom', 'code']
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
        id_createur: userId
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
      where[Op.or] = [
        literal(`JSON_EXTRACT(titre, '$.fr') LIKE '%${query}%'`),
        literal(`JSON_EXTRACT(titre, '$.ar') LIKE '%${query}%'`),
        literal(`JSON_EXTRACT(titre, '$.en') LIKE '%${query}%'`),
        literal(`JSON_EXTRACT(description, '$.fr') LIKE '%${query}%'`)
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
    return this.findById(oeuvreId, {
      include: [
        ...this.getDefaultIncludes(),
        {
          model: this.models.Categorie,
          as: 'Categories',
          through: { attributes: [] }
        },
        {
          model: this.models.Media,
          as: 'Medias',
          attributes: ['id_media', 'url', 'type', 'titre', 'est_principal'],
          order: [['est_principal', 'DESC'], ['ordre', 'ASC']]
        },
        {
          model: this.models.TagMotCle,
          as: 'Tags',
          through: { attributes: [] }
        },
        {
          model: this.models.User,
          as: 'Intervenants',
          through: {
            model: this.models.OeuvreIntervenant,
            attributes: ['role', 'contribution']
          }
        }
      ]
    });
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
      order: [['nb_vues', 'DESC']],
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

    return this.model.findAll({
      where: {
        id_oeuvre: { [Op.ne]: oeuvreId },
        statut: 'publie',
        id_type_oeuvre: oeuvre.id_type_oeuvre
      },
      include: this.getDefaultIncludes(),
      order: literal('RAND()'),
      limit
    });
  }

  /**
   * Valide une œuvre
   */
  async validate(oeuvreId, validatorId) {
    return this.update(oeuvreId, {
      statut: 'publie',
      date_validation: new Date(),
      valide_par: validatorId
    });
  }

  /**
   * Refuse une œuvre
   */
  async reject(oeuvreId, validatorId, motif) {
    return this.update(oeuvreId, {
      statut: 'refuse',
      date_validation: new Date(),
      valide_par: validatorId,
      motif_refus: motif
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
      this.count({ statut: 'refuse' }),
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
