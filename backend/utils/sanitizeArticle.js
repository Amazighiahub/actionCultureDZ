/**
 * sanitizeArticle.js — Sanitisation du contenu des blocs d'articles
 *
 * Le middleware global (securityMiddleware.sanitizeInput) supprime TOUS les tags HTML.
 * Mais les blocs d'articles de type "embed" doivent pouvoir stocker des <iframe>
 * de domaines autorisés (YouTube, Vimeo, etc.).
 *
 * Ce helper est appelé DANS le contrôleur article-blocks, APRÈS le middleware global
 * (qui aura déjà strippé le contenu). Il est conçu pour être utilisé si on exclut
 * le champ "contenu" du middleware global pour les routes article-blocks.
 *
 * Sécurité : sanitize-html avec whitelist stricte par type de bloc.
 */

const sanitizeHtml = require('sanitize-html');

// Domaines autorisés pour les embeds (iframes)
const ALLOWED_EMBED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'www.dailymotion.com',
  'dailymotion.com',
  'w.soundcloud.com',
  'soundcloud.com',
];

/**
 * Vérifie si une URL d'iframe est d'un domaine autorisé
 */
function isAllowedEmbedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * URL de vidéo acceptée pour un bloc "video" : https, domaine d'embed autorisé
 * ou vidéo hébergée sur notre compte Cloudinary.
 */
function isAllowedVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return isAllowedEmbedUrl(url) || parsed.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

/**
 * Sanitise le contenu d'un bloc article selon son type
 *
 * @param {string} typeBlock - Type du bloc (text, heading, embed, code, etc.)
 * @param {string} contenu - Contenu brut envoyé par le frontend
 * @returns {string} Contenu sanitisé
 */
function sanitizeBlockContent(typeBlock, contenu) {
  if (!contenu || typeof contenu !== 'string') return contenu;

  switch (typeBlock) {
    // Texte pur — supprimer TOUS les tags HTML
    case 'text':
    case 'heading':
    case 'citation':
    case 'list':
    case 'separator':
      return sanitizeHtml(contenu, {
        allowedTags: [],
        allowedAttributes: {},
      });

    // Code — garder tel quel (sera échappé à l'affichage par le frontend)
    case 'code':
      return contenu;

    // Embed — autoriser UNIQUEMENT <iframe> de domaines whitelist
    case 'embed': {
      // Si c'est juste une URL (pas un tag), la garder telle quelle
      if (!contenu.includes('<')) {
        // Vérifier que c'est une URL d'embed autorisée
        if (isAllowedEmbedUrl(contenu)) {
          return contenu;
        }
        // URL non autorisée → vider
        return '';
      }

      // Si c'est du HTML (tag iframe), sanitiser
      const cleaned = sanitizeHtml(contenu, {
        allowedTags: ['iframe'],
        allowedAttributes: {
          iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
        },
        allowedIframeHostnames: ALLOWED_EMBED_DOMAINS,
      });

      // Vérifier que le résultat contient bien un iframe avec une src autorisée
      const srcMatch = cleaned.match(/src=["']([^"']+)["']/);
      if (srcMatch && isAllowedEmbedUrl(srcMatch[1])) {
        return cleaned;
      }

      // Si le src n'est pas autorisé après sanitisation, vider
      return '';
    }

    // Vidéo — le contenu est l'URL affichée dans un <iframe> : https + domaine autorisé uniquement
    case 'video':
      return isAllowedVideoUrl(contenu.trim()) ? contenu.trim() : '';

    // Image — URL ou légende : aucun tag, et pas de schéma autre que http(s)
    case 'image': {
      const text = sanitizeHtml(contenu, { allowedTags: [], allowedAttributes: {} }).trim();
      const scheme = text.match(/^([a-z][a-z0-9+.-]*):/i);
      if (scheme && !['http', 'https'].includes(scheme[1].toLowerCase())) return '';
      return text;
    }

    // Table — le contenu principal est dans contenu_json, pas contenu
    case 'table':
      return sanitizeHtml(contenu, {
        allowedTags: [],
        allowedAttributes: {},
      });

    // Par défaut — supprimer tous les tags
    default:
      return sanitizeHtml(contenu, {
        allowedTags: [],
        allowedAttributes: {},
      });
  }
}

/**
 * Données structurées d'un bloc, au format attendu par l'affichage :
 * liste = tableau de textes, tableau = { headers: [textes], rows: [[textes]] }.
 * Avant : n'importe quel JSON était gardé et un élément qui n'était pas un texte
 * faisait planter la page de l'article. Les autres types sont laissés tels quels.
 */
function sanitizeBlockJson(type, json) {
  const texte = (v) => (v == null ? '' : typeof v === 'object' ? '' : String(v).slice(0, 2000));
  if (type === 'list') {
    return Array.isArray(json) ? json.slice(0, 200).map(texte) : null;
  }
  if (type === 'table') {
    if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
    const headers = Array.isArray(json.headers) ? json.headers.slice(0, 20).map(texte) : [];
    const rows = Array.isArray(json.rows)
      ? json.rows.slice(0, 200).map(r => (Array.isArray(r) ? r.slice(0, 20).map(texte) : []))
      : [];
    return { headers, rows };
  }
  return json;
}

module.exports = { sanitizeBlockContent, sanitizeBlockJson, isAllowedEmbedUrl, isAllowedVideoUrl, ALLOWED_EMBED_DOMAINS };
