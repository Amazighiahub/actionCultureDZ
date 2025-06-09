// services/uploadCronJob.js - Tâches planifiées pour les uploads
const cron = require('node-cron');
const uploadService = require('./uploadService');

class UploadCronJob {
  constructor() {
    this.jobs = [];
  }

  // Démarrer toutes les tâches
  start() {
    console.log('⏰ Démarrage des tâches planifiées pour les uploads...');

    // Nettoyer les fichiers temporaires tous les jours à 3h du matin
    const cleanTempJob = cron.schedule('0 3 * * *', async () => {
      console.log('🧹 Nettoyage automatique des fichiers temporaires...');
      try {
        await uploadService.cleanTempFiles(24);
        console.log('✅ Nettoyage terminé');
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Algiers" // Fuseau horaire de l'Algérie
    });

    this.jobs.push(cleanTempJob);

    // Rapport hebdomadaire des statistiques (tous les lundis à 9h)
    const statsJob = cron.schedule('0 9 * * 1', () => {
      console.log('📊 Rapport hebdomadaire des uploads:');
      const stats = uploadService.getUploadStats();
      
      let totalFiles = 0;
      let totalSize = 0;

      Object.entries(stats).forEach(([type, data]) => {
        console.log(`\n${type.toUpperCase()}:`);
        console.log(`  - Fichiers: ${data.count}`);
        console.log(`  - Taille: ${data.totalSizeMB} MB`);
        totalFiles += data.count;
        totalSize += parseFloat(data.totalSizeMB);
      });

      console.log(`\nTOTAL:`);
      console.log(`  - Fichiers: ${totalFiles}`);
      console.log(`  - Taille: ${totalSize.toFixed(2)} MB`);
    }, {
      scheduled: true,
      timezone: "Africa/Algiers"
    });

    this.jobs.push(statsJob);

    console.log('✅ Tâches planifiées activées');
  }

  // Arrêter toutes les tâches
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('⏹️ Tâches planifiées arrêtées');
  }

  // Exécuter manuellement le nettoyage
  async cleanNow(hours = 24) {
    console.log(`🧹 Nettoyage manuel des fichiers de plus de ${hours} heures...`);
    await uploadService.cleanTempFiles(hours);
    console.log('✅ Nettoyage manuel terminé');
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