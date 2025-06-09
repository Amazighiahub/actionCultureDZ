// config/index.ts - Export centralisé de toute la configuration

// Import explicite de ENV pour l'utiliser dans ce fichier
import ENV from './env';

// Variables d'environnement
export * from './env';
export { default as ENV } from './env';

// Configuration API
export * from './api';
export { default as API_CONFIG } from './api';

// Import des éléments nécessaires
import { 
  API_BASE_URL,
  UPLOAD_BASE_URL,
  buildApiUrl,
  buildUploadUrl,
  isLocalhost,
  getApiTimeout
} from './env';

import API_CONFIG, {
  API_ENDPOINTS,
  AUTH_CONFIG,
  RATE_LIMITS,
  PAGINATION_CONFIG,
  HTTP_STATUS,
  ERROR_MESSAGES,
  buildUrl,
  getApiUrl,
  getAuthHeaders
} from './api';

// Réexport des éléments principaux pour un accès facile
export { 
  API_BASE_URL,
  UPLOAD_BASE_URL,
  buildApiUrl,
  buildUploadUrl,
  isLocalhost,
  getApiTimeout
};

export {
  API_ENDPOINTS,
  AUTH_CONFIG,
  RATE_LIMITS,
  PAGINATION_CONFIG,
  HTTP_STATUS,
  ERROR_MESSAGES,
  buildUrl,
  getApiUrl,
  getAuthHeaders
};

// Types réexportés - CORRIGÉ : Retiré UserPermissions qui n'existe pas
export type {
  PaginationParams,
  SearchParams,
  FilterParams,
  ApiResponse,
  PaginatedApiResponse,
  ValidationError,
  ApiError,
  UserRole
} from './api';

// Configuration globale de l'application
export const APP_CONFIG = {
  // Informations de l'app
  name: ENV.APP_NAME,
  version: ENV.APP_VERSION,
  environment: ENV.IS_PRODUCTION ? 'production' : 'development',
  
  // URLs
  api: {
    base: API_BASE_URL,
    upload: UPLOAD_BASE_URL,
    timeout: getApiTimeout(),
  },
  
  // Features
  features: {
    debug: ENV.IS_DEVELOPMENT || import.meta.env.VITE_ENABLE_DEBUG === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  },
  
  // Limites
  limits: {
    fileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10') * 1024 * 1024, // MB to bytes
    uploadSize: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE || '50') * 1024 * 1024,
    requestsPerMinute: RATE_LIMITS.general,
  },
  
  // Pagination par défaut
  pagination: PAGINATION_CONFIG,
  
  // Support et liens
  links: {
    support: import.meta.env.VITE_SUPPORT_URL || 'https://support.actionculture.dz',
    docs: import.meta.env.VITE_DOCS_URL || 'https://docs.actionculture.dz',
    terms: import.meta.env.VITE_TERMS_URL || '/terms',
    privacy: import.meta.env.VITE_PRIVACY_URL || '/privacy',
  },
};

// Helper pour vérifier si on est en mode debug
export const isDebugMode = (): boolean => {
  return APP_CONFIG.features.debug;
};

// Logger conditionnel
export const debugLog = (...args: any[]): void => {
  if (isDebugMode()) {
    console.log('[Action Culture Debug]', ...args);
  }
};

// Export par défaut
export default {
  env: ENV,
  api: API_CONFIG,
  app: APP_CONFIG,
};