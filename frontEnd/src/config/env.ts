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

export const MODE = import.meta.env.MODE;
