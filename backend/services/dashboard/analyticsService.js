/**
 * Service d'analytics pour le Dashboard Admin
 */
const { Op, fn, col, literal } = require('sequelize');
const { subDays } = require('date-fns');

class DashboardAnalyticsService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  /**
   * Analytics avancés — format utilisé par le controller dashboard
   */
  async generateAdvancedAnalytics(period) {
    const startDate = subDays(new Date(), period);
    const [userStats, contentStats, engagementStats] = await Promise.all([
      this._getUserAnalytics(startDate),
      this._getContentAnalytics(startDate),
      this._getEngagementAnalytics(startDate)
    ]);
    return { period, startDate, userStats, contentStats, engagementStats };
  }

  /**
   * Analytics utilisateurs (total + new + active + retentionRate)
   */
  async _getUserAnalytics(startDate) {
    const totalUsers = await this.models.User.count();
    const newUsers = await this.models.User.count({ where: { date_creation: { [Op.gte]: startDate } } });
    const activeUsers = await this.models.User.count({ where: { derniere_connexion: { [Op.gte]: startDate } } });
    return { total: totalUsers, new: newUsers, active: activeUsers, retentionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0 };
  }

  /**
   * Analytics contenu (oeuvres + evenements + commentaires)
   */
  async _getContentAnalytics(startDate) {
    const [oeuvres, evenements, commentaires] = await Promise.all([
      this.models.Oeuvre.count({ where: { date_creation: { [Op.gte]: startDate } } }),
      this.models.Evenement.count({ where: { date_creation: { [Op.gte]: startDate } } }),
      this.models.Commentaire?.count({ where: { date_creation: { [Op.gte]: startDate } } }) || 0
    ]);
    return { oeuvres, evenements, commentaires, total: oeuvres + evenements + commentaires };
  }

  /**
   * Analytics engagement (vues + favoris + participations)
   */
  async _getEngagementAnalytics(startDate) {
    const [vues, favoris, participations] = await Promise.all([
      this.models.Vue?.count({ where: { date_vue: { [Op.gte]: startDate } } }) || 0,
      this.models.Favori?.count({ where: { date_ajout: { [Op.gte]: startDate } } }) || 0,
      this.models.EvenementUser?.count({ where: { date_inscription: { [Op.gte]: startDate } } }) || 0
    ]);
    return { vues, favoris, participations };
  }

  /**
   * Analytics géographiques
   */
  async getGeographicAnalytics() {
    const stats = { byWilaya: [], byCommune: [] };

    if (this.models.User) {
      try {
        const byWilaya = await this.models.User.findAll({
          attributes: [
            'wilaya',
            [fn('COUNT', col('id_user')), 'count']
          ],
          where: { wilaya: { [Op.not]: null } },
          group: ['wilaya'],
          order: [[literal('count'), 'DESC']],
          limit: 10,
          raw: true
        });
        stats.byWilaya = byWilaya;
      } catch (error) {
        // Champ wilaya peut ne pas exister
      }
    }

    return stats;
  }

  /**
   * Logs d'audit paginés
   */
  async getAuditLogs({ page = 1, limit = 50, userId, action } = {}) {
    const offset = (page - 1) * limit;
    const where = {};
    if (userId) where.id_admin = userId;
    if (action) where.action = action;

    const logs = await this.models.AuditLog.findAndCountAll({
      where,
      include: [{ model: this.models.User, as: 'Admin', attributes: ['nom', 'prenom', 'email'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_action', 'DESC']]
    });

    return {
      logs: logs.rows,
      pagination: { total: logs.count, page: parseInt(page), pages: Math.ceil(logs.count / limit), limit: parseInt(limit) }
    };
  }

  /**
   * Génère un rapport d'activité complet
   */
  async generateReport(startDate, endDate) {
    const [users, content, engagement] = await Promise.all([
      this._getUserReportData(startDate, endDate),
      this._getContentReportData(startDate, endDate),
      this._getEngagementReportData(startDate, endDate)
    ]);
    return { period: { start: startDate.toISOString(), end: endDate.toISOString() }, users, content, engagement };
  }

  async _getUserReportData(startDate, endDate) {
    const where = { date_creation: { [Op.between]: [startDate, endDate] } };
    const [total, byType, active] = await Promise.all([
      this.models.User.count({ where }),
      this.models.User.findAll({ where, attributes: ['id_type_user', [fn('COUNT', '*'), 'count']], group: ['id_type_user'], raw: true }),
      this.models.User.count({ where: { derniere_connexion: { [Op.between]: [startDate, endDate] } } })
    ]);
    return { total, byType, active };
  }

  async _getContentReportData(startDate, endDate) {
    const where = { date_creation: { [Op.between]: [startDate, endDate] } };
    const [oeuvres, evenements, commentaires] = await Promise.all([
      this.models.Oeuvre.count({ where: { ...where, statut: 'publie' } }),
      this.models.Evenement.count({ where }),
      this.models.Commentaire?.count({ where: { ...where, statut: 'publie' } }) || 0
    ]);
    return { oeuvres, evenements, commentaires };
  }

  async _getEngagementReportData(startDate, endDate) {
    const [favoris, participations, vues] = await Promise.all([
      this.models.Favori?.count({ where: { date_ajout: { [Op.between]: [startDate, endDate] } } }) || 0,
      this.models.EvenementUser?.count({ where: { date_inscription: { [Op.between]: [startDate, endDate] } } }) || 0,
      this.models.Vue?.count({ where: { date_vue: { [Op.between]: [startDate, endDate] } } }) || 0
    ]);
    return { favoris, participations, vues };
  }

  /**
   * Alertes système
   */
  async getSystemAlerts() {
    const alerts = [];

    // Utilisateurs en attente depuis longtemps
    const pendingUsersCount = await this.models.User.count({
      where: {
        statut: 'en_attente_validation',
        date_creation: {
          [Op.lt]: subDays(new Date(), 7)
        }
      }
    });

    if (pendingUsersCount > 0) {
      alerts.push({
        type: 'warning',
        category: 'users',
        message: `${pendingUsersCount} utilisateurs en attente depuis plus de 7 jours`,
        count: pendingUsersCount
      });
    }

    // Œuvres en attente
    if (this.models.Oeuvre) {
      const pendingOeuvres = await this.models.Oeuvre.count({
        where: { statut: 'en_attente' }
      });

      if (pendingOeuvres > 10) {
        alerts.push({
          type: 'info',
          category: 'content',
          message: `${pendingOeuvres} œuvres en attente de validation`,
          count: pendingOeuvres
        });
      }
    }

    // Signalements non traités
    if (this.models.Signalement) {
      const pendingSignalements = await this.models.Signalement.count({
        where: { statut: 'en_attente' }
      });

      if (pendingSignalements > 0) {
        alerts.push({
          type: 'error',
          category: 'moderation',
          message: `${pendingSignalements} signalements non traités`,
          count: pendingSignalements
        });
      }
    }

    return alerts;
  }
}

module.exports = DashboardAnalyticsService;
