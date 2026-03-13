// controllers/dashboard/monitoringMethods.js
// Monitoring, alerts, and notification methods for DashboardController

const container = require('../../services/serviceContainer');

const monitoringMethods = {

  async getAlerts(req, res) {
    try {
      const alerts = await this.getCachedData(
        'dashboard:alerts',
        () => container.monitoringService.generateAlerts(),
        300
      );
      res.json({ success: true, data: alerts });
    } catch (error) {
      console.error('Erreur getAlerts:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const data = await container.notificationService.getAdminNotifications(
        req.user.id_user,
        { page, limit, unreadOnly: unreadOnly === 'true' }
      );
      res.json({ success: true, data });
    } catch (error) {
      console.error('Erreur getNotifications:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async broadcastNotification(req, res) {
    try {
      const { title, message, target, type = 'info' } = req.body;
      const result = await container.notificationService.broadcastNotification(
        { title, message, target, type },
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('notification.broadcastSent', { count: result.notified }),
        data: result
      });
    } catch (error) {
      if (error.message === 'MISSING_TITLE_OR_MESSAGE') {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      if (error.message === 'NO_TARGET_USERS') {
        return res.status(400).json({ success: false, error: req.t('admin.noUsersFound') });
      }
      console.error('Erreur broadcastNotification:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  }
};

module.exports = monitoringMethods;
