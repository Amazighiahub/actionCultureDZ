const { Sequelize } = require('sequelize');
const os = require('os');
const logger = require('../utils/logger');

// ============================================================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT CRITIQUES
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';

// Nombre de workers cluster (PM2 ou Node cluster)
// En cluster, chaque worker crée son propre pool → diviser le budget total
const CLUSTER_WORKERS = parseInt(process.env.CLUSTER_WORKERS || process.env.PM2_INSTANCES || '1') || 1;
const EFFECTIVE_WORKERS = Math.max(1, CLUSTER_WORKERS === -1 ? os.cpus().length : CLUSTER_WORKERS);

// Seuil de requête lente en ms (configurable via env)
const SLOW_QUERY_MS = parseInt(process.env.DB_SLOW_QUERY_MS || '500');

/**
 * Logger Sequelize pour les requêtes lentes en production.
 * Logue toute requête dépassant SLOW_QUERY_MS.
 */
function slowQueryLogger(queryString, timing) {
  if (timing && timing.elapsed >= SLOW_QUERY_MS) {
    logger.warn(`🐌 Slow query (${timing.elapsed}ms): ${queryString.substring(0, 500)}`);
  }
}

// 🔒 Liste des mots de passe faibles connus à bloquer
const WEAK_PASSWORDS = [
  'root', 'admin', 'password', 'pass', '123456', '12345678',
  'qwerty', 'abc123', 'letmein', 'welcome', 'monkey', 'dragon',
  'master', 'login', 'princess', 'password1', 'Password1'
];

// Fonction de validation des credentials
const validateCredentials = (env) => {
  const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (isProduction && missing.length > 0) {
    throw new Error(
      `❌ ERREUR CRITIQUE: Variables d'environnement manquantes en production: ${missing.join(', ')}\n` +
      `Configurez ces variables dans votre fichier .env avant de démarrer en production.`
    );
  }

  // 🔒 Vérification stricte en production
  if (isProduction) {
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;

    // Utilisateur interdit
    if (dbUser === 'root' || dbUser === 'admin' || dbUser === 'sa') {
      throw new Error('❌ ERREUR CRITIQUE: Ne pas utiliser "root", "admin" ou "sa" comme DB_USER en production!');
    }

    // Vérifier les mots de passe faibles
    if (WEAK_PASSWORDS.includes(dbPassword?.toLowerCase())) {
      throw new Error('❌ ERREUR CRITIQUE: Mot de passe DB trop commun! Utilisez un mot de passe unique.');
    }

    // Longueur minimale: 16 caractères en production
    if (!dbPassword || dbPassword.length < 16) {
      throw new Error('❌ ERREUR CRITIQUE: Mot de passe DB trop court pour la production (min 16 caractères)!');
    }

    // Vérifier la complexité: au moins 1 majuscule, 1 minuscule, 1 chiffre
    const hasUppercase = /[A-Z]/.test(dbPassword);
    const hasLowercase = /[a-z]/.test(dbPassword);
    const hasNumber = /[0-9]/.test(dbPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(dbPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      throw new Error(
        '❌ ERREUR CRITIQUE: Mot de passe DB doit contenir au moins:\n' +
        '  - 1 lettre majuscule\n' +
        '  - 1 lettre minuscule\n' +
        '  - 1 chiffre\n' +
        '  Recommandé: ajoutez aussi des caractères spéciaux (!@#$%...)'
      );
    }

    // Warning si pas de caractère spécial
    if (!hasSpecial) {
      console.warn('⚠️ Recommandation: Ajoutez des caractères spéciaux à votre mot de passe DB pour plus de sécurité');
    }
  }
};

// Valider au chargement du module
validateCredentials(process.env.NODE_ENV);

// Configuration pour chaque environnement
const config = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'actionculture',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000')
    },
    dialectOptions: {
      connectTimeout: 10000
    }
  },
  test: {
    username: process.env.DB_USER_TEST || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME_TEST || 'actionculture_test',
    host: process.env.DB_HOST_TEST || process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '5'),
      min: 0
    }
  },
  production: {
    // PAS DE FALLBACKS EN PRODUCTION - Les variables DOIVENT être définies
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: slowQueryLogger,
    benchmark: true,
    pool: {
      // Budget total divisé par le nombre de workers cluster
      // Avec 4 workers et DB_POOL_MAX=50 → chaque worker max=12
      max: Math.max(5, Math.floor(parseInt(process.env.DB_POOL_MAX || '50') / EFFECTIVE_WORKERS)),
      min: Math.max(2, Math.floor(parseInt(process.env.DB_POOL_MIN || '10') / EFFECTIVE_WORKERS)),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '30000'),
      evict: parseInt(process.env.DB_POOL_EVICT || '1000')
    },
    dialectOptions: {
      connectTimeout: 10000,
      supportBigNumbers: true,
      bigNumberStrings: true,
      // SSL pour les connexions DB distantes en production
      ...(process.env.DB_SSL === 'true' ? {
        ssl: {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        }
      } : {})
    }
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
      benchmark: dbConfig.benchmark || false,
      define: dbConfig.define || {},
      pool: dbConfig.pool || {},
      dialectOptions: dbConfig.dialectOptions || {},
      retry: {
        max: parseInt(process.env.DB_RETRY_MAX || '10'),
        backoffBase: 1000,
        backoffExponent: 1.5
      }
    }
  );

  // Reconnexion automatique sur perte de connexion
  const handleDisconnect = () => {
    sequelize.authenticate()
      .then(() => logger.info('✅ Connexion DB rétablie'))
      .catch((err) => {
        logger.error(`❌ Reconnexion DB échouée: ${err.message} — nouvelle tentative dans 5s`);
        setTimeout(handleDisconnect, 5000);
      });
  };

  // Écouter les erreurs du pool de connexions
  const pool = sequelize.connectionManager.pool;
  if (pool) {
    const originalDestroy = pool._destroy;
    pool._destroy = function(resource) {
      logger.warn('⚠️ Connexion DB perdue, tentative de reconnexion...');
      handleDisconnect();
      return originalDestroy ? originalDestroy.call(this, resource) : undefined;
    };
  }

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