/**
 * Utilitaire de sanitisation HTML pour prévenir les attaques XSS
 */
import DOMPurify from 'dompurify';

/**
 * Configuration par défaut pour DOMPurify
 * Autorise uniquement les balises et attributs sûrs pour les embeds
 */
const EMBED_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['iframe', 'div', 'span', 'p', 'br', 'a', 'img', 'video', 'audio', 'source'],
  ALLOWED_ATTR: [
    'src', 'href', 'title', 'alt', 'width', 'height', 'frameborder',
    'allow', 'allowfullscreen', 'class', 'id', 'style', 'target',
    'rel', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'type'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

/**
 * Configuration stricte pour le texte simple
 */
const TEXT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class']
};

/**
 * Sanitise le HTML pour les embeds (iframes YouTube, Vimeo, etc.)
 */
export function sanitizeEmbed(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, EMBED_CONFIG);
}

/**
 * Sanitise le HTML pour le texte riche simple
 */
export function sanitizeRichText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, TEXT_CONFIG);
}

/**
 * Sanitise complètement le HTML (supprime toutes les balises)
 */
export function sanitizeText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Vérifie si une URL est sûre (pas de javascript:, data:, etc.)
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim().toLowerCase();
  
  // Bloquer les protocoles dangereux
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousProtocols.some(protocol => trimmedUrl.startsWith(protocol))) {
    return false;
  }
  
  // Autoriser les URLs relatives et les protocoles sûrs
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/'];
  return safeProtocols.some(protocol => trimmedUrl.startsWith(protocol)) || 
         !trimmedUrl.includes(':');
}

/**
 * Sanitise une URL
 */
export function sanitizeUrl(url: string): string {
  if (!isSafeUrl(url)) return '';
  return url.trim();
}

export default {
  sanitizeEmbed,
  sanitizeRichText,
  sanitizeText,
  isSafeUrl,
  sanitizeUrl
};
