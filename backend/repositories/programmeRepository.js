/**
 * ProgrammeRepository - Repository pour les programmes d'événements
 * Encapsule tous les accès Sequelize pour le modèle Programme
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class ProgrammeRepository extends BaseRepository {
  constructor(models) {
    super(models.Programme);
    this.models = models;
    this.sequelize = models.sequelize || models.Programme.sequelize;
  }

  /**
   * Includes par défaut pour un programme
   */
  _defaultIncludes() {
    const includes = [];
    if (this.models.Lieu) {
      includes.push({
        model: this.models.Lieu, as: 'Lieu',
        attributes: ['nom', 'adresse', 'latitude', 'longitude']
      });
    }
    if (this.models.Intervenant && this.models.ProgrammeIntervenant) {
      includes.push({
        model: this.models.Intervenant,
        through: {
          model: this.models.ProgrammeIntervenant,
          attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 'ordre_intervention', 'duree_intervention']
        },
        attributes: ['id_intervenant', 'nom', 'prenom', 'email', 'telephone', 'photo_url', 'biographie', 'specialites', 'id_user'],
        as: 'Intervenants',
        include: [{
          model: this.models.User,
          as: 'UserAccount',
          attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'email'],
          required: false
        }]
      });
    }
    return includes;
  }

  /**
   * Programmes d'un événement, triés, avec filtres optionnels
   */
  async findByEvenement(evenementId, { date, type_activite } = {}) {
    const where = { id_evenement: evenementId };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.heure_debut = { [Op.gte]: startDate, [Op.lt]: endDate };
    }
    if (type_activite) where.type_activite = type_activite;

    return this.model.findAll({
      where,
      include: this._defaultIncludes(),
      order: [['ordre', 'ASC'], ['heure_debut', 'ASC']]
    });
  }

  /**
   * Crée un programme avec ses intervenants dans une transaction
   */
  async createWithIntervenants(data, intervenants = [], transaction) {
    const programme = await this.model.create(data, { transaction });

    if (intervenants.length > 0 && this.models.ProgrammeIntervenant) {
      for (const interv of intervenants) {
        await this.models.ProgrammeIntervenant.create({
          id_programme: programme.id_programme,
          ...interv
        }, { transaction });
      }
    }

    return programme;
  }

  /**
   * Trouve le prochain ordre disponible pour un événement
   */
  async getNextOrdre(evenementId) {
    const maxOrdre = await this.model.max('ordre', {
      where: { id_evenement: evenementId }
    });
    return (maxOrdre || 0) + 1;
  }

  /**
   * Réordonne les programmes d'un événement
   */
  async reorder(evenementId, orderedIds, transaction) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.model.update(
        { ordre: i + 1 },
        { where: { id_programme: orderedIds[i], id_evenement: evenementId }, transaction }
      );
    }
  }
}

module.exports = ProgrammeRepository;
