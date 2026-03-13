/**
 * NotificationController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Repository → Database
 *
 * ZÉRO accès direct aux models Sequelize.
 * ZÉRO import de models.
 * Toute logique métier délèguée au NotificationService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translate, translateDeep } = require('../helpers/i18n');

class NotificationController extends BaseController {
  get notificationService() {
    return container.notificationService;
  }

  // ============================================================================
  // NOTIFICATIONS UTILISATEUR
  // ============================================================================

  async getMyNotifications(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { nonLues, type } = req.query;

      const result = await this.notificationService.getUserNotificationsPaginated(
        req.user.id_user,
        { page, limit, unreadOnly: nonLues === 'true', type: type || null }
      );

      const nonLuesCount = await this.notificationService.getUnreadCount(req.user.id_user);

      res.json({
        success: true,
        data: {
          notifications: translateDeep(result.data, lang),
          pagination: result.pagination,
          stats: {
            nonLues: nonLuesCount,
            total: result.total
          }
        },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getNotificationsSummary(req, res) {
    try {
      const lang = req.lang || 'fr';
      const summary = await this.notificationService.getNotificationsSummary(req.user.id_user);

      res.json({
        success: true,
        data: {
          ...summary,
          dernieres: translate(summary.dernieres, lang)
        },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // MARQUER COMME LU
  // ============================================================================

  async markAsRead(req, res) {
    try {
      const notification = await this.notificationService.markOneAsRead(
        req.params.id,
        req.user.id_user
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: req.t('notification.notFound')
        });
      }

      this._sendMessage(res, req.t('notification.markedAsRead'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async markAllAsRead(req, res) {
    try {
      const updated = await this.notificationService.markAllAsReadForUser(req.user.id_user);
      this._sendMessage(res, req.t('notification.allMarkedAsRead', { count: updated[0] }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async markMultipleAsRead(req, res) {
    try {
      const { notificationIds } = req.body;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      const updated = await this.notificationService.markMultipleAsReadForUser(
        notificationIds,
        req.user.id_user
      );

      this._sendMessage(res, req.t('notification.allMarkedAsRead', { count: updated[0] }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // SUPPRESSION
  // ============================================================================

  async deleteNotification(req, res) {
    try {
      const deleted = await this.notificationService.deleteUserNotification(
        req.params.id,
        req.user.id_user
      );

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          error: req.t('notification.notFound')
        });
      }

      this._sendMessage(res, req.t('notification.deleted'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async deleteReadNotifications(req, res) {
    try {
      const deleted = await this.notificationService.deleteReadNotificationsForUser(req.user.id_user);
      this._sendMessage(res, req.t('notification.deletedCount', { count: deleted }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PRÉFÉRENCES
  // ============================================================================

  async getPreferences(req, res) {
    try {
      const preferences = await this.notificationService.getUserPreferences(req.user.id_user);

      if (!preferences) {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }

      this._sendSuccess(res, preferences);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updatePreferences(req, res) {
    try {
      await this.notificationService.updateUserPreferences(req.user.id_user, req.body);
      this._sendMessage(res, req.t('notification.preferencesUpdated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN — ENVOI DE NOTIFICATIONS
  // ============================================================================

  async sendNotification(req, res) {
    try {
      const { titre, message, destinataire_id } = req.body;

      if (!titre || !message || !destinataire_id) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      const notification = await this.notificationService.sendToUser(destinataire_id, req.body);

      if (!notification) {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }

      this._sendCreated(res, { notification }, req.t('notification.sent'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async broadcastNotification(req, res) {
    try {
      const { titre, message } = req.body;

      if (!titre || !message) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      const totalSent = await this.notificationService.broadcastToAllActive(req.body);

      res.status(201).json({
        success: true,
        message: req.t('notification.broadcastSent', { count: totalSent }),
        data: { sent_count: totalSent }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = NotificationController;
