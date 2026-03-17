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
  document:   'eventculture/documents'
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

/**
 * Extraire le public_id depuis une URL Cloudinary
 * ex: https://res.cloudinary.com/mycloud/image/upload/v1234/eventculture/images/img-file.jpg
 *  -> eventculture/images/img-file
 */
function extractPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  // Supprimer /upload/vXXXX/ et l'extension finale
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
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
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

module.exports = {
  cloudinary,
  FOLDERS,
  IMAGE_TRANSFORMS,
  VIDEO_TRANSFORMS,
  deleteAsset,
  extractPublicId,
  getResourceType,
  isCloudinaryUrl
};
