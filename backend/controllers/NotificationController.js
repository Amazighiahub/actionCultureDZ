// controllers/NotificationController.js - API des notifications utilisateur
const { Op } = require('sequelize');
const NotificationService = require('../services/NotificationService');

class NotificationController {
  constructor(models) {
    this.models = models;
    this.notificationService = new NotificationService(models);
  }

  // ========================================================================
  // RÉCUPÉRATION DES NOTIFICATIONS
  // ========================================================================

  // Récupérer les notifications de l'utilisateur connecté
  async getMyNotifications(req, res) {
    try {
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

      // Compter les non lues
      const nonLuesCount = await this.models.Notification.count({
        where: {
          id_user: req.user.id_user,
          lu: false
        }
      });

      res.json({
        success: true,
        data: {
          notifications: notifications.rows,
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
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Récupérer le résumé des notifications (pour badge/compteur)
  async getNotificationsSummary(req, res) {
    try {
      const userId = req.user.id_user;

      const [total, nonLues, parType] = await Promise.all([
        // Total
        this.models.Notification.count({
          where: { id_user: userId }
        }),
        
        // Non lues
        this.models.Notification.count({
          where: { 
            id_user: userId,
            lu: false
          }
        }),
        
        // Par type (non lues)
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

      // Dernières notifications non lues
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
          dernieres
        }
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // GESTION DES NOTIFICATIONS
  // ========================================================================

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

  // ========================================================================
  // PRÉFÉRENCES DE NOTIFICATION
  // ========================================================================

  // Récupérer les préférences
  async getPreferences(req, res) {
    try {
      const user = await this.models.User.findByPk(req.user.id_user, {
        attributes: [
          'notifications_actives',
          'notifications_email',
          'notifications_sms',
          'notification_nouveaux_evenements',
          'notification_modifications_programme',
          'notification_rappels'
        ]
      });

      res.json({
        success: true,
        data: {
          global: {
            actives: user.notifications_actives ?? true,
            email: user.notifications_email ?? true,
            sms: user.notifications_sms ?? false
          },
          types: {
            nouveauxEvenements: user.notification_nouveaux_evenements ?? true,
            modificationsProgramme: user.notification_modifications_programme ?? true,
            rappels: user.notification_rappels ?? true
          }
        }
      });

    } catch (error) {
      console.error('Erreur:', error);
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
        if (typeof global.actives === 'boolean') updates.notifications_actives = global.actives;
        if (typeof global.email === 'boolean') updates.notifications_email = global.email;
        if (typeof global.sms === 'boolean') updates.notifications_sms = global.sms;
      }
      
      if (types) {
        if (typeof types.nouveauxEvenements === 'boolean') {
          updates.notification_nouveaux_evenements = types.nouveauxEvenements;
        }
        if (typeof types.modificationsProgramme === 'boolean') {
          updates.notification_modifications_programme = types.modificationsProgramme;
        }
        if (typeof types.rappels === 'boolean') {
          updates.notification_rappels = types.rappels;
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

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  // Tester l'envoi d'email (développement)
  async testEmail(req, res) {
    try {
      // Seulement en développement ou pour les admins
      if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      const { type = 'test' } = req.body;
      const user = await this.models.User.findByPk(req.user.id_user);

      let result;
      switch (type) {
        case 'bienvenue':
          result = await this.notificationService.emailService.sendWelcomeEmail(user);
          break;
        case 'test':
        default:
          result = await this.notificationService.emailService.sendEmail(
            user.email,
            'Test de notification - Action Culture',
            'Ceci est un email de test. Si vous le recevez, les notifications fonctionnent correctement!'
          );
      }

      res.json({
        success: true,
        message: 'Email de test envoyé',
        result,
        serviceStatus: this.notificationService.emailService.getStatus()
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }
}

module.exports = NotificationController;