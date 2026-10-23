// controllers/dashboard/monitoringMethods.js
// Monitoring, alerts, and notification methods for DashboardController

const container = require('../../services/serviceContainer');
const { Op } = require('sequelize');

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

      // Compter les destinataires directement depuis les modèles
      let notified = 0;
      try {
        const { User } = container._models || require('../../models');
        const VISITEUR_TYPE = 1;
        const whereClause = target === 'professionals'
          ? { id_type_user: { [Op.ne]: VISITEUR_TYPE } }
          : target === 'visitors'
            ? { id_type_user: VISITEUR_TYPE }
            : {};
        notified = await User.count({ where: { ...whereClause, statut: 'actif' } });
      } catch (countErr) {
        console.warn('broadcastNotification: impossible de compter les cibles:', countErr.message);
      }

      // État de l'envoi d'e-mails, connu tout de suite (en pause : rien ne part)
      const etatEmail = () => {
        const service = container.notificationService.emailService;
        return typeof service?.etatEnvoi === 'function' ? service.etatEnvoi() : 'actif';
      };

      // Répondre immédiatement avec le nombre d'utilisateurs ciblés
      res.json({
        success: true,
        message: req.t('notification.broadcastQueued', 'Notification en cours d\'envoi en arrière-plan'),
        data: { queued: true, target, type, notified, email_etat: etatEmail() }
      });

      // Traitement asynchrone après la réponse
      container.notificationService.broadcastNotification(
        { title, message, target, type, sendEmail },
        req.user.id_user
      ).catch(err => console.error('Erreur broadcastNotification (background):', err?.message || String(err)));

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
