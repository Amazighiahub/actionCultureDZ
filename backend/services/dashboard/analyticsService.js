/**
 * Service d'analytics pour le Dashboard Admin
 */
const { Op, fn, col, literal } = require('sequelize');
const { subDays } = require('date-fns');
const { bornerPagination, decalage, construirePagination } = require('../../utils/pagination');

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
      this.models.EvenementUser?.count({ where: { date_inscription: { [Op.gte]: startDate }, statut_participation: { [Op.ne]: 'invitation' } } }) || 0
    ]);
    return { vues, favoris, participations };
  }

  /**
   * Logs d'audit paginés
   */
  async getAuditLogs({ page: pageDemandee, limit: limiteDemandee, userId, action, startDate, endDate } = {}) {
    // 50 par défaut ; la route refuse déjà plus de 100 (validatePagination)
    const { page, limit } = bornerPagination(pageDemandee, limiteDemandee, 50);
    const where = {};
    if (userId) where.id_admin = userId;
    if (action) where.action = action;
    // Période (dates ISO déjà vérifiées par la route) : avant, acceptée mais jamais appliquée
    const debut = startDate ? new Date(startDate) : null;
    const fin = endDate ? new Date(endDate) : null;
    if ((debut && !Number.isNaN(debut.getTime())) || (fin && !Number.isNaN(fin.getTime()))) {
      where.date_action = {
        ...(debut && !Number.isNaN(debut.getTime()) ? { [Op.gte]: debut } : {}),
        ...(fin && !Number.isNaN(fin.getTime()) ? { [Op.lte]: fin } : {}),
      };
    }

    const logs = await this.models.AuditLog.findAndCountAll({
      where,
      include: [{ model: this.models.User, as: 'Admin', attributes: ['nom', 'prenom', 'email'] }],
      limit,
      offset: decalage(page, limit),
      order: [['date_action', 'DESC']]
    });

    return {
      logs: logs.rows,
      pagination: construirePagination(logs.count, page, limit)
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
      this.models.EvenementUser?.count({ where: { date_inscription: { [Op.between]: [startDate, endDate] }, statut_participation: { [Op.ne]: 'invitation' } } }) || 0,
      this.models.Vue?.count({ where: { date_vue: { [Op.between]: [startDate, endDate] } } }) || 0
    ]);
    return { favoris, participations, vues };
  }

}

module.exports = DashboardAnalyticsService;
