// controllers/dashboard/analyticsMethods.js
// Analytics, stats, and reporting methods for DashboardController

const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

/**
 * Methods mixed into DashboardController.prototype.
 * `this` refers to the DashboardController instance at runtime.
 */
const analyticsMethods = {

  async getOverview(req, res) {
    try {
      const stats = await this.getCachedData(
        'dashboard:overview',
        () => this.generateOverviewStats(),
        300
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getOverview:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError'), message: error.message });
    }
  },

  async generateOverviewStats() {
    const [
      totalUsers, totalOeuvres, totalEvenements, totalArtisanats,
      newUsersToday, oeuvresEnAttente, professionnelsEnAttente,
      signalementsEnAttente, sitesPatrimoniaux, vuesAujourdhui
    ] = await Promise.all([
      this.models.User.count(),
      this.models.Oeuvre.count({ where: { statut: 'publie' } }),
      this.models.Evenement.count(),
      this.models.Artisanat?.count() || 0,
      this.models.User.count({
        where: { date_creation: { [Op.gte]: moment().startOf('day').toDate() } }
      }),
      this.models.Oeuvre.count({ where: { statut: 'en_attente' } }),
      this.models.User.count({
        where: {
          id_type_user: { [Op.ne]: 1 },
          statut: 'en_attente_validation'
        }
      }),
      this.models.Signalement?.count({ where: { statut: 'en_attente' } }) || 0,
      this.models.Lieu?.count() || 0,
      this.models.Vue?.count({
        where: { date_vue: { [Op.gte]: moment().startOf('day').toDate() } }
      }) || 0
    ]);

    return {
      users: { total: totalUsers, newToday: newUsersToday, professionnelsEnAttente },
      content: { oeuvres: totalOeuvres, evenements: totalEvenements, artisanats: totalArtisanats, enAttente: oeuvresEnAttente },
      moderation: { signalementsEnAttente },
      patrimoine: { sites: sitesPatrimoniaux },
      engagement: { vuesAujourdhui }
    };
  },

  async getDetailedStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      const stats = await this.getCachedData(
        `dashboard:stats:${period}`,
        () => this.generateDetailedStats(period),
        600
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getDetailedStats:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generateDetailedStats(period) {
    const dateLimit = this.getDateLimit(period);
    const [userGrowth, contentByType, recentActivity, topContributors] = await Promise.all([
      this.getUserGrowth(dateLimit),
      this.getContentByType(),
      this.getRecentActivity(),
      this.getTopContributors()
    ]);
    return { period, dateLimit, userGrowth, contentByType, recentActivity, topContributors };
  },

  async getPatrimoineDashboard(req, res) {
    try {
      const stats = await this.getCachedData(
        'dashboard:patrimoine',
        () => this.generatePatrimoineStats(),
        600
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getPatrimoineDashboard:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generatePatrimoineStats() {
    const [totalSites, totalParcours, evolution, popularSites, activeParcoursCount] = await Promise.all([
      this.models.Lieu?.count() || 0,
      this.models.Parcours?.count() || 0,
      this.getPatrimoineEvolution(),
      this.getPopularPatrimoineSites(),
      this.getActiveParcoursCount()
    ]);
    return { totalSites, totalParcours, activeParcoursCount, evolution, popularSites };
  },

  async getQRStats(req, res) {
    try {
      const { period = 30 } = req.query;
      const startDate = moment().subtract(period, 'days').toDate();
      const stats = await this.getCachedData(
        `dashboard:qr:${period}`,
        () => this.generateQRStats(startDate),
        900
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getQRStats:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generateQRStats(startDate) {
    if (!this.models.QRScan) {
      return { totalScans: 0, uniqueVisitors: 0, peakHours: [], topSites: [] };
    }
    const [totalScans, peakHours] = await Promise.all([
      this.models.QRScan.count({ where: { scan_date: { [Op.gte]: startDate } } }),
      this.getQRScanPeakHours(startDate)
    ]);
    return { totalScans, peakHours };
  },

  async getAdvancedAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const analytics = await this.getCachedData(
        `dashboard:analytics:${period}`,
        () => this.generateAdvancedAnalytics(period),
        3600
      );
      res.json({ success: true, data: analytics });
    } catch (error) {
      console.error('Erreur getAdvancedAnalytics:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generateAdvancedAnalytics(period) {
    const startDate = moment().subtract(period, 'days').toDate();
    const [userStats, contentStats, engagementStats] = await Promise.all([
      this.getUserAnalytics(startDate),
      this.getContentAnalytics(startDate),
      this.getEngagementAnalytics(startDate)
    ]);
    return { period, startDate, userStats, contentStats, engagementStats };
  },

  async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 50, userId, action } = req.query;
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

      res.json({
        success: true,
        data: {
          logs: logs.rows,
          pagination: { total: logs.count, page: parseInt(page), pages: Math.ceil(logs.count / limit), limit: parseInt(limit) }
        }
      });
    } catch (error) {
      console.error('Erreur getAuditLogs:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generateActivityReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const start = startDate ? new Date(startDate) : moment().subtract(1, 'month').toDate();
      const end = endDate ? new Date(endDate) : new Date();
      const report = await this.generateReport(start, end);

      if (format === 'excel') {
        return res.status(501).json({ success: false, error: req.t('common.notImplemented') });
      }
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Erreur generateActivityReport:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  // ---- Utility analytics methods ----

  getDateLimit(period) {
    switch (period) {
      case 'day': return moment().subtract(1, 'day').toDate();
      case 'week': return moment().subtract(1, 'week').toDate();
      case 'month': return moment().subtract(1, 'month').toDate();
      case 'year': return moment().subtract(1, 'year').toDate();
      default: return moment().subtract(1, 'month').toDate();
    }
  },

  async getUserGrowth(dateLimit) {
    try {
      return await this.models.User.findAll({
        where: { date_creation: { [Op.gte]: dateLimit } },
        attributes: [[fn('DATE', col('date_creation')), 'date'], [fn('COUNT', '*'), 'count']],
        group: [fn('DATE', col('date_creation'))],
        order: [[fn('DATE', col('date_creation')), 'ASC']],
        raw: true
      });
    } catch (error) { return []; }
  },

  async getContentByType() {
    try {
      const [oeuvres, evenements, artisanats] = await Promise.all([
        this.models.Oeuvre.count({ group: ['id_type_oeuvre'] }),
        this.models.Evenement.count(),
        this.models.Artisanat?.count() || 0
      ]);
      return { oeuvres, evenements, artisanats };
    } catch (error) { return { oeuvres: [], evenements: 0, artisanats: 0 }; }
  },

  async getRecentActivity() {
    try {
      const [oeuvres, evenements, commentaires] = await Promise.all([
        this.models.Oeuvre.findAll({
          limit: 5, order: [['date_creation', 'DESC']],
          include: [{ model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom'] }]
        }),
        this.models.Evenement.findAll({ limit: 5, order: [['date_creation', 'DESC']] }),
        this.models.Commentaire?.findAll({
          limit: 5, order: [['date_creation', 'DESC']],
          include: [{ model: this.models.User, attributes: ['nom', 'prenom'] }]
        }) || []
      ]);
      return { oeuvres, evenements, commentaires };
    } catch (error) { return { oeuvres: [], evenements: [], commentaires: [] }; }
  },

  async getTopContributors() {
    try {
      return await this.models.User.findAll({
        attributes: [
          'id_user', 'nom', 'prenom', 'id_type_user',
          [literal(`(SELECT COUNT(*) FROM oeuvre WHERE oeuvre.saisi_par = User.id_user AND oeuvre.statut = 'publie')`), 'oeuvres_count'],
          [literal(`(SELECT COUNT(*) FROM evenement WHERE evenement.id_user = User.id_user)`), 'evenements_count']
        ],
        order: [[literal('oeuvres_count + evenements_count'), 'DESC']],
        limit: 10, raw: true
      });
    } catch (error) { return []; }
  },

  async getUserAnalytics(startDate) {
    const totalUsers = await this.models.User.count();
    const newUsers = await this.models.User.count({ where: { date_creation: { [Op.gte]: startDate } } });
    const activeUsers = await this.models.User.count({ where: { derniere_connexion: { [Op.gte]: startDate } } });
    return { total: totalUsers, new: newUsers, active: activeUsers, retentionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0 };
  },

  async getContentAnalytics(startDate) {
    const [oeuvres, evenements, commentaires] = await Promise.all([
      this.models.Oeuvre.count({ where: { date_creation: { [Op.gte]: startDate } } }),
      this.models.Evenement.count({ where: { date_creation: { [Op.gte]: startDate } } }),
      this.models.Commentaire?.count({ where: { date_creation: { [Op.gte]: startDate } } }) || 0
    ]);
    return { oeuvres, evenements, commentaires, total: oeuvres + evenements + commentaires };
  },

  async getEngagementAnalytics(startDate) {
    const [vues, favoris, participations] = await Promise.all([
      this.models.Vue?.count({ where: { date_vue: { [Op.gte]: startDate } } }) || 0,
      this.models.Favori?.count({ where: { date_ajout: { [Op.gte]: startDate } } }) || 0,
      this.models.EvenementUser?.count({ where: { date_inscription: { [Op.gte]: startDate } } }) || 0
    ]);
    return { vues, favoris, participations };
  },

  async generateReport(startDate, endDate) {
    const [users, content, engagement] = await Promise.all([
      this.getUserReportData(startDate, endDate),
      this.getContentReportData(startDate, endDate),
      this.getEngagementReportData(startDate, endDate)
    ]);
    return { period: { start: startDate.toISOString(), end: endDate.toISOString() }, users, content, engagement };
  },

  async getUserReportData(startDate, endDate) {
    const where = { date_creation: { [Op.between]: [startDate, endDate] } };
    const [total, byType, active] = await Promise.all([
      this.models.User.count({ where }),
      this.models.User.findAll({ where, attributes: ['id_type_user', [fn('COUNT', '*'), 'count']], group: ['id_type_user'], raw: true }),
      this.models.User.count({ where: { derniere_connexion: { [Op.between]: [startDate, endDate] } } })
    ]);
    return { total, byType, active };
  },

  async getContentReportData(startDate, endDate) {
    const where = { date_creation: { [Op.between]: [startDate, endDate] } };
    const [oeuvres, evenements, commentaires] = await Promise.all([
      this.models.Oeuvre.count({ where: { ...where, statut: 'publie' } }),
      this.models.Evenement.count({ where }),
      this.models.Commentaire?.count({ where: { ...where, statut: 'publie' } }) || 0
    ]);
    return { oeuvres, evenements, commentaires };
  },

  async getEngagementReportData(startDate, endDate) {
    const [favoris, participations, vues] = await Promise.all([
      this.models.Favori?.count({ where: { date_ajout: { [Op.between]: [startDate, endDate] } } }) || 0,
      this.models.EvenementUser?.count({ where: { date_inscription: { [Op.between]: [startDate, endDate] } } }) || 0,
      this.models.Vue?.count({ where: { date_vue: { [Op.between]: [startDate, endDate] } } }) || 0
    ]);
    return { favoris, participations, vues };
  },

  async getPatrimoineEvolution() {
    try {
      if (!this.models.Lieu) return [];
      return await this.models.Lieu.findAll({
        attributes: [[fn('DATE_FORMAT', col('date_creation'), '%Y-%m'), 'month'], [fn('COUNT', '*'), 'count']],
        where: { date_creation: { [Op.gte]: moment().subtract(12, 'months').toDate() } },
        group: [fn('DATE_FORMAT', col('date_creation'), '%Y-%m')],
        order: [[literal('month'), 'ASC']],
        raw: true
      });
    } catch (error) { return []; }
  },

  async getPopularPatrimoineSites() {
    try {
      if (!this.models.Lieu || !this.models.Favori) return [];
      return await this.models.Lieu.findAll({
        attributes: [
          'id_lieu', 'nom_fr', 'nom_ar', 'typeLieu',
          [literal(`(SELECT COUNT(*) FROM favori WHERE favori.entity_type = 'lieu' AND favori.entity_id = Lieu.id_lieu)`), 'favorites_count']
        ],
        order: [[literal('favorites_count'), 'DESC']],
        limit: 10, raw: true
      });
    } catch (error) { return []; }
  },

  async getActiveParcoursCount() {
    try {
      if (!this.models.Parcours) return 0;
      return await this.models.Parcours.count({ where: { statut: 'actif' } });
    } catch (error) { return 0; }
  },

  async getQRScanPeakHours(startDate) {
    try {
      if (!this.models.QRScan) return [];
      return await this.models.QRScan.findAll({
        attributes: [[fn('HOUR', col('scan_date')), 'hour'], [fn('COUNT', '*'), 'scans']],
        where: { scan_date: { [Op.gte]: startDate } },
        group: [fn('HOUR', col('scan_date'))],
        order: [[literal('hour'), 'ASC']],
        raw: true
      });
    } catch (error) { return []; }
  }
};

module.exports = analyticsMethods;
