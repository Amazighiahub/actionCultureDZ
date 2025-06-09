// services/NotificationService.js - Orchestrateur des notifications
const emailService = require('./emailService');
const { Op } = require('sequelize');

class NotificationService {
  constructor(models) {
    this.models = models;
    this.emailService = emailService;
  }

  // ========================================================================
  // NOTIFICATIONS ÉVÉNEMENTS
  // ========================================================================

  // Notifier la validation/refus d'un professionnel pour un événement
  async notifierValidationParticipation(evenementId, userId, statut, notes = '') {
    try {
      console.log(`📧 Notification validation participation: Event ${evenementId}, User ${userId}, Statut ${statut}`);

      // Récupérer les informations nécessaires
      const [professionnel, evenement] = await Promise.all([
        this.models.User.findByPk(userId, {
          attributes: ['id_user', 'nom', 'prenom', 'email', 'type_user']
        }),
        this.models.Evenement.findByPk(evenementId, {
          include: [
            { model: this.models.Lieu, attributes: ['nom'] },
            { model: this.models.TypeEvenement, attributes: ['nom_type'] }
          ]
        })
      ]);

      if (!professionnel || !evenement) {
        throw new Error('Utilisateur ou événement non trouvé');
      }

      // Envoyer l'email
      const result = await this.emailService.notifierValidationProfessionnel(
        professionnel,
        evenement,
        statut,
        notes
      );

      // Enregistrer la notification dans la base
      await this.enregistrerNotification({
        id_user: userId,
        type_notification: 'validation_participation',
        titre: statut === 'confirme' ? 'Participation acceptée' : 'Participation refusée',
        message: `Votre participation à "${evenement.nom_evenement}" a été ${statut === 'confirme' ? 'acceptée' : 'refusée'}`,
        id_evenement: evenementId,
        email_envoye: result.success
      });

      return result;

    } catch (error) {
      console.error('❌ Erreur notification validation:', error);
      throw error;
    }
  }

