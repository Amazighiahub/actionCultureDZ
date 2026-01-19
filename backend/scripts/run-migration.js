// Script pour exécuter la migration typePatrimoine
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log
  }
);

async function runMigration() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie');

    // Vérifier si la colonne existe déjà
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'lieu'
      AND COLUMN_NAME = 'typePatrimoine'
    `);

    if (results.length > 0) {
      console.log('⚠️  La colonne typePatrimoine existe déjà');
      process.exit(0);
    }

    console.log('🔄 Ajout de la colonne typePatrimoine...');

    // Ajouter la colonne avec ENUM
    await sequelize.query(`
      ALTER TABLE lieu
      ADD COLUMN typePatrimoine ENUM(
        'ville_village',
        'monument',
        'musee',
        'site_archeologique',
        'site_naturel',
        'edifice_religieux',
        'palais_forteresse',
        'autre'
      ) NOT NULL DEFAULT 'monument'
      COMMENT 'Type de patrimoine pour adapter les fonctionnalités affichées'
    `);

    console.log('✅ Colonne typePatrimoine ajoutée');

    // Ajouter l'index
    console.log('🔄 Ajout de l\'index...');
    await sequelize.query(`
      CREATE INDEX idx_lieu_type_patrimoine ON lieu (typePatrimoine)
    `);
    console.log('✅ Index créé');

    console.log('🎉 Migration terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.original) {
      console.error('Détails:', error.original.message);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runMigration();
