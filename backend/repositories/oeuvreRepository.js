/**
 * OeuvreRepository - Repository pour les œuvres
 * Optimise les requêtes et évite les problèmes N+1
 */
const BaseRepository = require('./baseRepository');
const { Op, fn, col, literal, where: seqWhere } = require('sequelize');
const subtypeRegistry = require('../services/oeuvre/subtypes/subtypeRegistry');

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
   * Split en 2 requêtes parallèles pour réduire le produit cartésien SQL
   */
  async findWithFullDetails(oeuvreId) {
    // Groupe 1 : données essentielles (Saiseur, TypeOeuvre, Langue, Media, Tags, Categories, Users)
    const coreIncludes = [
      ...this.getDefaultIncludes(),
      {
        model: this.models.TagMotCle,
        as: 'Tags',
        attributes: ['id_tag', 'nom'],
        through: { attributes: [] }
      },
      {
        model: this.models.User,
        as: 'Users',
        attributes: ['id_user', 'nom', 'prenom', 'photo_url'],
        through: { attributes: ['id_type_user', 'role_principal', 'personnage', 'description_role', 'ordre_apparition'] }
      }
    ];

    if (this.models.Categorie) {
      coreIncludes.push({
        model: this.models.Categorie,
        attributes: ['id_categorie', 'nom', 'description'],
        through: { attributes: [] }
      });
    }

    if (this.models.Editeur) {
      coreIncludes.push({
        model: this.models.Editeur,
        attributes: ['id_editeur', 'nom', 'description'],
        through: { attributes: ['role_editeur', 'date_edition'] },
        required: false
      });
    }

    // Groupe 2 : intervenants + sous-type (requêtes séparées, en parallèle)
    const secondaryPromises = [];

    if (this.models.OeuvreIntervenant) {
      secondaryPromises.push(
        this.models.OeuvreIntervenant.findAll({
          where: { id_oeuvre: oeuvreId },
          attributes: [
            'id', 'id_oeuvre', 'id_intervenant', 'id_type_user',
            'personnage', 'ordre_apparition', 'role_principal', 'description_role'
          ],
          include: [
            {
              model: this.models.Intervenant,
              as: 'Intervenant',
              attributes: ['id_intervenant', 'nom', 'prenom', 'specialites', 'photo_url', 'biographie'],
              required: false
            },
            { model: this.models.TypeUser, as: 'TypeUser', attributes: ['id_type_user', 'nom_type'], required: false }
          ],
          order: [['ordre_apparition', 'ASC'], ['id', 'ASC']]
        }).catch(() => [])
      );
    } else {
      secondaryPromises.push(Promise.resolve([]));
    }

    // Lancer les 2 groupes en parallèle
    const [oeuvre, intervenants] = await Promise.all([
      this.findById(oeuvreId, { include: coreIncludes }),
      ...secondaryPromises
    ]);

    if (!oeuvre) return null;

    const result = oeuvre.get ? oeuvre.get({ plain: true }) : { ...oeuvre };

    // TypeUser sur la liaison oeuvre_user (le front lit OeuvreUser.TypeUser)
    if (Array.isArray(result.Users) && result.Users.length && this.models.TypeUser) {
      const typeIds = [
        ...new Set(
          result.Users.map((u) => u.OeuvreUser && u.OeuvreUser.id_type_user).filter(Boolean)
        )
      ];
      if (typeIds.length) {
        const typeRows = await this.models.TypeUser.findAll({
          where: { id_type_user: { [Op.in]: typeIds } },
          attributes: ['id_type_user', 'nom_type']
        });
        const typeMap = new Map(typeRows.map((t) => [t.id_type_user, t.get({ plain: true })]));
        for (const u of result.Users) {
          if (u.OeuvreUser && u.OeuvreUser.id_type_user) {
            u.OeuvreUser.TypeUser = typeMap.get(u.OeuvreUser.id_type_user) || null;
          }
        }
      }
    }

    // Attacher les intervenants
    result.OeuvreIntervenants = intervenants;

    // Sous-type spécifique + clés attendues par le front (Livre, Film, …)
    const subtype = await this._findSubtype(oeuvreId, result.id_type_oeuvre);
    if (subtype) {
      const plainSubtype = subtype.get ? subtype.get({ plain: true }) : subtype;
      result.subtype = plainSubtype;
      const key = this._subtypeAssociationKey(result.id_type_oeuvre);
      if (key) {
        result[key] = plainSubtype;
      }
      await this._attachGenreForSubtype(result, plainSubtype);
    }

    return result;
  }

  /**
   * Nom d'association Sequelize (hasOne) pour le sous-type
   * Utilise le registre centralisé (source de vérité unique)
   */
  _subtypeAssociationKey(typeId) {
    return subtypeRegistry.getAssociationKey(typeId);
  }

  /**
   * Remplit result.Genres (tableau) si id_genre présent sur le sous-type
   */
  async _attachGenreForSubtype(result, plainSubtype) {
    if (!plainSubtype || !plainSubtype.id_genre || !this.models.Genre) return;
    try {
      const genre = await this.models.Genre.findByPk(plainSubtype.id_genre, {
        attributes: ['id_genre', 'nom', 'description']
      });
      if (genre) {
        const g = genre.get ? genre.get({ plain: true }) : genre;
        result.Genres = [g];
        result.Genre = g;
      }
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * Charge le sous-type spécifique d'une œuvre (Livre, Film, etc.)
   * Utilise le registre centralisé (source de vérité unique)
   * @private
   */
  async _findSubtype(oeuvreId, typeId) {
    const modelName = subtypeRegistry.getModelName(typeId);
    if (!modelName || !this.models[modelName]) return null;
    try {
      return await this.models[modelName].findOne({ where: { id_oeuvre: oeuvreId } });
    } catch (_) {
      return null;
    }
  }

  /**
   * Incrémente le compteur de vues (bufferisé via Redis, flush toutes les 30s)
   */
  async incrementViews(oeuvreId) {
    const viewCounter = require('../utils/viewCounter');
    return viewCounter.increment('oeuvre', oeuvreId);
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

    const candidates = await this.model.findAll({
      where: {
        id_oeuvre: { [Op.ne]: oeuvreId },
        statut: 'publie',
        id_type_oeuvre: oeuvre.id_type_oeuvre
      },
      include: this.getDefaultIncludes(),
      order: [['nb_vues', 'DESC']],
      limit
    });

    return candidates;
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
        raw: true,
        limit: 50
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
