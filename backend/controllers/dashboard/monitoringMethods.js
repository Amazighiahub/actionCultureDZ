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

      // Destinataire unique : notification à cette seule personne (auparavant le site
      // remplaçait « un utilisateur » par « tous » et le message partait à tout le monde)
      if (target === 'user') {
        const userId = parseInt(req.body.targetUserId, 10);
        if (!userId || !title || !message) {
          return res.status(400).json({ success: false, error: req.t('common.badRequest') });
        }
        const notification = await container.notificationService.sendToUser(userId, {
          titre: title,
          message,
          type_notification: 'message_admin',
          metadata: { type, envoye_par: req.user.id_user }
        });
        if (!notification) {
          return res.status(404).json({ success: false, error: req.t('common.notFound') });
        }
        // L'e-mail part aussi (la case « e-mail » était ignorée) ; son résultat est renvoyé
        const email = sendEmail === false ? null
          : await container.notificationService.envoyerEmailDirect(userId, { title, message });
        return res.json({ success: true, data: { queued: false, target, type, notified: 1, email } });
      }

      // Notifications créées avant de répondre (rapide) : l'administration voit le vrai résultat
      // ou l'erreur. Auparavant la réponse « envoyé » partait avant le traitement, qui échouait
      // en silence. Les e-mails, eux, partent un par un en arrière-plan.
      const resultat = await container.notificationService.broadcastNotification(
        { title, message, target, type, sendEmail },
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('notification.broadcastQueued', 'Notification en cours d\'envoi en arrière-plan'),
        data: { queued: true, ...resultat }
      });

    } catch (error) {
      if (!res.headersSent) {
        if (error.message === 'MISSING_TITLE_OR_MESSAGE') {
          return res.status(400).json({ success: false, error: req.t('common.badRequest') });
        }
        if (error.message === 'NO_TARGET_USERS') {
          return res.status(400).json({ success: false, error: req.t('notification.noTargetUsers', 'Aucun destinataire dans ce groupe') });
        }
        console.error('Erreur broadcastNotification:', error.message);
        res.status(500).json({ success: false, error: req.t('common.serverError') });
      }
    }
  }
};

module.exports = monitoringMethods;
