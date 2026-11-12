// services/cloudinaryService.js
// Cloudinary - Stockage cloud pour images et vidéos (projet culturel/touristique)

const cloudinary = require('cloudinary').v2;
const { breakers } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ============================================================
// Structure des dossiers Cloudinary
// ============================================================
const FOLDERS = {
  profile:    'eventculture/profiles',
  image:      'eventculture/images',
  oeuvre:     'eventculture/oeuvres/images',
  evenement:  'eventculture/evenements/images',
  patrimoine: 'eventculture/patrimoine/images',
  artisanat:  'eventculture/artisanat/images',
  video:      'eventculture/videos',
  audio:      'eventculture/audios',
  document:   'eventculture/documents',
  // Photos envoyées avant la création du compte (inscription) : effacées si aucun compte ne les utilise
  quarantaine: 'eventculture/quarantaine'
};

// ============================================================
// Transformations images - optimisées pour tourisme culturel
// ============================================================
const IMAGE_TRANSFORMS = {
  // Photo de profil : carré 500px, recadrage sur le visage
  profile: [
    {
      width: 500, height: 500,
      crop: 'fill', gravity: 'face',
      quality: 'auto:good', fetch_format: 'auto'
    }
  ],
  // Images hautes résolution (patrimoine, œuvres, événements)
  default: [
    {
      width: 2000, height: 2000,
      crop: 'limit',
      quality: 'auto:good', fetch_format: 'auto'
    }
  ],
  // Miniature pour galeries
  thumbnail: [
    {
      width: 600, height: 400,
      crop: 'fill', gravity: 'auto',
      quality: 'auto:eco', fetch_format: 'auto'
    }
  ]
};

// ============================================================
// Transformations vidéo - compression intelligente
// ============================================================
const VIDEO_TRANSFORMS = {
  default: [
    {
      width: 1280, height: 720,
      crop: 'limit',
      quality: 'auto:good',
      bit_rate: '2m',
      fetch_format: 'mp4'
    }
  ]
};

// ============================================================
// Helpers
// ============================================================

/**
 * Supprimer un asset Cloudinary par son public_id
 * @param {string} publicId
 * @param {'image'|'video'|'raw'} resourceType
 */
async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) return null;
  return breakers.cloudinary.execute(async () => {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }).catch(error => {
    logger.error('Cloudinary delete error:', error.message);
    return null;
  });
}

const TYPES_RESSOURCE = ['image', 'video', 'raw'];
// Segment de transformation : « c_fill,w_300 », « fl_attachment », « t_miniature »…
const SEGMENT_TRANSFORMATION = /^[a-z]{1,3}_[^/]*(,[a-z]{1,3}_[^/]*)*$/;

/**
 * Lire une URL de livraison Cloudinary :
 *   https://res.cloudinary.com/<compte>/<image|video|raw>/upload/[transformations/][vNNN/]<public_id>[.format]
 * (forme construite par cloudinary.url() du SDK : prefix/resource_type/type/transformation/version/public_id).
 *
 * Image et vidéo : l'extension de l'URL est le format de livraison, elle ne fait pas partie du public_id.
 * Raw (PDF, DOCX…) : Cloudinary ne gère pas de format pour ces fichiers, l'extension éventuelle
 * appartient au public_id (« programme.pdf ») ; la retirer visait un fichier inexistant et la
 * suppression échouait sans bruit (audit V11 COD-B16).
 * @returns {{ resourceType: 'image'|'video'|'raw'|null, publicId: string } | null}
 */
function lireUrlCloudinary(url) {
  if (typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  let segments;
  try {
    const adresse = new URL(url);
    if (!/(^|\.)cloudinary\.com$/.test(adresse.hostname)) return null;
    segments = adresse.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s));
  } catch {
    return null;
  }
  const iUpload = segments.indexOf('upload');
  if (iUpload < 0) return null;
  // Type absent de l'URL (forme ancienne) : null, traité comme une image pour l'extension
  const resourceType = TYPES_RESSOURCE.includes(segments[iUpload - 1]) ? segments[iUpload - 1] : null;

  let reste = segments.slice(iUpload + 1);
  const iVersion = reste.findIndex(s => /^v\d+$/.test(s));
  if (iVersion >= 0) {
    // Tout ce qui précède la version est une transformation
    reste = reste.slice(iVersion + 1);
  } else {
    while (reste.length > 1 && SEGMENT_TRANSFORMATION.test(reste[0])) reste = reste.slice(1);
  }
  if (!reste.length) return null;

  let publicId = reste.join('/');
  if (resourceType !== 'raw') publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, '');
  return publicId ? { resourceType, publicId } : null;
}

/**
 * Extraire le public_id depuis une URL Cloudinary
 * ex: https://res.cloudinary.com/mycloud/image/upload/v1234/eventculture/images/img-file.jpg
 *  -> eventculture/images/img-file
 * ex: https://res.cloudinary.com/mycloud/raw/upload/v1234/eventculture/documents/programme.pdf
 *  -> eventculture/documents/programme.pdf (raw : l'extension fait partie du public_id)
 */
function extractPublicId(url) {
  return lireUrlCloudinary(url)?.publicId || null;
}

/**
 * Supprimer de Cloudinary le fichier d'une URL (seule version de ce code ; avant : trois copies
 * dans uploadService, documentsEvenement et oeuvreService — audit V11 COD-B15).
 * Une URL qui n'est pas sur res.cloudinary.com n'est jamais touchée.
 * @param {string} url
 * @param {Object} [options]
 * @param {string} [options.publicId] - public_id connu (ex. metadata.cloudinaryPublicId), prioritaire sur l'URL
 * @param {'image'|'video'|'raw'} [options.resourceType] - seulement si l'URL ne l'indique pas
 * @returns {Promise<boolean>} true si une suppression a été demandée à Cloudinary
 */
async function supprimerParUrl(url, { publicId, resourceType } = {}) {
  if (!isCloudinaryUrl(url)) return false;
  const lu = lireUrlCloudinary(url);
  const id = publicId || lu?.publicId;
  if (!id) return false;
  const type = lu?.resourceType || (TYPES_RESSOURCE.includes(resourceType) ? resourceType : 'image');
  await deleteAsset(id, type);
  return true;
}

/**
 * Détecter le resource_type Cloudinary depuis un MIME type
 */
function getResourceType(mimetype) {
  if (!mimetype) return 'auto';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) return 'video';
  return 'raw';
}

/**
 * Vérifier si une URL est hébergée sur Cloudinary
 */
function isCloudinaryUrl(url) {
  // Nom d'hôte exact : "https://evil.tld/?res.cloudinary.com" n'est pas une URL Cloudinary
  if (typeof url !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === 'https:' || protocol === 'http:') && hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

module.exports = {
  cloudinary,
  FOLDERS,
  IMAGE_TRANSFORMS,
  VIDEO_TRANSFORMS,
  deleteAsset,
  extractPublicId,
  lireUrlCloudinary,
  supprimerParUrl,
  getResourceType,
  isCloudinaryUrl
};
