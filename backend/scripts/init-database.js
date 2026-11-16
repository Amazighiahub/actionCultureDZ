// Initialiser la base de données (npm run db:init).
// 2026-11-16 : demandait '../models/database-init', qui n'existe pas (le script plantait) ; les fonctions
// sont dans ../models. La remise à zéro a un seul script, avec confirmation : npm run db:reset.
require('dotenv').config();
const { initializeDatabase } = require('../models');

async function run() {
  if (process.argv[2] !== 'init') {
    console.log('Usage :');
    console.log('  npm run db:init    - Initialiser la base de données');
    console.log('  npm run db:reset   - Réinitialiser complètement la base (demande une confirmation)');
    process.exit(1);
  }
  try {
    console.log('Initialisation de la base de données…');
    await initializeDatabase();
    console.log('Opération terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur :', error);
    process.exit(1);
  }
}

run();
