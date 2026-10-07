// helpers/assetUrl.ts - Helper centralisé pour gérer les URLs d'assets

import { API_BASE_URL } from '@/config/api';

const CLOUDINARY_IMAGE_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * Image Cloudinary optimisée à la volée : format (AVIF/WebP) et compression choisis
 * par Cloudinary selon le navigateur, et largeur limitée si `width` est donné.
 * Les URL qui ne sont pas des images Cloudinary, ou déjà transformées, sont inchangées.
 */
export function optimizeImageUrl(url: string, width?: number): string {
  const m = CLOUDINARY_IMAGE_UPLOAD.exec(url);
  if (!m) return url;
  const [, base, rest] = m;
  // PDF (Cloudinary les range parfois en image/upload), SVG, ICO : fichier original
  if (/\.(pdf|svg|ico)(\?|$)/i.test(rest)) return url;
  // Segment de transformation déjà présent (ex. "c_fill,w_300/") : on n'y touche pas
  if (/^[a-z]{1,3}_[^/]*\//.test(rest)) return url;
  const transform = width ? `f_auto,q_auto,c_limit,w_${Math.round(width)}` : 'f_auto,q_auto';
  return `${base}${transform}/${rest}`;
}

/**
 * Helper pour construire l'URL complète d'un asset à partir d'un chemin relatif
 * @param path Chemin relatif ou URL complète
 * @param options.width Largeur d'affichage maximale (images Cloudinary : téléchargement allégé)
 * @returns URL complète utilisable dans src d'image, vidéo, etc.
 */
export function getAssetUrl(path: string | undefined | null, options: { width?: number } = {}): string {
  if (!path) return '';

  // Si l'URL est déjà complète (http:// ou https://) : images Cloudinary optimisées,
  // les autres retournées telles quelles
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return optimizeImageUrl(path, options.width);
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
export function getImageUrl(imagePath: string | undefined | null, fallback = '/images/placeholder.svg'): string {
  if (!imagePath) return getAssetUrl(fallback);
  return getAssetUrl(imagePath);
}

/**
 * Helper pour obtenir l'URL d'un avatar utilisateur
 * Sans photo : avatar par défaut local (aucun nom envoyé à un service tiers).
 * Pour des initiales, utiliser AvatarFallback (components/ui/avatar).
 * @param avatarPath Chemin de l'avatar
 * @returns URL de l'avatar
 */
export function getAvatarUrl(avatarPath: string | undefined | null): string {
  if (avatarPath) return getAssetUrl(avatarPath);
  return getAssetUrl('/images/default-avatar.svg');
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
  return getAssetUrl('/images/video-placeholder.svg');
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
  // Téléchargement : toujours le fichier original (sans conversion de format)
  const url = /^https?:\/\//.test(path) ? path : getAssetUrl(path);
  if (!filename) return url;
  
  // Ajouter le paramètre download avec le nom de fichier
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}download=${encodeURIComponent(filename)}`;
}