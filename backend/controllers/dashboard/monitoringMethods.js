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
      const { title, message, target, type = 'info', sendEmail = true } = req.body;

      // Répondre immédiatement — le broadcast s'exécute en arrière-plan
      res.json({
        success: true,
        message: req.t('notification.broadcastQueued', 'Notification en cours d\'envoi en arrière-plan'),
        data: { queued: true, target, type }
      });

      // Traitement asynchrone après la réponse
      container.notificationService.broadcastNotification(
        { title, message, target, type, sendEmail },
        req.user.id_user
      ).catch(err => console.error('Erreur broadcastNotification (background):', err.message));

    } catch (error) {
      if (!res.headersSent) {
        if (error.message === 'MISSING_TITLE_OR_MESSAGE') {
          return res.status(400).json({ success: false, error: req.t('common.badRequest') });
        }
        console.error('Erreur broadcastNotification:', error.message);
        res.status(500).json({ success: false, error: req.t('common.serverError') });
      }
    }
  }
};

module.exports = monitoringMethods;