  // Notifier l'annulation d'un événement
  async notifierAnnulationEvenement(evenementId, raison) {
    try {
      console.log(`📧 Notification annulation événement: ${evenementId}`);

      // Récupérer l'événement et ses participants
      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.Lieu },
          { model: this.models.TypeEvenement }
        ]
      });

      if (!evenement) {
        throw new Error('Événement non trouvé');
      }

      // Récupérer tous les participants (confirmés et en attente)
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: evenementId,
          statut_participation: {
            [Op.in]: ['confirme', 'en_attente', 'inscrit']
          }
        },
        include: [
          {
            model: this.models.User,
            attributes: ['id_user', 'nom', 'prenom', 'email']
          }
        ]
      });

      if (participants.length === 0) {
        console.log('ℹ️ Aucun participant à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierAnnulationEvenement(
        participants,
        evenement,
        raison
      );

      // Enregistrer les notifications
      const notifications = [];
      for (const participant of participants) {
        notifications.push({
          id_user: participant.id_user,
          type_notification: 'annulation_evenement',
          titre: 'Événement annulé',
          message: `L'événement "${evenement.nom_evenement}" a été annulé`,
          id_evenement: evenementId,
          email_envoye: results.find(r => r.email === participant.User.email)?.result.success || false
        });
      }

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      console.log(`✅ ${successCount}/${participants.length} participants notifiés`);

      return {
        success: true,
        notified: successCount,
        total: participants.length,
        results
      };

    } catch (error) {
      console.error('❌ Erreur notification annulation:', error);
      throw error;
    }
  }

  // ========================================================================
  // NOTIFICATIONS PROGRAMMES
  // ========================================================================

  // Notifier la modification d'un programme
  async notifierModificationProgramme(programmeId, typeModification = 'general') {
    try {
      console.log(`📧 Notification modification programme: ${programmeId}, Type: ${typeModification}`);

      // Récupérer le programme et l'événement
      const programme = await this.models.Programme.findByPk(programmeId, {
        include: [
          {
            model: this.models.Evenement,
            include: [
              { model: this.models.Lieu },
              { model: this.models.TypeEvenement }
            ]
          }
        ]
      });

      if (!programme || !programme.Evenement) {
        throw new Error('Programme ou événement non trouvé');
      }

      // Récupérer les participants confirmés uniquement
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: programme.id_evenement,
          statut_participation: 'confirme'
        },
        include: [
          {
            model: this.models.User,
            attributes: ['id_user', 'nom', 'prenom', 'email']
          }
        ]
      });

      if (participants.length === 0) {
        console.log('ℹ️ Aucun participant confirmé à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierModificationProgramme(
        participants,
        programme.Evenement,
        programme,
        typeModification
      );

      // Enregistrer les notifications
      const notifications = participants.map(participant => ({
        id_user: participant.id_user,
        type_notification: 'modification_programme',
        titre: 'Programme modifié',
        message: `Le programme de "${programme.Evenement.nom_evenement}" a été modifié`,
        id_evenement: programme.id_evenement,
        id_programme: programmeId,
        email_envoye: results.find(r => r.email === participant.User.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      console.log(`✅ ${successCount}/${participants.length} participants notifiés`);

      return {
        success: true,
        notified: successCount,
        total: participants.length,
        results
      };

    } catch (error) {
      console.error('❌ Erreur notification modification programme:', error);
      throw error;
    }
  }

  // Notifier l'ajout d'un nouveau programme
  async notifierNouveauProgramme(programmeId) {
    return this.notifierModificationProgramme(programmeId, 'nouveau');
  }

  // Notifier l'annulation d'un programme
  async notifierAnnulationProgramme(programmeId) {
    return this.notifierModificationProgramme(programmeId, 'annule');
  }

  // ========================================================================
  // NOTIFICATIONS UTILISATEURS
  // ========================================================================

  // Notifier un nouvel événement aux utilisateurs intéressés
  async notifierNouvelEvenement(evenementId, filtres = {}) {
    try {
      console.log(`📧 Notification nouvel événement: ${evenementId}`);

      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.Lieu, include: [{ model: this.models.Wilaya }] },
          { model: this.models.TypeEvenement }
        ]
      });

      if (!evenement) {
        throw new Error('Événement non trouvé');
      }

      // Construire la requête pour les utilisateurs à notifier
      const whereClause = {
        statut_compte: 'actif',
        notifications_actives: true // Si vous avez ce champ
      };

      // Filtrer par wilaya si l'événement a un lieu
      if (filtres.wilayaProximite && evenement.Lieu?.id_wilaya) {
        whereClause.id_wilaya = evenement.Lieu.id_wilaya;
      }

      // Récupérer les utilisateurs à notifier
      const users = await this.models.User.findAll({
        where: whereClause,
        attributes: ['id_user', 'email', 'nom', 'prenom'],
        limit: filtres.limit || 100 // Limiter pour éviter trop d'envois
      });

      if (users.length === 0) {
        console.log('ℹ️ Aucun utilisateur à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les notifications
      const results = await this.emailService.notifierNouvelEvenement(users, evenement);

      // Enregistrer les notifications
      const notifications = users.map(user => ({
        id_user: user.id_user,
        type_notification: 'nouvel_evenement',
        titre: 'Nouvel événement',
        message: `Découvrez "${evenement.nom_evenement}"`,
        id_evenement: evenementId,
        email_envoye: results.find(r => r.email === user.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      console.log(`✅ ${successCount}/${users.length} utilisateurs notifiés`);

      return {
        success: true,
        notified: successCount,
        total: users.length
      };

    } catch (error) {
      console.error('❌ Erreur notification nouvel événement:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  // Enregistrer une notification dans la base
  async enregistrerNotification(data) {
    try {
      // Si vous avez une table Notification
      if (this.models.Notification) {
        await this.models.Notification.create({
          ...data,
          date_creation: new Date(),
          lu: false
        });
      }
      
      // Log de l'activité
      console.log(`📝 Notification enregistrée: ${data.type_notification} pour user ${data.id_user}`);
      
    } catch (error) {
      console.error('❌ Erreur enregistrement notification:', error);
      // Ne pas faire échouer l'envoi si l'enregistrement échoue
    }
  }

  // Enregistrer plusieurs notifications
  async enregistrerNotificationsMultiples(notifications) {
    try {
      if (this.models.Notification) {
        const notificationsAvecDate = notifications.map(n => ({
          ...n,
          date_creation: new Date(),
          lu: false
        }));
        
        await this.models.Notification.bulkCreate(notificationsAvecDate);
      }
      
      console.log(`📝 ${notifications.length} notifications enregistrées`);
      
    } catch (error) {
      console.error('❌ Erreur enregistrement notifications:', error);
    }
  }

  // Récupérer les notifications d'un utilisateur
  async getNotificationsUtilisateur(userId, options = {}) {
    try {
      const { limit = 20, offset = 0, nonLues = false } = options;
      
      const where = { id_user: userId };
      if (nonLues) {
        where.lu = false;
      }

      if (!this.models.Notification) {
        return { notifications: [], total: 0 };
      }

      const notifications = await this.models.Notification.findAndCountAll({
        where,
        order: [['date_creation', 'DESC']],
        limit,
        offset,
        include: [
          { 
            model: this.models.Evenement, 
            attributes: ['id_evenement', 'nom_evenement'],
            required: false 
          }
        ]
      });

      return {
        notifications: notifications.rows,
        total: notifications.count,
        nonLues: await this.models.Notification.count({ where: { ...where, lu: false } })
      };

    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  // Marquer les notifications comme lues
  async marquerNotificationsLues(userId, notificationIds = null) {
    try {
      if (!this.models.Notification) return;

      const where = { id_user: userId };
      if (notificationIds) {
        where.id_notification = { [Op.in]: notificationIds };
      }

      await this.models.Notification.update(
        { lu: true, date_lecture: new Date() },
        { where }
      );

      console.log(`✅ Notifications marquées comme lues pour user ${userId}`);

    } catch (error) {
      console.error('❌ Erreur marquage notifications:', error);
    }
  }

  // Obtenir les préférences de notification d'un utilisateur
  async getPreferencesNotification(userId) {
    try {
      const user = await this.models.User.findByPk(userId, {
        attributes: ['notifications_actives', 'notifications_email', 'notifications_sms']
      });

      return {
        actives: user?.notifications_actives ?? true,
        email: user?.notifications_email ?? true,
        sms: user?.notifications_sms ?? false
      };

    } catch (error) {
      console.error('❌ Erreur récupération préférences:', error);
      return { actives: true, email: true, sms: false };
    }
  }
}

module.exports = NotificationService;