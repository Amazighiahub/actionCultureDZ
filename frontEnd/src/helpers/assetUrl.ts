// helpers/assetUrl.ts - Helper centralisé pour gérer les URLs d'assets

import { API_BASE_URL } from '@/config/api';

/**
 * Helper pour construire l'URL complète d'un asset à partir d'un chemin relatif
 * @param path Chemin relatif ou URL complète
 * @returns URL complète utilisable dans src d'image, vidéo, etc.
 */
export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  
  // Si l'URL est déjà complète (http:// ou https://), la retourner telle quelle
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si c'est une data URL (base64), la retourner telle quelle
  if (path.startsWith('data:')) {
    return path;
  }
  
  // Pour les chemins relatifs, construire l'URL complète
  // Enlever le /api de la fin de API_BASE_URL car les assets sont à la racine
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  
  // S'assurer qu'il n'y a pas de double slash
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  
  return `${baseUrl}${cleanPath}`;
}

/**
 * Helper pour obtenir l'URL d'une image avec un fallback
 * @param imagePath Chemin de l'image
 * @param fallback URL de l'image par défaut
 * @returns URL de l'image ou du fallback
 */
export function getImageUrl(imagePath: string | undefined | null, fallback = '/images/placeholder.jpg'): string {
  if (!imagePath) return getAssetUrl(fallback);
  return getAssetUrl(imagePath);
}

/**
 * Helper pour obtenir l'URL d'un avatar utilisateur
 * @param avatarPath Chemin de l'avatar
 * @param userName Nom de l'utilisateur pour générer un avatar par défaut
 * @returns URL de l'avatar
 */
export function getAvatarUrl(avatarPath: string | undefined | null, userName?: string): string {
  if (avatarPath) return getAssetUrl(avatarPath);
  
  // Si pas d'avatar, utiliser un service de génération d'avatars
  if (userName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
  }
  
  return getAssetUrl('/images/default-avatar.png');
}

/**
 * Helper pour obtenir l'URL d'une miniature vidéo
 * @param thumbnailPath Chemin de la miniature
 * @param videoPath Chemin de la vidéo (pour fallback)
 * @returns URL de la miniature
 */
export function getVideoThumbnailUrl(
  thumbnailPath: string | undefined | null, 
  videoPath?: string
): string {
  if (thumbnailPath) return getAssetUrl(thumbnailPath);
  
  // Si pas de miniature mais une vidéo, on pourrait générer une miniature
  // Pour l'instant, on retourne un placeholder
  return getAssetUrl('/images/video-placeholder.jpg');
}

/**
 * Helper pour vérifier si une URL est externe
 * @param url URL à vérifier
 * @returns true si l'URL est externe
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Helper pour vérifier si une URL est une data URL (base64)
 * @param url URL à vérifier
 * @returns true si l'URL est une data URL
 */
export function isDataUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('data:');
}

/**
 * Helper pour obtenir le nom de fichier depuis une URL
 * @param url URL complète
 * @returns Nom du fichier
 */
export function getFilenameFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || '';
  } catch {
    // Si ce n'est pas une URL valide, essayer de récupérer le dernier segment
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  }
}

/**
 * Helper pour construire une URL de téléchargement
 * @param path Chemin du fichier
 * @param filename Nom du fichier pour le téléchargement
 * @returns URL de téléchargement
 */
export function getDownloadUrl(path: string, filename?: string): string {
  const url = getAssetUrl(path);
  if (!filename) return url;
  
  // Ajouter le paramètre download avec le nom de fichier
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}download=${encodeURIComponent(filename)}`;
}