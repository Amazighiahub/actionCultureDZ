/**
 * API Versioning Middleware
 * Gère le versioning de l'API via URL ou header
 */

const API_VERSIONS = {
  v1: {
    supported: true,
    deprecated: false,
    deprecationDate: null
  },
  v2: {
    supported: true,
    deprecated: false,
    deprecationDate: null
  }
};

const DEFAULT_VERSION = 'v1';
const CURRENT_VERSION = 'v1';

/**
 * Middleware pour extraire et valider la version de l'API
 */
function apiVersionMiddleware(req, res, next) {
  // 1. Version depuis l'URL: /api/v1/users, /api/v2/users
  let version = null;

  // Extraire la version de l'URL
  const versionMatch = req.path.match(/^\/v(\d+)\//);
  if (versionMatch) {
    version = `v${versionMatch[1]}`;
  }

  // 2. Version depuis le header Accept-Version
  if (!version && req.headers['accept-version']) {
    version = req.headers['accept-version'];
  }

  // 3. Version depuis le header X-API-Version (alternative)
  if (!version && req.headers['x-api-version']) {
    version = req.headers['x-api-version'];
  }

  // 4. Utiliser la version par défaut
  if (!version) {
    version = DEFAULT_VERSION;
  }

  // Normaliser la version
  if (!version.startsWith('v')) {
    version = `v${version}`;
  }

  // Vérifier si la version est supportée
  const versionInfo = API_VERSIONS[version];

  if (!versionInfo || !versionInfo.supported) {
    return res.status(400).json({
      success: false,
      error: 'Version API non supportée',
      supportedVersions: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].supported),
      currentVersion: CURRENT_VERSION
    });
  }

  // Avertir si déprécié
  if (versionInfo.deprecated) {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecation-Date', versionInfo.deprecationDate || 'Unknown');
    res.setHeader('X-API-Sunset', versionInfo.sunsetDate || 'Unknown');
  }

  // Ajouter les headers de version
  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Current-Version', CURRENT_VERSION);

  // Stocker la version dans la requête
  req.apiVersion = version;
  req.apiVersionNumber = parseInt(version.substring(1));

  next();
}

/**
 * Helper pour vérifier la version minimale requise
 */
function requireMinVersion(minVersion) {
  return (req, res, next) => {
    const minVersionNumber = typeof minVersion === 'string'
      ? parseInt(minVersion.replace('v', ''))
      : minVersion;

    if (req.apiVersionNumber < minVersionNumber) {
      return res.status(400).json({
        success: false,
        error: `Cette fonctionnalité nécessite l'API version ${minVersion} ou supérieure`,
        currentRequestVersion: req.apiVersion
      });
    }

    next();
  };
}

/**
 * Helper pour réponses versionnées
 */
function versionedResponse(req, responses) {
  const version = req.apiVersion || DEFAULT_VERSION;

  if (responses[version]) {
    return responses[version];
  }

  // Fallback vers la version la plus récente disponible
  const availableVersions = Object.keys(responses).sort().reverse();
  for (const v of availableVersions) {
    if (v <= version) {
      return responses[v];
    }
  }

  return responses[DEFAULT_VERSION] || responses[Object.keys(responses)[0]];
}

/**
 * Route d'information sur les versions
 */
function getApiVersionsInfo(req, res) {
  res.json({
    success: true,
    data: {
      currentVersion: CURRENT_VERSION,
      defaultVersion: DEFAULT_VERSION,
      versions: Object.entries(API_VERSIONS).map(([version, info]) => ({
        version,
        ...info
      })),
      usage: {
        url: 'Utilisez /api/v1/... ou /api/v2/...',
        header: 'Ou ajoutez le header Accept-Version: v1'
      }
    }
  });
}

module.exports = {
  apiVersionMiddleware,
  requireMinVersion,
  versionedResponse,
  getApiVersionsInfo,
  API_VERSIONS,
  DEFAULT_VERSION,
  CURRENT_VERSION
};
