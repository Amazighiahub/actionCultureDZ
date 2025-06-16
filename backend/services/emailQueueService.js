// services/emailQueueService.js - Service de queue pour emails avec retry
const Bull = require('bull');
const emailService = require('./emailService');

class EmailQueueService {
  constructor() {
    this.queues = {};
    this.isInitialized = false;
    this.redisConfig = this.getRedisConfig();
  }

  /**
   * Obtenir la configuration Redis selon l'environnement
   */
  getRedisConfig() {
    // En développement avec redis-memory-server
    if (process.env.NODE_ENV === 'development' && process.env.USE_REDIS_MEMORY === 'true') {
      return {
        redis: {
          host: 'localhost',
          port: 6380, // Port différent pour redis-memory-server
          maxRetriesPerRequest: 1,
          enableReadyCheck: false
        }
      };
    }

    // Configuration normale Redis
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      return redisUrl;
    }

    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3
      }
    };
  }

  /**
   * Initialiser les queues
   */
  async initialize() {
    try {
      // Queue principale pour les emails
      this.queues.email = new Bull('email-queue', this.redisConfig);
      
      // Queue pour les notifications
      this.queues.notification = new Bull('notification-queue', this.redisConfig);
      
      // Queue pour les emails en masse (newsletter)
      this.queues.bulk = new Bull('bulk-email-queue', this.redisConfig);

      // Configurer les processeurs
      this.setupProcessors();
      
      // Configurer les événements
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('✅ Service de queue email initialisé');
      
    } catch (error) {
      console.error('❌ Erreur initialisation queue:', error);
      // En cas d'échec, on peut continuer sans queue
      this.isInitialized = false;
    }
  }

  /**
   * Configurer les processeurs de jobs
   */
  setupProcessors() {
    // Processeur pour emails simples
    this.queues.email.process('send-email', async (job) => {
      const { to, subject, text, html, attachments } = job.data;
      
      console.log(`📧 Traitement email: ${subject} → ${to}`);
      
      const result = await emailService.sendEmail(to, subject, text, html, attachments);
      
      if (!result.success) {
        throw new Error(result.error || 'Échec envoi email');
      }
      
      return result;
    });

    // Processeur pour notifications avec email
    this.queues.notification.process('send-notification', async (job) => {
      const { notification, emailData } = job.data;
      
      console.log(`🔔 Traitement notification: ${notification.type}`);
      
      // Enregistrer la notification en base
      if (notification.save) {
        // La sauvegarde est gérée par NotificationService
      }
      
      // Envoyer l'email si nécessaire
      if (emailData) {
        const result = await emailService.sendEmail(
          emailData.to,
          emailData.subject,
          emailData.text,
          emailData.html
        );
        
        return { notification: true, email: result };
      }
      
      return { notification: true, email: false };
    });

    // Processeur pour emails en masse
    this.queues.bulk.process('send-bulk', 10, async (job) => {
      const { emails, template } = job.data;
      const results = [];
      
      for (const email of emails) {
        try {
          const result = await emailService.sendEmail(
            email.to,
            template.subject,
            template.text.replace(/\{\{(.*?)\}\}/g, (match, key) => email.data[key] || match),
            template.html?.replace(/\{\{(.*?)\}\}/g, (match, key) => email.data[key] || match)
          );
          
          results.push({ email: email.to, success: result.success });
          
          // Pause entre chaque envoi pour éviter le spam
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Mettre à jour la progression
          job.progress(results.length / emails.length * 100);
          
        } catch (error) {
          results.push({ email: email.to, success: false, error: error.message });
        }
      }
      
      return results;
    });
  }

  /**
   * Configurer les gestionnaires d'événements
   */
  setupEventHandlers() {
    // Pour chaque queue
    Object.entries(this.queues).forEach(([name, queue]) => {
      // Job complété
      queue.on('completed', (job, result) => {
        console.log(`✅ Job ${name} #${job.id} complété`);
      });

      // Job échoué
      queue.on('failed', (job, err) => {
        console.error(`❌ Job ${name} #${job.id} échoué:`, err.message);
        
        // Logger les détails pour debug
        if (process.env.NODE_ENV === 'development') {
          console.error('Détails du job:', job.data);
          console.error('Stack:', err.stack);
        }
      });

      // Job bloqué
      queue.on('stalled', (job) => {
        console.warn(`⚠️ Job ${name} #${job.id} bloqué`);
      });

      // Progression (pour bulk emails)
      queue.on('progress', (job, progress) => {
        console.log(`📊 Job ${name} #${job.id}: ${progress}%`);
      });
    });
  }

  // ========================================================================
  // MÉTHODES PUBLIQUES
  // ========================================================================

  /**
   * Ajouter un email à la queue
   */
  async addEmail(emailData, options = {}) {
    if (!this.isInitialized) {
      // Fallback: envoyer directement
      console.warn('⚠️ Queue non initialisée, envoi direct');
      return emailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.text,
        emailData.html,
        emailData.attachments
      );
    }

    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000 // 5 secondes
      },
      removeOnComplete: true,
      removeOnFail: false
    };

    const job = await this.queues.email.add(
      'send-email',
      emailData,
      { ...defaultOptions, ...options }
    );

    return {
      success: true,
      jobId: job.id,
      queue: 'email'
    };
  }

  /**
   * Ajouter une notification avec email optionnel
   */
  async addNotification(notificationData, emailData = null, options = {}) {
    if (!this.isInitialized) {
      // Fallback
      if (emailData) {
        await emailService.sendEmail(
          emailData.to,
          emailData.subject,
          emailData.text,
          emailData.html
        );
      }
      return { success: true };
    }

    const job = await this.queues.notification.add(
      'send-notification',
      { notification: notificationData, emailData },
      {
        attempts: emailData ? 3 : 1,
        backoff: { type: 'fixed', delay: 3000 },
        ...options
      }
    );

    return {
      success: true,
      jobId: job.id,
      queue: 'notification'
    };
  }

  /**
   * Ajouter des emails en masse (newsletter)
   */
  async addBulkEmails(emails, template, options = {}) {
    if (!this.isInitialized) {
      console.warn('⚠️ Queue non initialisée pour envoi en masse');
      return { success: false, error: 'Queue non disponible' };
    }

    // Diviser en lots de 100
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }

    const jobs = [];
    
    for (const batch of batches) {
      const job = await this.queues.bulk.add(
        'send-bulk',
        { emails: batch, template },
        {
          attempts: 2,
          backoff: { type: 'fixed', delay: 10000 },
          ...options
        }
      );
      jobs.push(job.id);
    }

    return {
      success: true,
      jobIds: jobs,
      batches: batches.length,
      totalEmails: emails.length
    };
  }

  /**
   * Ajouter un email avec priorité
   */
  async addPriorityEmail(emailData, priority = 0) {
    return this.addEmail(emailData, { priority });
  }

  /**
   * Ajouter un email programmé
   */
  async addScheduledEmail(emailData, sendAt) {
    const delay = new Date(sendAt).getTime() - Date.now();
    
    if (delay < 0) {
      throw new Error('La date d\'envoi doit être dans le futur');
    }

    return this.addEmail(emailData, { delay });
  }

  // ========================================================================
  // GESTION ET MONITORING
  // ========================================================================

  /**
   * Obtenir les statistiques des queues
   */
  async getStats() {
    if (!this.isInitialized) {
      return { initialized: false };
    }

    const stats = {
      initialized: true,
      queues: {}
    };

    for (const [name, queue] of Object.entries(this.queues)) {
      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused()
      ]);

      stats.queues[name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused
      };
    }

    return stats;
  }

  /**
   * Obtenir les jobs échoués
   */
  async getFailedJobs(queueName = 'email', limit = 10) {
    if (!this.isInitialized || !this.queues[queueName]) {
      return [];
    }

    return this.queues[queueName].getFailed(0, limit);
  }

  /**
   * Réessayer un job échoué
   */
  async retryJob(queueName, jobId) {
    if (!this.isInitialized || !this.queues[queueName]) {
      throw new Error('Queue non disponible');
    }

    const job = await this.queues[queueName].getJob(jobId);
    if (!job) {
      throw new Error('Job non trouvé');
    }

    await job.retry();
    return { success: true, jobId };
  }

  /**
   * Nettoyer les jobs complétés
   */
  async cleanCompleted(queueName = 'email', grace = 3600000) {
    if (!this.isInitialized || !this.queues[queueName]) {
      return;
    }

    await this.queues[queueName].clean(grace, 'completed');
  }

  /**
   * Mettre en pause une queue
   */
  async pauseQueue(queueName) {
    if (!this.isInitialized || !this.queues[queueName]) {
      throw new Error('Queue non disponible');
    }

    await this.queues[queueName].pause();
  }

  /**
   * Reprendre une queue
   */
  async resumeQueue(queueName) {
    if (!this.isInitialized || !this.queues[queueName]) {
      throw new Error('Queue non disponible');
    }

    await this.queues[queueName].resume();
  }

  /**
   * Vider une queue
   */
  async emptyQueue(queueName) {
    if (!this.isInitialized || !this.queues[queueName]) {
      throw new Error('Queue non disponible');
    }

    await this.queues[queueName].empty();
  }

  /**
   * Fermer toutes les queues
   */
  async close() {
    if (!this.isInitialized) return;

    await Promise.all(
      Object.values(this.queues).map(queue => queue.close())
    );

    this.isInitialized = false;
    console.log('🔌 Queues fermées');
  }
}

// Singleton
const emailQueueService = new EmailQueueService();

module.exports = emailQueueService;