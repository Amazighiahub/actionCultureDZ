// controllers/NotificationController.js - VERSION i18n
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');

// ⚡ Import du helper i18n
const { translate, translateDeep } = require('../helpers/i18n');

class NotificationController {
  constructor(models) {
    this.models = models;
    this.notificationService = new NotificationService(models);
  }

  // Récupérer les notifications de l'utilisateur connecté
  async getMyNotifications(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, nonLues = false, type } = req.query;
      const offset = (page - 1) * limit;

      const where = { id_user: req.user.id_user };
      
      if (nonLues === 'true') {
        where.lu = false;
      }
      
      if (type) {
        where.type_notification = type;
      }

      const notifications = await this.models.Notification.findAndCountAll({
        where,
        include: [
          {
            model: this.models.Evenement,
            as: 'Evenement',
            attributes: ['id_evenement', 'nom_evenement', 'date_debut'],
            required: false
          },
          {
            model: this.models.Programme,
            as: 'Programme',
            attributes: ['id_programme', 'titre'],
            required: false
          },
          {
            model: this.models.Oeuvre,
            as: 'Oeuvre',
            attributes: ['id_oeuvre', 'titre'],
            required: false
          }
        ],
        order: [['date_creation', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      const nonLuesCount = await this.models.Notification.count({
        where: {
          id_user: req.user.id_user,
          lu: false
        }
      });

      // ⚡ Traduire les relations incluses
      res.json({
        success: true,
        data: {
          notifications: translateDeep(notifications.rows, lang),
          pagination: {
            total: notifications.count,
            page: parseInt(page),
            pages: Math.ceil(notifications.count / limit),
            limit: parseInt(limit)
          },
          stats: {
            nonLues: nonLuesCount,
            total: notifications.count
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Résumé des notifications
  async getNotificationsSummary(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const userId = req.user.id_user;

      const [total, nonLues, parType] = await Promise.all([
        this.models.Notification.count({
          where: { id_user: userId }
        }),
        
        this.models.Notification.count({
          where: { 
            id_user: userId,
            lu: false
          }
        }),
        
        this.models.Notification.findAll({
          where: { 
            id_user: userId,
            lu: false
          },
          attributes: [
            'type_notification',
            [this.models.sequelize.fn('COUNT', '*'), 'count']
          ],
          group: ['type_notification']
        })
      ]);

      const dernieres = await this.models.Notification.findAll({
        where: { 
          id_user: userId,
          lu: false
        },
        attributes: ['id_notification', 'titre', 'type_notification', 'date_creation'],
        order: [['date_creation', 'DESC']],
        limit: 5
      });

      res.json({
        success: true,
        data: {
          total,
          nonLues,
          parType: parType.reduce((acc, item) => {
            acc[item.type_notification] = parseInt(item.dataValues.count);
            return acc;
          }, {}),
          dernieres: translate(dernieres, lang)
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Marquer une notification comme lue
  async markAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await this.models.Notification.findOne({
        where: {
          id_notification: id,
          id_user: req.user.id_user
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification non trouvée'
        });
      }

      await notification.marquerCommeLue();

      res.json({
        success: true,
        message: 'Notification marquée comme lue'
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Marquer toutes les notifications comme lues
  async markAllAsRead(req, res) {
    try {
      const updated = await this.models.Notification.marquerToutesLues(req.user.id_user);

      res.json({
        success: true,
        message: `${updated[0]} notifications marquées comme lues`
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Marquer plusieurs notifications comme lues
  async markMultipleAsRead(req, res) {
    try {
      const { notificationIds } = req.body;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Liste d\'IDs requise'
        });
      }

      const updated = await this.models.Notification.update(
        { 
          lu: true,
          date_lecture: new Date()
        },
        {
          where: {
            id_notification: { [Op.in]: notificationIds },
            id_user: req.user.id_user
          }
        }
      );

      res.json({
        success: true,
        message: `${updated[0]} notifications marquées comme lues`
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Supprimer une notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      const deleted = await this.models.Notification.destroy({
        where: {
          id_notification: id,
          id_user: req.user.id_user
        }
      });

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification non trouvée'
        });
      }

      res.json({
        success: true,
        message: 'Notification supprimée'
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Supprimer toutes les notifications lues
  async deleteReadNotifications(req, res) {
    try {
      const deleted = await this.models.Notification.destroy({
        where: {
          id_user: req.user.id_user,
          lu: true
        }
      });

      res.json({
        success: true,
        message: `${deleted} notifications supprimées`
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Récupérer les préférences
  async getPreferences(req, res) {
    try {
      const user = await this.models.User.findByPk(req.user.id_user, {
        attributes: [
          'notifications_email',
          'notifications_push',
          'notifications_newsletter',
          'notifications_commentaires',
          'notifications_favoris',
          'notifications_evenements'
        ]
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      res.json({
        success: true,
        data: {
          global: {
            email: user.notifications_email ?? true,
            push: user.notifications_push ?? true,
            newsletter: user.notifications_newsletter ?? true
          },
          types: {
            commentaires: user.notifications_commentaires ?? true,
            favoris: user.notifications_favoris ?? true,
            evenements: user.notifications_evenements ?? true
          }
        }
      });

    } catch (error) {
      console.error('Erreur getPreferences:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Mettre à jour les préférences
  async updatePreferences(req, res) {
    try {
      const { global, types } = req.body;

      const updates = {};
      
      if (global) {
        if (typeof global.email === 'boolean') updates.notifications_email = global.email;
        if (typeof global.push === 'boolean') updates.notifications_push = global.push;
        if (typeof global.newsletter === 'boolean') updates.notifications_newsletter = global.newsletter;
      }
      
      if (types) {
        if (typeof types.commentaires === 'boolean') {
          updates.notifications_commentaires = types.commentaires;
        }
        if (typeof types.favoris === 'boolean') {
          updates.notifications_favoris = types.favoris;
        }
        if (typeof types.evenements === 'boolean') {
          updates.notifications_evenements = types.evenements;
        }
      }

      await this.models.User.update(updates, {
        where: { id_user: req.user.id_user }
      });

      res.json({
        success: true,
        message: 'Préférences mises à jour'
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Envoyer une notification à un utilisateur spécifique (admin/organisateur)
  async sendNotification(req, res) {
    try {
      const { titre, message, type_notification, destinataire_id, url_action, priorite, metadata } = req.body;

      if (!titre || !message || !destinataire_id) {
        return res.status(400).json({
          success: false,
          error: 'titre, message et destinataire_id sont requis'
        });
      }

      // Vérifier que le destinataire existe
      const destinataire = await this.models.User.findByPk(destinataire_id);
      if (!destinataire) {
        return res.status(404).json({ success: false, error: 'Destinataire non trouvé' });
      }

      const notification = await this.models.Notification.create({
        id_user: destinataire_id,
        type_notification: type_notification || 'message_admin',
        titre,
        message,
        url_action: url_action || null,
        priorite: priorite || 'normale',
        metadata: metadata || null,
        lu: false,
        email_envoye: false
      });

      res.status(201).json({
        success: true,
        message: 'Notification envoyée',
        data: { notification }
      });

    } catch (error) {
      console.error('Erreur sendNotification:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Envoyer une notification broadcast à tous les utilisateurs actifs
  async broadcastNotification(req, res) {
    try {
      const { titre, message, type_notification, priorite, metadata } = req.body;

      if (!titre || !message) {
        return res.status(400).json({
          success: false,
          error: 'titre et message sont requis'
        });
      }

      // Récupérer tous les utilisateurs actifs
      const users = await this.models.User.findAll({
        where: { statut: 'actif' },
        attributes: ['id_user']
      });

      const notifications = users.map(user => ({
        id_user: user.id_user,
        type_notification: type_notification || 'message_admin',
        titre,
        message,
        priorite: priorite || 'normale',
        metadata: metadata || null,
        lu: false,
        email_envoye: false
      }));

      await this.models.Notification.bulkCreate(notifications);

      res.status(201).json({
        success: true,
        message: `Notification envoyée à ${users.length} utilisateurs`,
        data: { sent_count: users.length }
      });

    } catch (error) {
      console.error('Erreur broadcastNotification:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
}

module.exports = NotificationController;
