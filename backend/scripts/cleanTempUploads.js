// backend/cleanTempUploads.js - Script de nettoyage des uploads temporaires
require('dotenv').config();
const uploadService = require('./services/uploadService');

console.log('🧹 Nettoyage des fichiers temporaires...\n');

// Paramètres
const hoursOld = process.argv[2] ? parseInt(process.argv[2]) : 24;

console.log(`Suppression des fichiers de plus de ${hoursOld} heures...\n`);

// Exécuter le nettoyage
uploadService.cleanTempFiles(hoursOld);

console.log('\n✅ Nettoyage terminé !');

// Afficher les stats après nettoyage
console.log('\n📊 Statistiques après nettoyage:');
const stats = uploadService.getUploadStats();
Object.entries(stats).forEach(([type, data]) => {
  console.log(`\n${type}:`);
  console.log(`  - Fichiers: ${data.count}`);
  console.log(`  - Taille: ${data.totalSizeMB} MB`);
});