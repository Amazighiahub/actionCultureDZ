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
      const lieuInclude = {
        model: this.models.Lieu,
        as: 'Lieu',
        attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude'],
        required: false
      };
      if (this.models.Commune) {
        lieuInclude.include = [{
          model: this.models.Commune,
          attributes: ['id_commune', 'nom'],
          required: false,
          include: [{
            model: this.models.Daira,
            attributes: ['id_daira', 'nom'],
            required: false,
            include: [{
              model: this.models.Wilaya,
              attributes: ['id_wilaya', 'nom', 'code'],
              required: false
            }]
          }]
        }];
      }
      includes.push(lieuInclude);
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
   * Trouve les événements publiés avec pagination
   */
  async findPublished(options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, statut: { [Op.in]: ['publie', 'planifie', 'en_cours'] } },
      include: this._defaultIncludes(),
      order: [['date_debut', 'ASC']]
    });
  }

  /**
   * Trouve les événements à venir
   */
  async findUpcoming(options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        date_debut: { [Op.gte]: new Date() },
        statut: { [Op.in]: ['publie', 'planifie'] }
      },
      include: this._defaultIncludes(),
      order: [['date_debut', 'ASC']]
    });
  }

  /**
   * Trouve un événement avec tous ses détails
   */
  async findWithFullDetails(id) {
    const includes = this._defaultIncludes();

    if (this.models.Programme) {
      includes.push({
        model: this.models.Programme,
        as: 'Programmes',
        required: false,
        order: [['date', 'ASC'], ['heure_debut', 'ASC']]
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

    return this.model.findByPk(id, { include: includes });
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
    const include = this._defaultIncludes().map(inc => {
      if (inc.as === 'Lieu' && this.models.Commune) {
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
