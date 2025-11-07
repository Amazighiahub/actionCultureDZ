
const fs = require('fs');
const { Sequelize } = require('sequelize');

// Utilitaires 
const required = (name, val) => {
  if (val === undefined || val === null || val === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return val;
};
const isValidIdentifier = (s) => typeof s === 'string' && /^[A-Za-z0-9_$]+$/.test(s);

// -----------------------------
// Connexion applicative (runtime)
// -----------------------------
const createDatabaseConnection = (config = {}) => {
  const {
    database = required('DB_NAME', process.env.DB_NAME),
    username = required('DB_USER', process.env.DB_USER),
    password = required('DB_PASSWORD', process.env.DB_PASSWORD),
    host     = required('DB_HOST', process.env.DB_HOST),
    port     = parseInt(process.env.DB_PORT || '3306', 10), 
    dialect  = process.env.DB_DIALECT || 'mysql',
    logging  = process.env.NODE_ENV === 'development' ? console.log : false,
    ssl      = process.env.DB_SSL === 'true',
    caPath   = process.env.DB_SSL_CA, // optionnel: chemin CA PEM
    ...otherOptions
  } = config;

  const dialectOptions = {
    charset: 'utf8mb4',
    dateStrings: true,
    typeCast: true,
  };

  if (ssl) {
    dialectOptions.ssl = { require: true, rejectUnauthorized: true };
    if (caPath && fs.existsSync(caPath)) {
      dialectOptions.ssl.ca = fs.readFileSync(caPath, 'utf8');
    }
  }

  return new Sequelize(database, username, password, {
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
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions,
    timezone: '+00:00',
    ...otherOptions,
  });
};

// ---------------------------------------------------
// ensureDatabase: crée la DB si absente & aligne charset
// ---------------------------------------------------
const ensureDatabase = async (sequelizeAdmin, {
  database,
  charset = 'utf8mb4',
  collate = 'utf8mb4_unicode_ci',
}) => {
  if (!isValidIdentifier(database)) {
    throw new Error('Invalid database name (allowed: letters, digits, _, $)');
  }

  await sequelizeAdmin.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET ${charset} COLLATE ${collate};`
  );

  const [rows] = await sequelizeAdmin.query(
    `SELECT DEFAULT_CHARACTER_SET_NAME AS charset, DEFAULT_COLLATION_NAME AS collate
     FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
    { replacements: [database] }
  );

  if (rows.length) {
    const cur = rows[0];
    if (cur.charset !== charset || cur.collate !== collate) {
      await sequelizeAdmin.query(
        `ALTER DATABASE \`${database}\` CHARACTER SET ${charset} COLLATE ${collate};`
      );
      console.log(`⚙️  DB '${database}' alignée en ${charset} / ${collate}`);
    } else {
      console.log(`✅ DB '${database}' déjà en ${charset} / ${collate}`);
    }
  }
};

// ---------------------------------------------------
// createDatabase: helper qui ouvre une connexion admin,
// appelle ensureDatabase, puis ferme proprement.
// ---------------------------------------------------
const createDatabase = async (config = {}) => {
  const database = config.database || required('DB_NAME', process.env.DB_NAME);
  const username = config.username || required('DB_ADMIN_USER', process.env.DB_USER); // admin recommandé
  const password = config.password || required('DB_ADMIN_PASSWORD', process.env.DB_PASSWORD);
  const host     = config.host     || required('DB_HOST', process.env.DB_HOST);
  const port     = parseInt(config.port || process.env.DB_PORT || '3306', 10);
  const charset  = config.charset  || 'utf8mb4';
  const collate  = config.collate  || 'utf8mb4_unicode_ci';

  const sequelizeAdmin = new Sequelize('', username, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await ensureDatabase(sequelizeAdmin, { database, charset, collate });
    return true;
  } finally {
    await sequelizeAdmin.close();
  }
};

module.exports = {
  createDatabaseConnection,
  ensureDatabase,   
  createDatabase,   
};
