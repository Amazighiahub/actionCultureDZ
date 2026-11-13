/**
 * Configuration Sequelize CLI
 * Ce fichier résout les variables d'environnement pour les migrations
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'actionculture',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '0'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000')
    }
  },
  test: {
    username: process.env.DB_USER_TEST || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME_TEST || 'actionculture_test',
    host: process.env.DB_HOST_TEST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false
  },
  production: {
    // Migrations : compte qui peut créer et modifier les tables ; le site tourne avec DB_USER, qui peut
    // n'avoir que les droits sur les lignes (audit V11 BDD-20). Sans DB_MIGRATE_*, DB_USER comme avant.
    username: process.env.DB_MIGRATE_USER || process.env.DB_USER,
    password: process.env.DB_MIGRATE_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000')
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
      } : undefined
    }
  }
};
