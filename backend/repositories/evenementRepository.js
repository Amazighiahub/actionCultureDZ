/**
 * EvenementRepository - Accès données pour les événements
 * Extends BaseRepository avec des méthodes spécifiques aux événements
 */

const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class EvenementRepository extends BaseRepository {
  constructor(models) {
    super(models.Evenement);
    this.models = models;
  }

  /**
   * Inclusions standard pour les requêtes événements
   */
  /**
   * Includes légers pour les listes (pas de deep join Commune→Daira→Wilaya)
   */
  _defaultIncludes() {
    const includes = [];

    if (this.models.TypeEvenement) {
      includes.push({
        model: this.models.TypeEvenement,
        as: 'TypeEvenement',
        attributes: ['id_type_evenement', 'nom_type']
      });
    }

    if (this.models.Lieu) {
      includes.push({
        model: this.models.Lieu,
        as: 'Lieu',
        attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude'],
        required: false
      });
    }

    if (this.models.User) {
      includes.push({
        model: this.models.User,
        as: 'Organisateur',
        attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url']
      });
    }

    return includes;
  }

  /**
   * Includes complets pour le détail (1 seul record → deep join acceptable)
   */
  _detailIncludes() {
    const includes = this._defaultIncludes();

    // Enrichir Lieu avec la hiérarchie administrative complète
    const lieuIdx = includes.findIndex(i => i.as === 'Lieu');
    if (lieuIdx !== -1 && this.models.Commune) {
      includes[lieuIdx] = {
        ...includes[lieuIdx],
        include: [{
          model: this.models.Commune,
          attributes: ['id_commune', 'nom'],
          required: false,
          include: [{
            model: this.models.Daira,
            attributes: ['id_daira', 'nom'],
            required: false,
            include: this.models.Wilaya ? [{
              model: this.models.Wilaya,
              attributes: ['id_wilaya', 'nom', 'code'],
              required: false
            }] : []
          }]
        }]
      };
    }

    return includes;
  }

  /**
   * Trouve les événements publiés avec pagination
   */
  async findPublished(options = {}) {
    const { page = 1, limit = 20 } = options;
    const p = parseInt(page);
    const l = parseInt(limit);
    const where = { ...options.where, statut: { [Op.in]: ['publie', 'planifie', 'en_cours'] } };

    const [total, rows] = await Promise.all([
      this.model.count({ where }),
      this.model.findAll({
        where,
        include: this._defaultIncludes(),
        order: [['date_debut', 'ASC']],
        limit: l,
        offset: (p - 1) * l,
        subQuery: false
      })
    ]);

    return {
      data: rows,
      pagination: {
        page: p, limit: l, total,
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    };
  }

  /**
   * Trouve les événements à venir
   */
  async findUpcoming(options = {}) {
    const { page = 1, limit = 20 } = options;
    const p = parseInt(page);
    const l = parseInt(limit);
    const where = {
      ...options.where,
      date_debut: { [Op.gte]: new Date() },
      statut: { [Op.in]: ['publie', 'planifie'] }
    };

    const [total, rows] = await Promise.all([
      this.model.count({ where }),
      this.model.findAll({
        where,
        include: this._defaultIncludes(),
        order: [['date_debut', 'ASC']],
        limit: l,
        offset: (p - 1) * l,
        subQuery: false
      })
    ]);

    return {
      data: rows,
      pagination: {
        page: p, limit: l, total,
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    };
  }

  /**
   * Trouve un événement avec tous ses détails
   */
  async findWithFullDetails(id) {
    // Use default includes (lightweight) + Programme, Media, Organisation
    const includes = this._defaultIncludes();

    if (this.models.Programme) {
      includes.push({
        model: this.models.Programme,
        as: 'Programmes',
        required: false,
        include: this.models.Lieu ? [{
          model: this.models.Lieu,
          as: 'Lieu',
          attributes: ['nom', 'adresse', 'latitude', 'longitude'],
          required: false
        }] : []
      });
    }

    if (this.models.Media) {
      includes.push({
        model: this.models.Media,
        as: 'Medias',
        required: false
      });
    }

    if (this.models.Organisation) {
      includes.push({
        model: this.models.Organisation,
        through: { attributes: [] },
        as: 'Organisations',
        required: false
      });
    }

    return this.model.findByPk(id, {
      include: includes,
      order: [
        [{ model: this.models.Programme, as: 'Programmes' }, 'date_programme', 'ASC'],
        [{ model: this.models.Programme, as: 'Programmes' }, 'heure_debut', 'ASC']
      ]
    });
  }

  /**
   * Trouve les événements par organisateur
   */
  async findByOrganisateur(userId, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, id_user: userId },
      include: this._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Trouve les événements associés à une œuvre
   */
  async findByOeuvre(oeuvreId) {
    return this.model.findAll({
      include: [
        ...this._defaultIncludes(),
        {
          model: this.models.Oeuvre,
          as: 'Oeuvres',
          where: { id_oeuvre: oeuvreId },
          through: { attributes: [] },
          required: true
        }
      ],
      order: [['date_debut', 'ASC']],
      limit: 50
    });
  }

  /**
   * Recherche événements (multilingue)
   */
  async searchEvenements(query, options = {}) {
    return this.search(query, ['nom_evenement', 'description'], {
      ...options,
      include: this._defaultIncludes()
    });
  }

  /**
   * Trouve par wilaya
   */
  async findByWilaya(wilayaId, options = {}) {
    const include = this._detailIncludes().map(inc => {
      if (inc.as === 'Lieu') {
        return {
          ...inc,
          required: true,
          include: [{
            model: this.models.Commune,
            required: true,
            include: [{
              model: this.models.Daira,
              required: true,
              include: [{
                model: this.models.Wilaya,
                where: { id_wilaya: wilayaId },
                required: true
              }]
            }]
          }]
        };
      }
      return inc;
    });

    return this.findAll({
      ...options,
      where: { ...options.where, statut: { [Op.in]: ['publie', 'planifie', 'en_cours'] } },
      include
    });
  }

  /**
   * Inscrit un utilisateur à un événement
   */
  async registerParticipant(evenementId, userId, options = {}) {
    if (!this.models.EvenementUser) {
      throw new Error('Model EvenementUser not available');
    }

    const { transaction, ...data } = options;
    const queryOpts = transaction ? { transaction } : {};

    const existing = await this.models.EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId },
      ...queryOpts
    });

    if (existing) {
      return existing.update({ statut_participation: 'confirme', ...data }, queryOpts);
    }

    return this.models.EvenementUser.create({
      id_evenement: evenementId,
      id_user: userId,
      statut_participation: 'confirme',
      date_inscription: new Date(),
      ...data
    }, queryOpts);
  }

  /**
   * Désinscrit un utilisateur
   */
  async unregisterParticipant(evenementId, userId) {
    if (!this.models.EvenementUser) return false;

    const result = await this.models.EvenementUser.destroy({
      where: { id_evenement: evenementId, id_user: userId }
    });
    return result > 0;
  }

  /**
   * Compte les participants d'un événement
   */
  async countParticipants(evenementId, options = {}) {
    if (!this.models.EvenementUser) return 0;

    return this.models.EvenementUser.count({
      where: {
        id_evenement: evenementId,
        statut_participation: { [Op.in]: ['confirme', 'present'] }
      },
      ...options
    });
  }

  // ============================================================================
  // PARTICIPANTS
  // ============================================================================

  /**
   * Liste publique des participants confirmés (données limitées, pas d'email)
   */
  async getPublicParticipants(evenementId) {
    return this.models.EvenementUser.findAll({
      where: {
        id_evenement: evenementId,
        statut_participation: { [Op.in]: ['confirme', 'present'] }
      },
      attributes: ['role_participation', 'date_inscription'],
      include: [{
        model: this.models.User,
        as: 'User',
        attributes: ['id_user', 'nom', 'prenom', 'photo_url']
      }],
      order: [['date_inscription', 'ASC']]
    });
  }

  /**
   * Récupère les participants d'un événement avec profil utilisateur
   */
  async getParticipants(evenementId) {
    return this.models.EvenementUser.findAll({
      where: { id_evenement: evenementId },
      include: [{
        model: this.models.User,
        as: 'User',
        attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url', 'id_type_user']
      }],
      order: [['date_inscription', 'DESC']]
    });
  }

  /**
   * Récupère l'inscription d'un utilisateur à un événement
   */
  async getRegistration(evenementId, userId) {
    return this.models.EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId }
    });
  }

  /**
   * Valide ou refuse la participation d'un utilisateur
   */
  async updateParticipationStatus(evenementId, userId, data) {
    const participation = await this.models.EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId }
    });
    if (!participation) return null;
    await participation.update(data);
    return participation;
  }

  /**
   * Récupère les professionnels en attente pour un événement
   */
  async getPendingProfessionals(evenementId, limit = 50) {
    return this.models.EvenementUser.findAll({
      where: {
        id_evenement: evenementId,
        statut_participation: 'en_attente'
      },
      include: [{
        model: this.models.User,
        as: 'User',
        attributes: { exclude: ['password'] },
        include: [
          { model: this.models.TypeUser, required: false }
        ]
      }],
      order: [['date_inscription', 'ASC']],
      limit
    });
  }

  /**
   * Récupère le profil complet d'un participant
   */
  async getParticipantProfile(userId) {
    return this.models.User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: this.models.TypeUser, required: false },
        { model: this.models.Wilaya, required: false },
        {
          model: this.models.Oeuvre,
          as: 'OeuvresSaisies',
          where: { statut: 'publie' },
          required: false,
          limit: 10
        }
      ]
    });
  }

  // ============================================================================
  // OEUVRES D'UN ÉVÉNEMENT
  // ============================================================================

  /**
   * Récupère les oeuvres ajoutées + disponibles pour un user dans un événement
   */
  async getOeuvresForUser(evenementId, userId) {
    const [oeuvresAjoutees, toutesOeuvres] = await Promise.all([
      this.models.EvenementOeuvre.findAll({
        where: { id_evenement: evenementId },
        include: [{
          model: this.models.Oeuvre,
          as: 'Oeuvre',
          where: { saisi_par: userId },
          required: true
        }],
        order: [['ordre_presentation', 'ASC']]
      }),
      this.models.Oeuvre.findAll({
        where: { saisi_par: userId, statut: 'publie' },
        attributes: ['id_oeuvre', 'titre', 'statut', 'id_type_oeuvre']
      })
    ]);
    return { oeuvresAjoutees, toutesOeuvres };
  }

  /**
   * Vérifie qu'une oeuvre appartient à un utilisateur
   */
  async findOeuvreByOwner(oeuvreId, userId) {
    return this.models.Oeuvre.findOne({
      where: { id_oeuvre: oeuvreId, saisi_par: userId }
    });
  }

  /**
   * Vérifie si une oeuvre est déjà associée à un événement
   */
  async findEvenementOeuvre(evenementId, oeuvreId) {
    return this.models.EvenementOeuvre.findOne({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId }
    });
  }

  /**
   * Ajoute une oeuvre à un événement
   */
  async addOeuvreToEvent(data) {
    const maxOrdre = await this.models.EvenementOeuvre.max('ordre_presentation', {
      where: { id_evenement: data.id_evenement }
    });

    const association = await this.models.EvenementOeuvre.create({
      ...data,
      ordre_presentation: (maxOrdre || 0) + 1
    });

    return this.models.EvenementOeuvre.findByPk(association.id_EventOeuvre, {
      include: [{ model: this.models.Oeuvre, as: 'Oeuvre', required: false }]
    });
  }

  /**
   * Met à jour une association oeuvre-événement
   */
  async updateOeuvreInEvent(evenementId, oeuvreId, userId, updates) {
    const association = await this.models.EvenementOeuvre.findOne({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId, id_presentateur: userId }
    });
    if (!association) return null;

    await association.update(updates);

    return this.models.EvenementOeuvre.findOne({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId },
      include: [{ model: this.models.Oeuvre, as: 'Oeuvre', required: false }]
    });
  }

  /**
   * Réordonne les oeuvres d'un événement (dans une transaction)
   */
  async reorderOeuvres(evenementId, userId, oeuvres) {
    if (!oeuvres || oeuvres.length === 0) return;

    // Valider toutes les données d'abord
    const parsed = oeuvres.map(item => {
      const idOeuvre = parseInt(item.id_oeuvre);
      const ordre = parseInt(item.ordre ?? item.ordre_presentation);
      if (!Number.isInteger(idOeuvre) || !Number.isInteger(ordre)) {
        throw new Error('Données de réorganisation invalides');
      }
      return { idOeuvre, ordre };
    });

    // 1 seul UPDATE avec CASE WHEN au lieu de N UPDATEs séquentiels
    const cases = parsed.map(p => `WHEN ${p.idOeuvre} THEN ${p.ordre}`).join(' ');
    const ids = parsed.map(p => p.idOeuvre).join(',');

    const tableName = this.models.EvenementOeuvre.tableName || 'evenement_oeuvre';

    const [results] = await this.model.sequelize.query(
      `UPDATE \`${tableName}\`
       SET ordre_presentation = CASE id_oeuvre ${cases} END
       WHERE id_evenement = ? AND id_presentateur = ? AND id_oeuvre IN (${ids})`,
      {
        replacements: [evenementId, userId],
        type: 'UPDATE'
      }
    );

    return results;
  }

  /**
   * Récupère les oeuvres ordonnées d'un user pour un événement
   */
  async getOeuvresOrdered(evenementId, userId) {
    return this.models.EvenementOeuvre.findAll({
      where: { id_evenement: evenementId, id_presentateur: userId },
      include: [{ model: this.models.Oeuvre, as: 'Oeuvre', required: false }],
      order: [['ordre_presentation', 'ASC']]
    });
  }

  /**
   * Supprime une oeuvre d'un événement
   */
  async removeOeuvreFromEvent(evenementId, oeuvreId, userId) {
    return this.models.EvenementOeuvre.destroy({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId, id_presentateur: userId }
    });
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Trouve les événements en attente de validation (admin)
   */
  async findPending(options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, statut: 'brouillon' },
      include: this._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Statistiques événements
   */
  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, upcoming, ongoing, thisMonthCount, byType] = await Promise.all([
      this.count(),
      this.count({ date_debut: { [Op.gt]: now }, statut: { [Op.in]: ['publie', 'planifie'] } }),
      this.count({ statut: 'en_cours' }),
      this.count({ date_creation: { [Op.gte]: thisMonth } }),
      this.models.TypeEvenement ? this.model.findAll({
        attributes: [
          'id_type_evenement',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_evenement')), 'count']
        ],
        include: [{ model: this.models.TypeEvenement, as: 'TypeEvenement', attributes: ['nom_type'] }],
        group: ['id_type_evenement', 'TypeEvenement.id_type_evenement'],
        raw: false,
        limit: 50
      }) : []
    ]);

    return { total, upcoming, ongoing, thisMonth: thisMonthCount, byType };
  }
}

module.exports = EvenementRepository;
