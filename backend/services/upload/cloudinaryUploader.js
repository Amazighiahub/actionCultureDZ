/**
 * CloudinaryUploader
 *
 * Helpers bas-niveau pour pousser un Buffer vers Cloudinary via
 * upload_stream. Utilise dans le pipeline "safe" ou on valide les
 * magic bytes AVANT d'envoyer quoi que ce soit a Cloudinary.
 *
 * Circuit breaker : reutilise breakers.cloudinary (cloudinaryService)
 * pour respecter la strategie globale de resilience.
 */

const crypto = require('crypto');
const path = require('path');
const { cloudinary, FOLDERS, IMAGE_TRANSFORMS } = require('../cloudinaryService');
const { breakers } = require('../../utils/circuitBreaker');
const logger = require('../../utils/logger');

/**
 * Genere un public_id Cloudinary unique a partir d'un nom d'origine.
 * Duplique intentionnellement la logique de uploadService.generatePublicId
 * pour rester autonome (uploadService depend de cloudinaryService).
 */
function buildPublicId(originalname, prefix = '') {
  const ext = path.extname(originalname || '').toLowerCase();
  const name = path.basename(originalname || 'file', ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');

  const cleanName = name
    .toLowerCase()
    .replace(/[àáäâèéëêìíïîòóöôùúüûñç]/g, (c) => (
      { à: 'a', á: 'a', ä: 'a', â: 'a', è: 'e', é: 'e', ë: 'e', ê: 'e',
        ì: 'i', í: 'i', ï: 'i', î: 'i', ò: 'o', ó: 'o', ö: 'o', ô: 'o',
        ù: 'u', ú: 'u', ü: 'u', û: 'u', ñ: 'n', ç: 'c' }[c] || c
    ))
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);

  return `${prefix ? prefix + '-' : ''}${cleanName || 'file'}-${timestamp}-${random}`;
}

/**
 * Pousse un Buffer vers Cloudinary en mode upload_stream.
 * Resout avec la reponse Cloudinary (secure_url, public_id, ...).
 *
 * @param {Buffer} buffer
 * @param {Object} opts
 * @param {string} opts.folder          - dossier Cloudinary (ex: eventculture/images)
 * @param {string} opts.publicId        - public_id pre-genere
 * @param {'image'|'video'|'raw'} opts.resourceType
 * @param {Array}  [opts.transformation]
 * @param {string[]} [opts.allowedFormats]
 * @returns {Promise<{secure_url:string, public_id:string, format:string, bytes:number, resource_type:string}>}
 */
function streamUpload(buffer, opts) {
  const { folder, publicId, resourceType, transformation, allowedFormats } = opts;

  return new Promise((resolve, reject) => {
    const params = {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      ...(transformation ? { transformation } : {}),
      ...(allowedFormats ? { allowed_formats: allowedFormats } : {})
    };

    const stream = cloudinary.uploader.upload_stream(params, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
}

/**
 * Variante "image" : upload un buffer image deja valide (magic bytes check fait avant)
 * vers le dossier eventculture/images (ou profile) avec les transforms standards.
 *
 * @param {Buffer} buffer
 * @param {Object} opts
 * @param {'default'|'profile'} [opts.context='default']
 * @param {string} [opts.originalname='file']
 * @returns {Promise<Object>} Reponse Cloudinary
 */
async function uploadImageBuffer(buffer, { context = 'default', originalname = 'file' } = {}) {
  const folder = context === 'profile' ? FOLDERS.profile : FOLDERS.image;
  const transformation = context === 'profile'
    ? IMAGE_TRANSFORMS.profile
    : IMAGE_TRANSFORMS.default;
  const publicId = buildPublicId(originalname, 'img');

  return breakers.cloudinary.execute(async () => {
    const result = await streamUpload(buffer, {
      folder,
      publicId,
      resourceType: 'image',
      transformation,
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    });
    logger.info('cloudinary upload image OK', {
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format
    });
    return result;
  });
}

/**
 * Variante "document" : PDF / DOC / DOCX.
 * resource_type=raw pour que Cloudinary ne tente aucune transformation.
 *
 * @param {Buffer} buffer
 * @param {Object} opts
 * @param {string} [opts.originalname='file']
 * @returns {Promise<Object>} Reponse Cloudinary
 */
async function uploadDocumentBuffer(buffer, { originalname = 'file' } = {}) {
  const publicId = buildPublicId(originalname, 'doc');

  return breakers.cloudinary.execute(async () => {
    const result = await streamUpload(buffer, {
      folder: FOLDERS.document,
      publicId,
      resourceType: 'raw',
      allowedFormats: ['pdf', 'doc', 'docx', 'txt', 'odt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx']
    });
    logger.info('cloudinary upload document OK', {
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format
    });
    return result;
  });
}

module.exports = {
  buildPublicId,
  streamUpload,
  uploadImageBuffer,
  uploadDocumentBuffer
};
