// config/env.ts - Configuration des variables d'environnement

// Helper pour créer une URL absolue
const makeAbsoluteUrl = (url: string): string => {
  // Si l'URL est déjà absolue, la retourner
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Sinon, créer une URL absolue basée sur l'origin actuel
  const origin = window.location.origin;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${cleanUrl}`;
};

// Variables d'environnement avec valeurs par défaut
const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
export const API_BASE_URL = makeAbsoluteUrl(rawApiUrl);

const rawUploadUrl = import.meta.env.VITE_UPLOAD_URL || '/uploads';
export const UPLOAD_URL = makeAbsoluteUrl(rawUploadUrl);

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Action Culture';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const ENABLE_DEBUG = import.meta.env.VITE_ENABLE_DEBUG === 'true';

// Configuration de l'environnement
export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;
export const MODE = import.meta.env.MODE;

// ... reste du code inchangé ...