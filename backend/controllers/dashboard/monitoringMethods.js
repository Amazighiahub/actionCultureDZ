// controllers/dashboard/monitoringMethods.js
// Monitoring, alerts, and notification methods for DashboardController

const { Op } = require('sequelize');
const moment = require('moment');

const TYPE_USER_IDS = {
  VISITEUR: 1
};

const monitoringMethods = {

  async getAlerts(req, res) {
    try {
      const alerts = await this.getCachedData('dashboard:alerts', () => this.generateAlerts(), 300);
      res.json({ success: true, data: alerts });
    } catch (error) {
      console.error('Erreur getAlerts:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async generateAlerts() {
    const alerts = [];

    const pendingUsersCount = await this.models.User.count({
      where: { statut: 'en_attente_validation', date_creation: { [Op.lt]: moment().subtract(7, 'days').toDate() } }
    });
    if (pendingUsersCount > 0) {
      alerts.push({ type: 'warning', category: 'users', message: `${pendingUsersCount} utilisateurs en attente depuis plus de 7 jours`, priority: 'high', timestamp: new Date() });
    }

    const pendingOeuvresCount = await this.models.Oeuvre.count({
      where: { statut: 'en_attente', date_creation: { [Op.lt]: moment().subtract(3, 'days').toDate() } }
    });
    if (pendingOeuvresCount > 10) {
      alerts.push({ type: 'warning', category: 'content', message: `${pendingOeuvresCount} œuvres en attente de validation`, priority: 'medium', timestamp: new Date() });
    }

    const untreatedReports = await this.models.Signalement?.count({
      where: { statut: 'en_attente', priorite: 'urgente', date_signalement: { [Op.lt]: moment().subtract(24, 'hours').toDate() } }
    }) || 0;
    if (untreatedReports > 0) {
      alerts.push({ type: 'error', category: 'moderation', message: `${untreatedReports} signalements urgents non traités`, priority: 'critical', timestamp: new Date() });
    }

    const diskSpace = await this.checkDiskSpace();
    if (diskSpace && diskSpace.percentUsed > 90) {
      alerts.push({ type: 'error', category: 'system', message: `Espace disque critique: ${diskSpace.percentUsed}% utilisé`, priority: 'critical', timestamp: new Date() });
    }

    const avgResponseTime = await this.getAverageResponseTime();
    if (avgResponseTime > 2000) {
      alerts.push({ type: 'warning', category: 'performance', message: `Temps de réponse élevé: ${avgResponseTime}ms`, priority: 'medium', timestamp: new Date() });
    }

    return alerts;
  },

  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const offset = (page - 1) * limit;
      const where = {
        id_user: req.user.id_user,
        type_notification: { [Op.in]: ['admin_alert', 'system_notification', 'moderation_required'] }
      };
      if (unreadOnly === 'true') where.lu = false;

      const notifications = await this.models.Notification?.findAndCountAll({
        where, order: [['date_creation', 'DESC']], limit: parseInt(limit), offset: parseInt(offset)
      }) || { count: 0, rows: [] };

      res.json({
        success: true,
        data: {
          items: notifications.rows,
          pagination: { total: notifications.count, page: parseInt(page), pages: Math.ceil(notifications.count / limit), limit: parseInt(limit), hasNext: page < Math.ceil(notifications.count / limit), hasPrev: page > 1 }
        }
      });
    } catch (error) {
      console.error('Erreur getNotifications:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async broadcastNotification(req, res) {
    try {
      const { title, message, target, type = 'info' } = req.body;
      if (!title || !message) return res.status(400).json({ success: false, error: req.t('common.badRequest') });

      let whereClause = {};
      switch (target) {
        case 'professionals': whereClause = { id_type_user: { [Op.ne]: TYPE_USER_IDS.VISITEUR } }; break;
        case 'visitors': whereClause = { id_type_user: TYPE_USER_IDS.VISITEUR }; break;
        default: whereClause = {};
      }

      const targetWhere = { ...whereClause, statut: 'actif', email_verifie: true };
      const totalTargetUsers = await this.models.User.count({ where: targetWhere });
      if (totalTargetUsers === 0) return res.status(400).json({ success: false, error: req.t('admin.noUsersFound') });

      const batchSize = 100;
      let offset = 0;
      let totalNotified = 0;
      let totalSkipped = 0;

      while (true) {
        const users = await this.models.User.findAll({
          where: targetWhere, attributes: ['id_user', 'email', 'preferences_notification'],
          limit: batchSize, offset, raw: true
        });
        if (users.length === 0) break;

        const usersToNotify = users.filter(user => {
          if (!user.preferences_notification) return true;
          try {
            const prefs = typeof user.preferences_notification === 'string' ? JSON.parse(user.preferences_notification) : user.preferences_notification;
            return prefs.admin_notifications !== false;
          } catch { return true; }
        });

        totalSkipped += users.length - usersToNotify.length;

        if (usersToNotify.length > 0 && this.models.Notification) {
          const notifications = usersToNotify.map(user => ({
            user_id: user.id_user, type: 'broadcast', titre: title, message,
            lue: false, date_creation: new Date(),
            metadata: JSON.stringify({ sender_id: req.user.id_user, target_group: target, notification_type: type })
          }));
          await this.models.Notification.bulkCreate(notifications, { validate: true, individualHooks: false });
          totalNotified += usersToNotify.length;
        }

        offset += batchSize;
        if (users.length < batchSize) break;
      }

      if (this.models.AuditLog) {
        await this.models.AuditLog.create({
          id_admin: req.user.id_user, action: 'BROADCAST_NOTIFICATION', type_entite: 'notification',
          details: JSON.stringify({ title, target, recipients_count: totalNotified }), date_action: new Date()
        });
      }

      res.json({
        success: true, message: req.t('notification.broadcastSent', { count: totalNotified }),
        data: { total_users: totalTargetUsers, notified: totalNotified, skipped: totalSkipped, target, type, timestamp: new Date() }
      });
    } catch (error) {
      console.error('Erreur broadcastNotification:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError'), message: error.message });
    }
  },

  // ---- System helpers ----

  async checkDiskSpace() {
    try {
      return { total: 100000000000, used: 50000000000, free: 50000000000, percentUsed: 50 };
    } catch (error) { return null; }
  },

  async getAverageResponseTime() {
    try {
      if (!this.models.PerformanceLog) return 0;
      const result = await this.models.PerformanceLog.findOne({
        attributes: [[this.sequelize.fn('AVG', this.sequelize.col('response_time')), 'avg_time']],
        where: { created_at: { [Op.gte]: moment().subtract(24, 'hours').toDate() } },
        raw: true
      });
      return result?.avg_time || 0;
    } catch (error) { return 0; }
  }
};

module.exports = monitoringMethods;
