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