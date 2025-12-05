const { Sequelize } = require('sequelize');

// Configuration pour chaque environnement
const config = {
  development: {
    username: 'root',
    password: 'root',
    database: 'actionculture',
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: 'root',
    password: 'root',
    database: 'actionculture_test',
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'actionculture',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false
  }
};

// Fonction pour créer la connexion à la base de données
const createDatabaseConnection = (env = 'development') => {
  const dbConfig = config[env];
  
  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      define: dbConfig.define || {},
      pool: dbConfig.pool || {}
    }
  );

  return sequelize;
};

// Fonction pour créer la base de données si elle n'existe pas
const createDatabase = async (env = 'development') => {
  const dbConfig = config[env];
  
  // Connexion sans spécifier de base de données
  const sequelize = new Sequelize('', dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: false
  });

  try {
    // Créer la base de données si elle n'existe pas
    await sequelize.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`✅ Base de données '${dbConfig.database}' créée ou existe déjà.`);
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la base de données:', error);
    await sequelize.close();
    throw error;
  }
};

// Export par défaut de la configuration
module.exports = config;

// Export nommé des fonctions
module.exports.createDatabase = createDatabase;
module.exports.createDatabaseConnection = createDatabaseConnection;
module.exports.config = config;