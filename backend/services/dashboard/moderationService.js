/**
 * Service de modération pour le Dashboard
 * Gestion des validations et de la modération du contenu
 */
const { Op } = require('sequelize');

class DashboardModerationService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Récupère les utilisateurs en attente de validation
   */
  async getPendingUsers(options = {}) {
    const { page = 1, limit = 20, type_user } = options;
    const offset = (page - 1) * limit;

    const whereClause = { statut: 'en_attente_validation' };
    if (type_user) whereClause.type_user = type_user;

    const { rows: users, count } = await this.models.User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id_user', 'nom', 'prenom', 'email', 'type_user',
        'entreprise', 'date_creation', 'statut'
      ],
      order: [['date_creation', 'DESC']],
      limit,
      offset
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Récupère les œuvres en attente de validation (dashboard)
   * Inclut brouillons, auteur et premier media
   */
  async getPendingOeuvres({ page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const oeuvres = await this.models.Oeuvre.findAndCountAll({
      where: { statut: { [Op.in]: ['en_attente', 'brouillon'] } },
      include: [
        { model: this.models.User, as: 'Saiseur', attributes: ['id_user', 'nom', 'prenom', 'email'] },
        { model: this.models.Media, limit: 1, attributes: ['url', 'type_media'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_creation', 'DESC']]
    });

    const items = oeuvres.rows.map(oeuvre => ({
      id_oeuvre: oeuvre.id_oeuvre, titre: oeuvre.titre, description: oeuvre.description,
      statut: oeuvre.statut, id_type_oeuvre: oeuvre.id_type_oeuvre, type_oeuvre: oeuvre.id_type_oeuvre,
      date_creation: oeuvre.date_creation,
      auteur: oeuvre.Saiseur ? { id: oeuvre.Saiseur.id_user, nom: oeuvre.Saiseur.nom, prenom: oeuvre.Saiseur.prenom } : null,
      medias: oeuvre.Media || []
    }));

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pages = Math.ceil(oeuvres.count / parsedLimit);

    return {
      items,
      pagination: { total: oeuvres.count, page: parsedPage, pages, limit: parsedLimit, hasNext: parsedPage < pages, hasPrev: parsedPage > 1 }
    };
  }

  /**
   * File d'attente de modération complète (counts agrégés)
   */
  async getModerationQueue() {
    const [pendingUsers, pendingOeuvres, reportedContent] = await Promise.all([
      this.models.User.count({ where: { statut: 'en_attente_validation' } }),
      this.models.Oeuvre?.count({ where: { statut: 'en_attente' } }) || 0,
      this.getReportedContentCount()
    ]);

    return {
      pendingUsers,
      pendingOeuvres,
      reportedContent,
      total: pendingUsers + pendingOeuvres + reportedContent
    };
  }

  /**
   * File de modération des signalements paginée (dashboard)
   */
  async getSignalementsModerationQueue({ page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const signalements = await this.models.Signalement.findAndCountAll({
      where: { statut: 'en_attente' },
      include: [{ model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
    });

    const items = signalements.rows.map(s => ({
      id: s.id_signalement, type: s.type_entite, entity_id: s.id_entite,
      entity_title: s.titre || 'Non disponible', reason: s.motif,
      reported_by: s.Signalant ? { id: s.Signalant.id_user, nom: s.Signalant.nom } : null,
      date_signalement: s.date_signalement, status: s.statut
    }));

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pages = Math.ceil(signalements.count / parsedLimit);

    return {
      items,
      pagination: { total: signalements.count, page: parsedPage, pages, limit: parsedLimit, hasNext: parsedPage < pages, hasPrev: parsedPage > 1 }
    };
  }

  /**
   * Compte le contenu signalé
   */
  async getReportedContentCount() {
    if (!this.models.Signalement) return 0;
    return this.models.Signalement.count({
      where: { statut: 'en_attente' }
    });
  }

  /**
   * Liste complète du contenu signalé en attente (non paginé)
   */
  async getReportedContent() {
    return this.models.Signalement.findAll({
      where: { statut: 'en_attente' },
      include: [{ model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom', 'email'] }],
      order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
    });
  }

  /**
   * Valide un utilisateur
   */
  async validateUser(userId, data, moderatorId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const { action, motif } = data;

    if (action === 'approve') {
      await user.update({
        statut: 'actif',
        date_validation: new Date(),
        id_user_validate: moderatorId
      });
    } else if (action === 'reject') {
      await user.update({
        statut: 'rejete',
        raison_rejet: motif,
        date_validation: new Date(),
        id_user_validate: moderatorId
      });
    }

    return user;
  }

  /**
   * Valide ou rejette une œuvre (dashboard admin)
   * @param {number} oeuvreId
   * @param {Object} data - { valide, validateur_id, raison_rejet }
   * @returns {Object} { message, data }
   */
  async validateOeuvreAction(oeuvreId, data) {
    const { valide, validateur_id, raison_rejet } = data;
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
    if (!oeuvre) throw new Error('Œuvre non trouvée');
    await oeuvre.update({ statut: valide ? 'publie' : 'rejete', date_validation: new Date(), validateur_id, raison_rejet: !valide ? raison_rejet : null });
    return { message: valide ? 'Œuvre validée' : 'Œuvre rejetée', data: oeuvre };
  }

  /**
   * Modère un signalement
   */
  async moderateSignalement(signalementId, data, moderatorId) {
    if (!this.models.Signalement) {
      throw new Error('Modèle Signalement non disponible');
    }

    const signalement = await this.models.Signalement.findByPk(signalementId);
    if (!signalement) {
      throw new Error('Signalement non trouvé');
    }

    const { action, motif } = data;

    await signalement.update({
      statut: action === 'approve' ? 'traite' : 'rejete',
      decision: motif,
      traite_par: moderatorId,
      date_traitement: new Date()
    });

    return signalement;
  }

  /**
   * Suspendre un utilisateur
   */
  async suspendUser(userId, data, moderatorId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const { duree, motif } = data;

    await user.update({
      statut: 'suspendu'
    });

    return user;
  }

  /**
   * Action groupée sur plusieurs éléments
   */
  async bulkModerate(data, moderatorId) {
    const { type, ids, action, motif } = data;
    const results = { success: [], errors: [] };

    await Promise.all(ids.map(async (id) => {
      try {
        if (type === 'user') {
          await this.validateUser(id, { action, motif }, moderatorId);
        } else if (type === 'oeuvre') {
          await this.validateOeuvre(id, { action, motif }, moderatorId);
        } else if (type === 'signalement') {
          await this.moderateSignalement(id, { action, motif }, moderatorId);
        }
        results.success.push(id);
      } catch (error) {
        results.errors.push({ id, error: error.message });
      }
    }));

    return results;
  }
}

module.exports = DashboardModerationService;
