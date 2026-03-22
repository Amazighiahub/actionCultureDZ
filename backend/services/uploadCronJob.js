// services/uploadCronJob.js - Tâches planifiées pour les uploads
const logger = require('../utils/logger');
const cron = require('node-cron');
const uploadService = require('./uploadService');

class UploadCronJob {
  constructor() {
    this.jobs = [];
  }

  // Démarrer toutes les tâches
  start() {
    logger.info('⏰ Démarrage des tâches planifiées pour les uploads...');

    // Nettoyer les fichiers temporaires tous les jours à 3h du matin
    const cleanTempJob = cron.schedule('0 3 * * *', async () => {
      logger.info('🧹 Nettoyage automatique des fichiers temporaires...');
      try {
        await uploadService.cleanTempFiles(24);
        logger.info('✅ Nettoyage terminé');
      } catch (error) {
        logger.error('❌ Erreur lors du nettoyage:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Algiers" // Fuseau horaire de l'Algérie
    });

    this.jobs.push(cleanTempJob);

    // Rapport hebdomadaire des statistiques (tous les lundis à 9h)
    const statsJob = cron.schedule('0 9 * * 1', () => {
      logger.info('📊 Rapport hebdomadaire des uploads:');
      const stats = uploadService.getUploadStats();
      
      let totalFiles = 0;
      let totalSize = 0;

      Object.entries(stats).forEach(([type, data]) => {
        logger.info(`\n${type.toUpperCase()}:`);
        logger.info(`  - Fichiers: ${data.count}`);
        logger.info(`  - Taille: ${data.totalSizeMB} MB`);
        totalFiles += data.count;
        totalSize += parseFloat(data.totalSizeMB);
      });

      logger.info(`\nTOTAL:`);
      logger.info(`  - Fichiers: ${totalFiles}`);
      logger.info(`  - Taille: ${totalSize.toFixed(2)} MB`);
    }, {
      scheduled: true,
      timezone: "Africa/Algiers"
    });

    this.jobs.push(statsJob);

    logger.info('✅ Tâches planifiées activées');
  }

  // Arrêter toutes les tâches
  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('⏹️ Tâches planifiées arrêtées');
  }

  // Exécuter manuellement le nettoyage
  async cleanNow(hours = 24) {
    logger.info(`🧹 Nettoyage manuel des fichiers de plus de ${hours} heures...`);
    await uploadService.cleanTempFiles(hours);
    logger.info('✅ Nettoyage manuel terminé');
  }

  // Obtenir le statut des jobs
  getStatus() {
    return this.jobs.map((job, index) => ({
      job: index + 1,
      running: job.running || false
    }));
  }
}

// Exporter une instance unique
module.exports = new UploadCronJob();