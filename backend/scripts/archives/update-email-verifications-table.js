// Script pour mettre à jour la table email_verifications
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

async function updateTable() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie');

    // Vérifier si la table existe
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'email_verifications'
    `);

    if (tables.length === 0) {
      console.log('📝 Création de la table email_verifications...');
      await sequelize.query(`
        CREATE TABLE email_verifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_user INT NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          type ENUM('email_verification', 'password_reset', 'email_change') DEFAULT 'email_verification',
          expires_at DATETIME NOT NULL,
          used_at DATETIME NULL,
          metadata JSON NULL COMMENT 'Données additionnelles (ex: nouvel email pour email_change)',
          ip_address VARCHAR(45) NULL COMMENT 'IP de création du token',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token (token),
          INDEX idx_user_type (id_user, type),
          INDEX idx_expires (expires_at),
          FOREIGN KEY (id_user) REFERENCES user(id_user) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table créée avec succès');
    } else {
      console.log('📝 La table existe, vérification des colonnes...');

      // Vérifier et ajouter la colonne metadata
      const [metadataCol] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'email_verifications'
        AND COLUMN_NAME = 'metadata'
      `);

      if (metadataCol.length === 0) {
        console.log('🔄 Ajout de la colonne metadata...');
        await sequelize.query(`
          ALTER TABLE email_verifications
          ADD COLUMN metadata JSON NULL COMMENT 'Données additionnelles'
        `);
        console.log('✅ Colonne metadata ajoutée');
      } else {
        console.log('⚠️  Colonne metadata existe déjà');
      }

      // Vérifier et ajouter la colonne ip_address
      const [ipCol] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'email_verifications'
        AND COLUMN_NAME = 'ip_address'
      `);

      if (ipCol.length === 0) {
        console.log('🔄 Ajout de la colonne ip_address...');
        await sequelize.query(`
          ALTER TABLE email_verifications
          ADD COLUMN ip_address VARCHAR(45) NULL COMMENT 'IP de création du token'
        `);
        console.log('✅ Colonne ip_address ajoutée');
      } else {
        console.log('⚠️  Colonne ip_address existe déjà');
      }

      // Vérifier si 'email_change' est dans l'ENUM
      const [typeCol] = await sequelize.query(`
        SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'email_verifications'
        AND COLUMN_NAME = 'type'
      `);

      if (typeCol.length > 0 && !typeCol[0].COLUMN_TYPE.includes('email_change')) {
        console.log('🔄 Mise à jour de l\'ENUM type...');
        await sequelize.query(`
          ALTER TABLE email_verifications
          MODIFY COLUMN type ENUM('email_verification', 'password_reset', 'email_change') DEFAULT 'email_verification'
        `);
        console.log('✅ ENUM mis à jour');
      } else {
        console.log('⚠️  ENUM type déjà à jour');
      }
    }

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

updateTable();
