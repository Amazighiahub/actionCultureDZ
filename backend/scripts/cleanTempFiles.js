/**
 * Script de nettoyage des fichiers temporaires
 * Supprime les fichiers temporaires selon la rétention configurée
 * Peut être exécuté manuellement ou via un cron job
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuration
const TEMP_DIRS = [
  path.join(__dirname, '..', 'uploads', 'temp'),
  path.join(__dirname, '..', 'temp'),
  path.join(__dirname, '..', 'temp_images')
];

const RETENTION_HOURS = parseInt(process.env.TEMP_FILES_RETENTION_HOURS || '24');
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000;

/**
 * Nettoie un répertoire de fichiers temporaires
 */
async function cleanDirectory(dirPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dirPath)) {
      console.log(`✓ Répertoire inexistant: ${dirPath}`);
      return resolve(0);
    }

    fs.readdir(dirPath, (err, files) => {
      if (err) {
        console.error(`✗ Erreur lors de la lecture: ${dirPath}`, err);
        return reject(err);
      }

      let cleanedCount = 0;
      const now = Date.now();

      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        // Si le fichier est plus vieux que la rétention, le supprimer
        if (fileAge > RETENTION_MS) {
          try {
            if (stats.isDirectory()) {
              // Supprimer récursivement les répertoires
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
            console.log(
              `  ✓ Supprimé: ${file} (${Math.round(fileAge / (60 * 1000))} min)`
            );
            cleanedCount++;
          } catch (error) {
            console.error(`  ✗ Erreur suppression: ${file}`, error.message);
          }
        }
      });

      resolve(cleanedCount);
    });
  });
}

/**
 * Nettoie tous les répertoires temporaires
 */
async function cleanAllTemporaryFiles() {
  console.log(`\n🧹 Nettoyage des fichiers temporaires (rétention: ${RETENTION_HOURS}h)\n`);

  try {
    let totalCleaned = 0;

    for (const dirPath of TEMP_DIRS) {
      console.log(`📁 ${dirPath}`);
      const count = await cleanDirectory(dirPath);
      totalCleaned += count;
    }

    console.log(`\n✅ Nettoyage terminé: ${totalCleaned} fichier(s) supprimé(s)\n`);
    return totalCleaned;
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

// Exécuter si lancé directement
if (require.main === module) {
  cleanAllTemporaryFiles();
}

// Exporter pour utilisation comme module
module.exports = {
  cleanAllTemporaryFiles,
  cleanDirectory,
  TEMP_DIRS,
  RETENTION_HOURS
};
