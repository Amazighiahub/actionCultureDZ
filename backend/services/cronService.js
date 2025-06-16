// services/cronService.js - Service de tâches planifiées
const cron = require('node-cron');
const { Op } = require('sequelize');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.models = null;
    this.services = null;
    this.isRunning = false;
  }

  /**
   * Initialiser le service avec les modèles et services
   */
  initialize(models, services) {
    this.models = models;
    this.services = services;
    
    // Planifier toutes les tâches
    this.scheduleJobs();
    
    this.isRunning = true;
    console.log('⏰ Service de tâches planifiées initialisé');
  }

  /**
   * Planifier toutes les tâches
   */
  scheduleJobs() {
    // 1. Rappels d'événements - Toutes les heures
    this.scheduleJob('event-reminders', '0 * * * *', () => {
      this.sendEventReminders();
    });

    // 2. Nettoyage des tokens expirés - Tous les jours à 3h
    this.scheduleJob('clean-expired-tokens', '0 3 * * *', () => {
      this.cleanExpiredTokens();
    });

    // 3. Nettoyage des vieilles notifications - Tous les dimanches à 2h
    this.scheduleJob('clean-old-notifications', '0 2 * * 0', () => {
      this.cleanOldNotifications();
    });

    // 4. Calcul des statistiques - Tous les jours à 1h
    this.scheduleJob('calculate-stats', '0 1 * * *', () => {
      this.calculateDailyStats();
    });

    // 5. Newsletter hebdomadaire - Tous les lundis à 9h
    if (process.env.ENABLE_NEWSLETTER === 'true') {
      this.scheduleJob('weekly-newsletter', '0 9 * * 1', () => {
        this.sendWeeklyNewsletter();
      });
    }

    // 6. Vérification des événements à venir - Toutes les 30 minutes
    this.scheduleJob('upcoming-events-check', '*/30 * * * *', () => {
      this.checkUpcomingEvents();
    });

    // 7. Nettoyage des fichiers temporaires - Tous les jours à 4h
    this.scheduleJob('clean-temp-files', '0 4 * * *', () => {
      this.cleanTempFiles();
    });

    // 8. Mise à jour du statut des événements - Toutes les heures
    this.scheduleJob('update-event-status', '0 * * * *', () => {
      this.updateEventStatuses();
    });

    // 9. Rappel de vérification email - Tous les jours à 10h
    this.scheduleJob('email-verification-reminder', '0 10 * * *', () => {
      this.sendEmailVerificationReminders();
    });

    // 10. Archivage des anciens événements - Tous les mois le 1er à 2h
    this.scheduleJob('archive-old-events', '0 2 1 * *', () => {
      this.archiveOldEvents();
    });

    console.log(`📅 ${this.jobs.size} tâches planifiées activées`);
  }

  /**
   * Planifier une tâche
   */
  scheduleJob(name, cronExpression, taskFunction) {
    if (this.jobs.has(name)) {
      console.warn(`⚠️ Tâche "${name}" déjà planifiée`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`🔄 Exécution de la tâche: ${name}`);
      
      try {
        await taskFunction();
        console.log(`✅ Tâche "${name}" complétée`);
      } catch (error) {
        console.error(`❌ Erreur dans la tâche "${name}":`, error);
        
        // Enregistrer l'erreur dans les logs
        if (this.models?.AuditLog) {
          await this.models.AuditLog.create({
            action: 'cron_error',
            entity_type: 'cron_job',
            entity_id: name,
            details: {
              error: error.message,
              stack: error.stack
            }
          });
        }
      }
    }, {
      scheduled: false // Ne pas démarrer automatiquement
    });

    this.jobs.set(name, job);
    job.start(); // Démarrer manuellement
  }

  // ========================================================================
  // TÂCHES SPÉCIFIQUES
  // ========================================================================

  /**
   * 1. Envoyer les rappels d'événements (24h avant)
   */
  async sendEventReminders() {
    if (!this.models || !this.services?.notificationService) return;

    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    demain.setHours(0, 0, 0, 0);
    
    const apresdemain = new Date(demain);
    apresdemain.setDate(apresdemain.getDate() + 1);

    // Trouver les événements de demain
    const evenements = await this.models.Evenement.findAll({
      where: {
        date_debut: {
          [Op.gte]: demain,
          [Op.lt]: apresdemain
        },
        statut: 'publie',
        rappel_envoye: { [Op.not]: true } // Éviter les doublons
      },
      include: [
        { model: this.models.Lieu },
        { model: this.models.TypeEvenement }
      ]
    });

    console.log(`📧 ${evenements.length} événements à rappeler`);

    for (const evenement of evenements) {
      try {
        // Envoyer les rappels via NotificationService
        await this.services.notificationService.envoyerRappelEvenement(evenement.id_evenement);
        
        // Marquer comme envoyé
        await evenement.update({ rappel_envoye: true });
        
      } catch (error) {
        console.error(`Erreur rappel événement ${evenement.id_evenement}:`, error);
      }
    }
  }

  /**
   * 2. Nettoyer les tokens expirés
   */
  async cleanExpiredTokens() {
    if (!this.models?.EmailVerification) return;

    const result = await this.models.EmailVerification.destroy({
      where: {
        [Op.or]: [
          {
            expires_at: {
              [Op.lt]: new Date()
            }
          },
          {
            used_at: {
              [Op.ne]: null
            }
          }
        ]
      }
    });

    console.log(`🧹 ${result} tokens expirés supprimés`);
  }

  /**
   * 3. Nettoyer les vieilles notifications
   */
  async cleanOldNotifications() {
    if (!this.models?.Notification) return;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - (process.env.NOTIFICATION_RETENTION_DAYS || 90));

    const result = await this.models.Notification.destroy({
      where: {
        date_creation: {
          [Op.lt]: dateLimit
        },
        lu: true // Ne supprimer que les notifications lues
      }
    });

    console.log(`🧹 ${result} notifications anciennes supprimées`);
  }

  /**
   * 4. Calculer les statistiques quotidiennes
   */
  async calculateDailyStats() {
    if (!this.models) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Nouveaux utilisateurs aujourd'hui
      const newUsers = await this.models.User.count({
        where: {
          date_creation: {
            [Op.gte]: today
          }
        }
      });

      // Nouvelles œuvres
      const newOeuvres = await this.models.Oeuvre?.count({
        where: {
          date_creation: {
            [Op.gte]: today
          }
        }
      }) || 0;

      // Nouveaux événements
      const newEvents = await this.models.Evenement?.count({
        where: {
          date_creation: {
            [Op.gte]: today
          }
        }
      }) || 0;

      // Enregistrer les stats
      if (this.models.DailyStats) {
        await this.models.DailyStats.create({
          date: today,
          new_users: newUsers,
          new_oeuvres: newOeuvres,
          new_events: newEvents,
          active_users: await this.getActiveUsersCount(today)
        });
      }

      console.log(`📊 Stats du jour: ${newUsers} users, ${newOeuvres} œuvres, ${newEvents} événements`);
      
    } catch (error) {
      console.error('Erreur calcul stats:', error);
    }
  }

  /**
   * 5. Envoyer la newsletter hebdomadaire
   */
  async sendWeeklyNewsletter() {
    if (!this.models || !this.services?.emailQueueService) return;

    // Récupérer les utilisateurs inscrits à la newsletter
    const users = await this.models.User.findAll({
      where: {
        accepte_newsletter: true,
        statut: 'actif',
        email_verifie: true
      },
      attributes: ['id_user', 'email', 'nom', 'prenom']
    });

    if (users.length === 0) return;

    // Récupérer le contenu de la semaine
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [newEvents, newOeuvres] = await Promise.all([
      this.models.Evenement.findAll({
        where: {
          date_creation: { [Op.gte]: lastWeek },
          statut: 'publie'
        },
        limit: 5,
        order: [['date_creation', 'DESC']]
      }),
      this.models.Oeuvre?.findAll({
        where: {
          date_creation: { [Op.gte]: lastWeek },
          statut: 'publie'
        },
        limit: 5,
        order: [['date_creation', 'DESC']]
      }) || []
    ]);

    // Préparer le template
    const template = {
      subject: '📰 Votre newsletter Action Culture',
      text: `Découvrez les nouveautés de la semaine sur Action Culture...`,
      html: this.generateNewsletterHtml(newEvents, newOeuvres)
    };

    // Préparer les emails
    const emails = users.map(user => ({
      to: user.email,
      data: {
        nom: user.nom,
        prenom: user.prenom
      }
    }));

    // Envoyer via la queue
    await this.services.emailQueueService.addBulkEmails(emails, template);

    console.log(`📮 Newsletter envoyée à ${users.length} abonnés`);
  }

  /**
   * 6. Vérifier les événements à venir
   */
  async checkUpcomingEvents() {
    if (!this.models) return;

    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    // Événements qui commencent dans l'heure
    const upcomingEvents = await this.models.Evenement.findAll({
      where: {
        date_debut: {
          [Op.between]: [now, inOneHour]
        },
        statut: 'publie',
        rappel_derniere_minute: { [Op.not]: true }
      }
    });

    for (const event of upcomingEvents) {
      // Envoyer une notification aux participants
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: event.id_evenement,
          statut_participation: 'confirme'
        },
        include: [{ model: this.models.User }]
      });

      for (const participant of participants) {
        await this.models.Notification.create({
          id_user: participant.id_user,
          type_notification: 'rappel_evenement',
          titre: 'Événement dans 1 heure !',
          message: `L'événement "${event.nom_evenement}" commence dans 1 heure`,
          id_evenement: event.id_evenement,
          priorite: 'urgente'
        });
      }

      await event.update({ rappel_derniere_minute: true });
    }
  }

  /**
   * 7. Nettoyer les fichiers temporaires
   */
  async cleanTempFiles() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const tempDir = process.env.UPLOAD_TEMP_DIR || 'uploads/temp';
    
    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ Fichier temporaire supprimé: ${file}`);
        }
      }
    } catch (error) {
      console.error('Erreur nettoyage fichiers temp:', error);
    }
  }

  /**
   * 8. Mettre à jour le statut des événements
   */
  async updateEventStatuses() {
    if (!this.models?.Evenement) return;

    const now = new Date();

    // Passer les événements terminés en "terminé"
    await this.models.Evenement.update(
      { statut: 'termine' },
      {
        where: {
          date_fin: { [Op.lt]: now },
          statut: 'publie'
        }
      }
    );

    // Passer les événements qui commencent en "en_cours"
    await this.models.Evenement.update(
      { statut: 'en_cours' },
      {
        where: {
          date_debut: { [Op.lte]: now },
          date_fin: { [Op.gte]: now },
          statut: 'publie'
        }
      }
    );
  }

  /**
   * 9. Rappel de vérification email
   */
  async sendEmailVerificationReminders() {
    if (!this.models || !this.services?.emailService) return;

    // Utilisateurs non vérifiés depuis plus de 3 jours
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const unverifiedUsers = await this.models.User.findAll({
      where: {
        email_verifie: false,
        date_creation: { [Op.lte]: threeDaysAgo },
        rappel_verification_envoye: { [Op.not]: true }
      },
      limit: 100
    });

    for (const user of unverifiedUsers) {
      try {
        // Créer un nouveau token
        const token = await this.models.EmailVerification.createVerificationToken(user.id_user);
        
        // Envoyer l'email
        await this.services.emailService.sendEmail(
          user.email,
          '🔔 Rappel : Vérifiez votre email',
          `Bonjour ${user.prenom},\n\nN'oubliez pas de vérifier votre email pour profiter pleinement d'Action Culture.\n\nCliquez ici : ${process.env.BASE_URL}/verify-email/${token.token}`
        );
        
        await user.update({ rappel_verification_envoye: true });
        
      } catch (error) {
        console.error(`Erreur rappel vérification pour ${user.email}:`, error);
      }
    }

    console.log(`📧 ${unverifiedUsers.length} rappels de vérification envoyés`);
  }

  /**
   * 10. Archiver les anciens événements
   */
  async archiveOldEvents() {
    if (!this.models?.Evenement) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await this.models.Evenement.update(
      { statut: 'archive' },
      {
        where: {
          date_fin: { [Op.lt]: sixMonthsAgo },
          statut: 'termine'
        }
      }
    );

    console.log(`📦 ${result[0]} événements archivés`);
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  /**
   * Obtenir le nombre d'utilisateurs actifs
   */
  async getActiveUsersCount(date) {
    return await this.models.User.count({
      where: {
        derniere_connexion: {
          [Op.gte]: date
        }
      }
    });
  }

  /**
   * Générer le HTML de la newsletter
   */
  generateNewsletterHtml(events, oeuvres) {
    // Template HTML simple pour la newsletter
    return `
      <h2>Les nouveautés de la semaine</h2>
      <h3>Nouveaux événements</h3>
      <ul>
        ${events.map(e => `<li>${e.nom_evenement}</li>`).join('')}
      </ul>
      <h3>Nouvelles œuvres</h3>
      <ul>
        ${oeuvres.map(o => `<li>${o.titre}</li>`).join('')}
      </ul>
    `;
  }

  // ========================================================================
  // GESTION DU SERVICE
  // ========================================================================

  /**
   * Arrêter une tâche spécifique
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      console.log(`⏹️ Tâche "${name}" arrêtée`);
      return true;
    }
    return false;
  }

  /**
   * Redémarrer une tâche
   */
  startJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      console.log(`▶️ Tâche "${name}" redémarrée`);
      return true;
    }
    return false;
  }

  /**
   * Exécuter une tâche manuellement
   */
  async runJob(name) {
    const jobName = name.replace(/-/g, '_');
    const methodName = jobName.charAt(0).toLowerCase() + jobName.slice(1);
    
    if (typeof this[methodName] === 'function') {
      console.log(`🔄 Exécution manuelle de: ${name}`);
      await this[methodName]();
      return true;
    }
    
    console.error(`❌ Tâche "${name}" non trouvée`);
    return false;
  }

  /**
   * Obtenir le statut des tâches
   */
  getStatus() {
    const status = {
      running: this.isRunning,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running !== false
      };
    });

    return status;
  }

  /**
   * Arrêter toutes les tâches
   */
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Tâche "${name}" arrêtée`);
    });
    
    this.isRunning = false;
    console.log('⏹️ Service de tâches planifiées arrêté');
  }

  /**
   * Redémarrer toutes les tâches
   */
  startAll() {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`▶️ Tâche "${name}" démarrée`);
    });
    
    this.isRunning = true;
    console.log('▶️ Service de tâches planifiées redémarré');
  }
}

// Singleton
const cronService = new CronService();

module.exports = cronService;