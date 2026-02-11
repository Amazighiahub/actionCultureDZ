// seed-geography.js - Seed des wilayas, dairas et communes depuis algeria_cities.json
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'actionculture',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false
  }
);

// Charger les données JSON
const algeriaData = require('../algeria_cities.json');

// Charger les modèles
const Wilaya = require('../models/geography/Wilaya')(sequelize);
const Daira = require('../models/geography/Daira')(sequelize);
const Commune = require('../models/geography/Commune')(sequelize);

async function seedGeography() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🗺️  SEED GÉOGRAPHIE - WILAYAS, DAIRAS, COMMUNES      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connexion établie!\n');

    // Extraire les wilayas uniques
    const wilayasMap = new Map();
    const dairasMap = new Map();

    algeriaData.forEach(item => {
      // Wilayas
      const wilayaKey = item.wilaya_code;
      if (!wilayasMap.has(wilayaKey)) {
        wilayasMap.set(wilayaKey, {
          codeW: parseInt(item.wilaya_code),
          nom: item.wilaya_name,
          wilaya_name_ascii: item.wilaya_name_ascii
        });
      }

      // Dairas (clé unique: wilaya_code + daira_name_ascii)
      const dairaKey = `${item.wilaya_code}_${item.daira_name_ascii}`;
      if (!dairasMap.has(dairaKey)) {
        dairasMap.set(dairaKey, {
          nom: item.daira_name,
          daira_name_ascii: item.daira_name_ascii,
          wilaya_code: item.wilaya_code
        });
      }
    });

    // ========== ÉTAPE 1: Seed des Wilayas ==========
    console.log('🏛️  Insertion des wilayas...');
    const wilayaIdMap = {}; // codeW -> id_wilaya

    for (const [code, wilaya] of wilayasMap) {
      const [record, created] = await Wilaya.findOrCreate({
        where: { codeW: wilaya.codeW },
        defaults: wilaya
      });
      wilayaIdMap[wilaya.codeW] = record.id_wilaya;
      if (created) {
        console.log(`  ✅ ${wilaya.wilaya_name_ascii} (${wilaya.codeW})`);
      }
    }
    console.log(`  📊 Total: ${wilayasMap.size} wilayas\n`);

    // ========== ÉTAPE 2: Seed des Dairas ==========
    console.log('🏘️  Insertion des dairas...');
    const dairaIdMap = {}; // wilaya_code_daira_name_ascii -> id_daira
    let dairaCount = 0;

    for (const [key, daira] of dairasMap) {
      const wilayaId = wilayaIdMap[parseInt(daira.wilaya_code)];
      if (!wilayaId) {
        console.log(`  ⚠️  Wilaya non trouvée pour daira: ${daira.daira_name_ascii}`);
        continue;
      }

      const [record, created] = await Daira.findOrCreate({
        where: { 
          daira_name_ascii: daira.daira_name_ascii,
          wilayaId: wilayaId
        },
        defaults: {
          nom: daira.nom,
          daira_name_ascii: daira.daira_name_ascii,
          wilayaId: wilayaId
        }
      });
      dairaIdMap[key] = record.id_daira;
      if (created) dairaCount++;
    }
    console.log(`  📊 Total: ${dairaCount} dairas créées\n`);

    // ========== ÉTAPE 3: Seed des Communes ==========
    console.log('🏠 Insertion des communes...');
    let communeCount = 0;

    for (const item of algeriaData) {
      const dairaKey = `${item.wilaya_code}_${item.daira_name_ascii}`;
      const dairaId = dairaIdMap[dairaKey];

      if (!dairaId) {
        console.log(`  ⚠️  Daira non trouvée pour commune: ${item.commune_name_ascii}`);
        continue;
      }

      const [record, created] = await Commune.findOrCreate({
        where: { 
          commune_name_ascii: item.commune_name_ascii,
          dairaId: dairaId
        },
        defaults: {
          nom: item.commune_name,
          commune_name_ascii: item.commune_name_ascii,
          dairaId: dairaId
        }
      });
      if (created) communeCount++;
    }
    console.log(`  📊 Total: ${communeCount} communes créées\n`);

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           ✅ SEED GÉOGRAPHIE TERMINÉ AVEC SUCCÈS         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${wilayasMap.size} wilayas`);
    console.log(`   - ${dairasMap.size} dairas`);
    console.log(`   - ${algeriaData.length} communes\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 Connexion fermée');
  }
}

seedGeography();
