// scripts/sync-bdd.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { createDatabaseConnection } = require('../config/database');
const { loadModels, initializeAssociations, insertDefaultData } = require('../models'); // <- ton index

(async () => {
  const sequelize = createDatabaseConnection();

  try {
    await sequelize.authenticate();
    console.log('✅ Connexion OK');

    // 1) Charger les modèles via ton index
    const models = loadModels(sequelize);

    const names = Object.keys(sequelize.models);
    console.log('📦 Modèles chargés:', names.length ? names.join(', ') : '(aucun)');
    if (!names.length) throw new Error("Aucun modèle n'a été enregistré.");

    // 2) Associer
    initializeAssociations(models);

    // 3) Sync en fonction de la variable d'env
    const mode = (process.env.DB_SYNC_MODE || 'alter').toLowerCase();
    if (mode === 'force') {
      console.warn('⚠️  DB sync mode = FORCE → DROP & CREATE');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await sequelize.sync({ force: true, logging: console.log });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } else if (mode === 'alter') {
      console.log('🔧 DB sync mode = ALTER');
      await sequelize.sync({ alter: true, logging: console.log });
    } else {
      console.log('ℹ️ DB sync mode = NONE');
    }

    // 4) (Optionnel) Seeds/données par défaut si tu veux remplir
    if (process.env.SEED_DEFAULTS === '1') {
      await insertDefaultData(models);
      console.log('🌱 Données par défaut insérées.');
    }

    console.log('✅ Base synchronisée.');
  } catch (err) {
    console.error('❌ Sync échouée:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
