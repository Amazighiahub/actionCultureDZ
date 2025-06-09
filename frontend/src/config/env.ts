// config/env.ts - Configuration des variables d'environnement pour Vite

/**
 * Configuration de l'environnement
 * Utilise les variables d'environnement Vite (préfixées par VITE_)
 */

interface EnvConfig {
  API_URL: string;
  UPLOAD_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

// Récupérer les variables d'environnement Vite
const getEnvVar = (key: string, defaultValue = ''): string => {
  // Vite expose les variables via import.meta.env
  return import.meta.env[key] || defaultValue;
};

// Configuration de l'environnement
export const ENV: EnvConfig = {
  API_URL: getEnvVar('VITE_API_URL', '/api'),
  UPLOAD_URL: getEnvVar('VITE_UPLOAD_URL', '/uploads'),
  APP_NAME: getEnvVar('VITE_APP_NAME', 'Action Culture'),
  APP_VERSION: getEnvVar('VITE_APP_VERSION', '1.0.0'),
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
};

// Validation de la configuration
const validateConfig = (): void => {
  const requiredVars = ['API_URL'];
  const missing: string[] = [];

  requiredVars.forEach(key => {
    if (!ENV[key as keyof EnvConfig]) {
      missing.push(`VITE_${key}`);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:', missing.join(', '));
    console.error('Assurez-vous d\'avoir un fichier .env avec les bonnes variables');
  }
};

// Valider au chargement
if (ENV.IS_DEVELOPMENT) {
  validateConfig();
}

// Logger la configuration en développement
if (ENV.IS_DEVELOPMENT) {
  console.log('🔧 Configuration de l\'environnement:');
  console.log('API URL:', ENV.API_URL);
  console.log('Upload URL:', ENV.UPLOAD_URL);
  console.log('App:', ENV.APP_NAME, ENV.APP_VERSION);
}

// Export des URLs directement utilisables
export const API_BASE_URL = ENV.API_URL;
export const UPLOAD_BASE_URL = ENV.UPLOAD_URL;

// Helper pour construire les URLs complètes
export const buildApiUrl = (path: string): string => {
  // Retirer le slash de début si présent
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export const buildUploadUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${UPLOAD_BASE_URL}${cleanPath}`;
};

// Configuration pour différents environnements
export const isLocalhost = (): boolean => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

export const getApiTimeout = (): number => {
  // Timeout plus long en développement
  return ENV.IS_DEVELOPMENT ? 30000 : 15000;
};

// Export par défaut
export default ENV;