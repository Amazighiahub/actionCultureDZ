/**
 * NotificationRepository - Couche données pour les notifications
 * Toutes les requêtes Sequelize liées aux notifications utilisateur
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class NotificationRepository extends BaseRepository {
  constructor(models) {
    super(models.Notification);
    this.models = models;
  }

  /**
   * Notifications d'un utilisateur avec relations (paginé)
   */
  async findByUser(userId, { page = 1, limit = 20, unreadOnly = false, type = null } = {}) {
    const where = { id_user: userId };
    if (unreadOnly) where.lu = false;
    if (type) where.type_notification = type;

    const offset = (page - 1) * limit;

    const includes = [];
    if (this.models.Evenement) {
      includes.push({
        model: this.models.Evenement,
        as: 'Evenement',
        attributes: ['id_evenement', 'nom_evenement', 'date_debut'],
        required: false
      });
    }
    if (this.models.Programme) {
      includes.push({
        model: this.models.Programme,
        as: 'Programme',
        attributes: ['id_programme', 'titre'],
        required: false
      });
    }
    if (this.models.Oeuvre) {
      includes.push({
        model: this.models.Oeuvre,
        as: 'Oeuvre',
        attributes: ['id_oeuvre', 'titre'],
        required: false
      });
    }

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include: includes,
      order: [['date_creation', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    return {
      data: rows,
      total: count,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    };
  }

  /**
   * Nombre de notifications non lues
   */
  async countUnread(userId) {
    return this.count({ id_user: userId, lu: false });
  }

  /**
   * Résumé : total, non lues, par type, dernières
   */
  async getSummary(userId) {
    const [total, nonLues, parType] = await Promise.all([
      this.count({ id_user: userId }),
      this.count({ id_user: userId, lu: false }),
      this.model.findAll({
        where: { id_user: userId, lu: false },
        attributes: [
          'type_notification',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['type_notification']
      })
    ]);

    const dernieres = await this.model.findAll({
      where: { id_user: userId, lu: false },
      attributes: ['id_notification', 'titre', 'type_notification', 'date_creation'],
      order: [['date_creation', 'DESC']],
      limit: 5
    });

    return {
      total,
      nonLues,
      parType: parType.reduce((acc, item) => {
        acc[item.type_notification] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      dernieres
    };
  }

  /**
   * Trouver une notification appartenant à un utilisateur
   */
  async findUserNotification(notificationId, userId) {
    return this.findOne({
      id_notification: notificationId,
      id_user: userId
    });
  }

  /**
   * Marquer plusieurs notifications comme lues
   */
  async markMultipleAsRead(notificationIds, userId) {
    return this.updateMany(
      {
        id_notification: { [Op.in]: notificationIds },
        id_user: userId
      },
      { lu: true, date_lecture: new Date() }
    );
  }

  /**
   * Supprimer une notification d'un utilisateur
   */
  async deleteUserNotification(notificationId, userId) {
    return this.deleteMany({
      id_notification: notificationId,
      id_user: userId
    });
  }

  /**
   * Supprimer toutes les notifications lues d'un utilisateur
   */
  async deleteReadByUser(userId) {
    return this.deleteMany({
      id_user: userId,
      lu: true
    });
  }
}

module.exports = NotificationRepository;
