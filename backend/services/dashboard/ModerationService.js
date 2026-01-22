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

    const whereClause = { statut_validation: 'en_attente' };
    if (type_user) whereClause.type_user = type_user;

    const { rows: users, count } = await this.models.User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id_user', 'nom', 'prenom', 'email', 'type_user',
        'entreprise', 'date_creation', 'statut_validation'
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
   * Récupère les œuvres en attente de validation
   */
  async getPendingOeuvres(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    if (!this.models.Oeuvre) {
      return { oeuvres: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const { rows: oeuvres, count } = await this.models.Oeuvre.findAndCountAll({
      where: { statut: 'en_attente' },
      include: [{
        model: this.models.User,
        as: 'Createur',
        attributes: ['id_user', 'nom', 'prenom', 'email']
      }],
      order: [['date_creation', 'DESC']],
      limit,
      offset
    });

    return {
      oeuvres,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * File d'attente de modération complète
   */
  async getModerationQueue() {
    const [pendingUsers, pendingOeuvres, reportedContent] = await Promise.all([
      this.models.User.count({ where: { statut_validation: 'en_attente' } }),
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
   * Compte le contenu signalé
   */
  async getReportedContentCount() {
    if (!this.models.Signalement) return 0;
    return this.models.Signalement.count({
      where: { statut: 'en_attente' }
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
        statut_validation: 'valide',
        date_validation: new Date(),
        valide_par: moderatorId
      });
    } else if (action === 'reject') {
      await user.update({
        statut_validation: 'refuse',
        motif_refus: motif,
        date_validation: new Date(),
        valide_par: moderatorId
      });
    }

    return user;
  }

  /**
   * Valide une œuvre
   */
  async validateOeuvre(oeuvreId, data, moderatorId) {
    if (!this.models.Oeuvre) {
      throw new Error('Modèle Oeuvre non disponible');
    }

    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
    if (!oeuvre) {
      throw new Error('Œuvre non trouvée');
    }

    const { action, motif } = data;

    if (action === 'approve') {
      await oeuvre.update({
        statut: 'publie',
        date_validation: new Date(),
        valide_par: moderatorId
      });
    } else if (action === 'reject') {
      await oeuvre.update({
        statut: 'refuse',
        motif_refus: motif,
        date_validation: new Date(),
        valide_par: moderatorId
      });
    }

    return oeuvre;
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
      est_suspendu: true,
      date_suspension: new Date(),
      duree_suspension: duree,
      motif_suspension: motif,
      suspendu_par: moderatorId
    });

    return user;
  }

  /**
   * Action groupée sur plusieurs éléments
   */
  async bulkModerate(data, moderatorId) {
    const { type, ids, action, motif } = data;
    const results = { success: [], errors: [] };

    for (const id of ids) {
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
    }

    return results;
  }
}

module.exports = DashboardModerationService;
