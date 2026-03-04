/**
 * ParcoursRepository - Accès données pour les parcours intelligents
 * Extends BaseRepository avec des méthodes spécifiques aux parcours
 */

const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class ParcoursRepository extends BaseRepository {
  constructor(models) {
    super(models.Parcours);
    this.models = models;
  }

  /**
   * Inclusions standard pour les parcours
   */
  _defaultIncludes() {
    const includes = [];

    if (this.models.User) {
      includes.push({
        model: this.models.User,
        as: 'Createur',
        attributes: ['id_user', 'nom', 'prenom', 'photo_url'],
        required: false
      });
    }

    return includes;
  }

  /**
   * Inclusions avec étapes (lieux ordonnés)
   */
  _includesWithEtapes() {
    const includes = this._defaultIncludes();

    if (this.models.ParcoursLieu) {
      const etapeInclude = {
        model: this.models.ParcoursLieu,
        as: 'Etapes',
        required: false,
        order: [['ordre', 'ASC']]
      };

      if (this.models.Lieu) {
        const lieuInc = {
          model: this.models.Lieu,
          attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typePatrimoine'],
          required: false
        };
        if (this.models.LieuMedia) {
          lieuInc.include = [{ model: this.models.LieuMedia, required: false }];
        }
        etapeInclude.include = [lieuInc];
      }

      if (this.models.Evenement) {
        if (!etapeInclude.include) etapeInclude.include = [];
        etapeInclude.include.push({
          model: this.models.Evenement,
          attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin'],
          required: false
        });
      }

      includes.push(etapeInclude);
    }

    return includes;
  }

  /**
   * Parcours actifs avec pagination
   */
  async findActive(options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, statut: 'actif' },
      include: this._includesWithEtapes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Détail complet d'un parcours avec toutes les étapes
   */
  async findWithFullDetails(id) {
    return this.model.findByPk(id, {
      include: this._includesWithEtapes()
    });
  }

  /**
   * Parcours par créateur
   */
  async findByCreateur(userId, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, id_createur: userId },
      include: this._includesWithEtapes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Recherche multilingue
   */
  async searchParcours(query, options = {}) {
    return this.search(query, ['nom_parcours', 'description'], {
      ...options,
      include: this._includesWithEtapes()
    });
  }

  /**
   * Par thème
   */
  async findByTheme(theme, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, theme, statut: 'actif' },
      include: this._includesWithEtapes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Par difficulté
   */
  async findByDifficulte(difficulte, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, difficulte, statut: 'actif' },
      include: this._includesWithEtapes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Ajouter une étape à un parcours
   */
  async addEtape(parcoursId, etapeData) {
    if (!this.models.ParcoursLieu) {
      throw new Error('Model ParcoursLieu not available');
    }

    // Déterminer l'ordre (dernier + 1)
    const lastEtape = await this.models.ParcoursLieu.findOne({
      where: { id_parcours: parcoursId },
      order: [['ordre', 'DESC']]
    });
    const nextOrdre = lastEtape ? lastEtape.ordre + 1 : 1;

    return this.models.ParcoursLieu.create({
      id_parcours: parcoursId,
      id_lieu: etapeData.id_lieu || etapeData.lieuId,
      id_evenement: etapeData.id_evenement || etapeData.evenementId || null,
      ordre: etapeData.ordre || nextOrdre,
      duree_estimee: etapeData.duree_estimee || etapeData.dureeEstimee || null,
      distance_precedent: etapeData.distance_precedent || etapeData.distancePrecedent || null,
      temps_trajet: etapeData.temps_trajet || etapeData.tempsTrajet || null,
      notes: etapeData.notes || null,
      transport_mode: etapeData.transport_mode || etapeData.transportMode || 'voiture'
    });
  }

  /**
   * Supprimer une étape
   */
  async removeEtape(parcoursId, etapeId) {
    if (!this.models.ParcoursLieu) return false;

    const result = await this.models.ParcoursLieu.destroy({
      where: { id_parcours_lieu: etapeId, id_parcours: parcoursId }
    });

    // Réordonner les étapes restantes
    if (result > 0 && this.models.ParcoursLieu.reorderParcours) {
      await this.models.ParcoursLieu.reorderParcours(parcoursId);
    }

    return result > 0;
  }

  /**
   * Réordonner les étapes
   */
  async reorderEtapes(parcoursId, orderedEtapeIds) {
    if (!this.models.ParcoursLieu) return false;

    const transaction = await this.model.sequelize.transaction();
    try {
      for (let i = 0; i < orderedEtapeIds.length; i++) {
        await this.models.ParcoursLieu.update(
          { ordre: i + 1 },
          { where: { id_parcours_lieu: orderedEtapeIds[i], id_parcours: parcoursId }, transaction }
        );
      }
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Compter les étapes d'un parcours
   */
  async countEtapes(parcoursId) {
    if (!this.models.ParcoursLieu) return 0;
    return this.models.ParcoursLieu.count({ where: { id_parcours: parcoursId } });
  }

  /**
   * Statistiques
   */
  async getStats() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, thisMonthCount, byDifficulte, byTheme] = await Promise.all([
      this.count(),
      this.count({ statut: 'actif' }),
      this.count({ date_creation: { [Op.gte]: thisMonth } }),
      this.model.findAll({
        attributes: [
          'difficulte',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_parcours')), 'count']
        ],
        group: ['difficulte'],
        raw: true
      }),
      this.model.findAll({
        attributes: [
          'theme',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_parcours')), 'count']
        ],
        where: { theme: { [Op.not]: null } },
        group: ['theme'],
        raw: true
      })
    ]);

    return { total, active, thisMonth: thisMonthCount, byDifficulte, byTheme };
  }
}

module.exports = ParcoursRepository;
