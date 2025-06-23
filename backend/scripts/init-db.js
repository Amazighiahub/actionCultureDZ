// Script pour initialiser ou réinitialiser la base de données
const { initializeDatabase, resetDatabase } = require('../models/database-init');

const command = process.argv[2];

async function run() {
  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initialisation de la base de données...');
        await initializeDatabase();
        break;
        
      case 'reset':
        console.log('⚠️  Réinitialisation complète de la base de données...');
        const response = process.argv[3];
        if (response !== '--force') {
          console.log('Pour confirmer, utilisez: npm run db:reset -- --force');
          process.exit(1);
        }
        await resetDatabase();
        break;
        
      default:
        console.log('Usage:');
        console.log('  npm run db:init    - Initialiser la base de données');
        console.log('  npm run db:reset   - Réinitialiser complètement la BD');
        process.exit(1);
    }
    
    console.log('✅ Opération terminée avec succès');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

run();