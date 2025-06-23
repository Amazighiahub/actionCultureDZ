
// config/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuration de connexion à la base de données
const createDatabaseConnection = (config = {}) => {
  const {
    database = process.env.DB_NAME || 'actionculture',
    username = process.env.DB_USER || 'root',
    password = process.env.DB_PASSWORD || 'root',
    host = process.env.DB_HOST || 'localhost',
    port = parseInt(process.env.DB_PORT) || 3306,
    dialect = process.env.DB_DIALECT || 'mysql',
    logging = process.env.NODE_ENV === 'development' ? console.log : false,
    ...otherOptions
  } = config;

  const sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect,
    logging,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true,
    },
    timezone: '+00:00',
    ...otherOptions
  });

  return sequelize;
};

// Créer la base de données si elle n'existe pas
const createDatabase = async (config = {}) => {
  const {
    database = process.env.DB_NAME || 'actionculture',
    username = process.env.DB_USER || 'root',
    password = process.env.DB_PASSWORD || '',
    host = process.env.DB_HOST || 'localhost',
    port = parseInt(process.env.DB_PORT) || 3306,
    charset = 'utf8mb4',
    collate = 'utf8mb4_unicode_ci'
  } = config;

  // Connexion sans spécifier de base de données
  const sequelize = new Sequelize('', username, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false
  });

  try {
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET ${charset} COLLATE ${collate};`);
    console.log(`✅ Base de données '${database}' créée ou existe déjà.`);
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la base de données:', error);
    await sequelize.close();
    throw error;
  }
};

module.exports = {
  createDatabaseConnection,
  createDatabase
};