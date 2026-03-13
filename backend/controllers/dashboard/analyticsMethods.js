// controllers/dashboard/analyticsMethods.js
// Analytics, stats, and reporting methods for DashboardController

const { subDays, subMonths } = require('date-fns');
const container = require('../../services/serviceContainer');

/**
 * Methods mixed into DashboardController.prototype.
 * `this` refers to the DashboardController instance at runtime.
 */
const analyticsMethods = {

  async getOverview(req, res) {
    try {
      const stats = await this.getCachedData(
        'dashboard:overview',
        () => container.statsService.generateOverviewStats(),
        300
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getOverview:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError'), message: error.message });
    }
  },

  async getDetailedStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      const stats = await this.getCachedData(
        `dashboard:stats:${period}`,
        () => container.statsService.generateDetailedStats(period),
        600
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getDetailedStats:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getPatrimoineDashboard(req, res) {
    try {
      const stats = await this.getCachedData(
        'dashboard:patrimoine',
        () => container.statsService.generatePatrimoineStats(),
        600
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getPatrimoineDashboard:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getQRStats(req, res) {
    try {
      const { period = 30 } = req.query;
      const startDate = subDays(new Date(), parseInt(period));
      const stats = await this.getCachedData(
        `dashboard:qr:${period}`,
        () => container.statsService.generateQRStats(startDate),
        900
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erreur getQRStats:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getAdvancedAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      const analytics = await this.getCachedData(
        `dashboard:analytics:${period}`,
        () => container.analyticsService.generateAdvancedAnalytics(period),
        3600
      );
      res.json({ success: true, data: analytics });
    } catch (error) {
      console.error('Erreur getAdvancedAnalytics:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 50, userId, action } = req.query;
      const data = await container.analyticsService.getAuditLogs({ page, limit, userId, action });
      res.json({ success: true, data });
    } catch (error) {
      console.error('Erreur getAuditLogs:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generateActivityReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const start = startDate ? new Date(startDate) : subMonths(new Date(), 1);
      const end = endDate ? new Date(endDate) : new Date();
      const report = await container.analyticsService.generateReport(start, end);

      if (format === 'excel') {
        return res.status(501).json({ success: false, error: req.t('common.notImplemented') });
      }
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Erreur generateActivityReport:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  }

};

module.exports = analyticsMethods;
