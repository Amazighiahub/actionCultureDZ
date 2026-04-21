/**
 * uploadSecurity - middlewares de defense pour pipeline d'upload
 *
 * Ces middlewares s'appliquent APRES multer (en memoryStorage) et AVANT
 * le push vers Cloudinary. Ils protegent contre :
 *  - upload d'un fichier forge (ex : .exe avec Content-Type: image/jpeg)
 *    → magic bytes sur req.file.buffer (client ne peut pas mentir sur la signature)
 *  - depassement de taille non intercepte par multer.limits.fileSize
 *    → check redondant explicite
 *
 * Tous les rejets sont servis en 400 avec un code machine
 * (`UPLOAD_INVALID_TYPE`, `UPLOAD_TOO_LARGE`, `UPLOAD_EMPTY`) pour le
 * frontend, sans divulguer d'info sensible.
 *
 * Les routes qui utilisent encore multer-storage-cloudinary (video/audio,
 * gros fichiers) ne peuvent pas beneficier de validateMagicBytesBuffer
 * car il n'y a pas de buffer local ; elles restent protegees par
 * FileValidator.uploadValidator qui fait un check MIME degrade.
 */

const FileValidator = require('../utils/fileValidator');
const {
  uploadImageBuffer,
  uploadDocumentBuffer
} = require('../services/upload/cloudinaryUploader');
const logger = require('../utils/logger');

function sendRejection(res, status, code, message, details) {
  const body = { success: false, code, error: message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

/**
 * Middleware : valide les magic bytes d'un upload single (req.file) ou
 * multiple (req.files) provenant de multer.memoryStorage().
 *
 * Effet de bord : met a jour req.file.mimetype avec le type REEL detecte
 * (peut differer de celui envoye par le client).
 *
 * @param {string[]} allowedMimeTypes
 * @param {Object} [opts]
 * @param {number} [opts.maxFileSize]  re-check taille (defense en profondeur)
 * @returns {import('express').RequestHandler}
 */
function validateMagicBytesBuffer(allowedMimeTypes, opts = {}) {
  const { maxFileSize } = opts;

  return (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return next();
    }

    for (const file of files) {
      if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        logger.warn('uploadSecurity: file without buffer', {
          field: file.fieldname,
          mimetype: file.mimetype,
          size: file.size
        });
        return sendRejection(
          res,
          400,
          'UPLOAD_EMPTY',
          req.t ? req.t('upload.emptyFile') : 'Fichier vide ou invalide'
        );
      }

      if (maxFileSize && file.size > maxFileSize) {
        logger.warn('uploadSecurity: file too large', {
          field: file.fieldname,
          size: file.size,
          maxFileSize
        });
        return sendRejection(
          res,
          413,
          'UPLOAD_TOO_LARGE',
          req.t ? req.t('upload.fileTooLarge') : 'Fichier trop volumineux',
          { maxSize: `${Math.floor(maxFileSize / 1024 / 1024)} MB` }
        );
      }

      const verdict = FileValidator.validateBuffer(file.buffer, allowedMimeTypes, {
        originalname: file.originalname
      });

      if (!verdict.valid) {
        // On log les details cote serveur (type reel detecte, type annonce)
        // pour tracer les tentatives d'abus, mais on renvoie au client
        // uniquement un message generique + la whitelist.
        logger.warn('uploadSecurity: magic bytes mismatch', {
          field: file.fieldname,
          originalname: file.originalname,
          declaredMime: file.mimetype,
          detected: verdict.detected,
          allowed: allowedMimeTypes
        });
        return sendRejection(
          res,
          400,
          'UPLOAD_INVALID_TYPE',
          req.t ? req.t('upload.invalidFileType') : 'Type de fichier non autorise',
          { allowed: allowedMimeTypes }
        );
      }

      // Overwrite le mimetype rapporte par le client avec celui detecte :
      // c'est ce que le controller/service utiliseront ensuite (Cloudinary
      // resource_type, base de donnees, etc.).
      file.mimetype = verdict.mimeType;
      file._detectedExtension = verdict.extension;
    }

    next();
  };
}

/**
 * Apres validation, pousse req.file.buffer vers Cloudinary et normalise
 * req.file au format que uploadController/uploadService attendent :
 *   - path      = URL Cloudinary (secure_url)
 *   - filename  = public_id Cloudinary
 *   - size      = octets tels que Cloudinary les reporte
 *
 * @param {Object} [opts]
 * @param {'image'|'document'} [opts.type='image']
 * @param {'default'|'profile'} [opts.context='default']  - uniquement pour type='image'
 */
function pushBufferToCloudinary({ type = 'image', context = 'default' } = {}) {
  return async (req, res, next) => {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return next();
    }

    try {
      const originalname = req.file.originalname;
      const result = type === 'document'
        ? await uploadDocumentBuffer(req.file.buffer, { originalname })
        : await uploadImageBuffer(req.file.buffer, { originalname, context });

      // Normalise req.file : le controller + service travaillent sur ce shape
      // (identique au shape produit par multer-storage-cloudinary).
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      req.file.size = result.bytes || req.file.size;
      // On garde le mimetype detecte par validateMagicBytesBuffer (plus fiable
      // que result.format qui est l'extension).
      req.file._cloudinary = {
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height
      };
      // Libere le buffer apres upload reussi : Node pourra GC la RAM.
      req.file.buffer = undefined;

      next();
    } catch (error) {
      logger.error('uploadSecurity: Cloudinary push failed', {
        type,
        context,
        originalname: req.file?.originalname,
        message: error?.message,
        http_code: error?.http_code
      });
      // Ne jamais leaker error.message au client : message generique + code.
      return sendRejection(
        res,
        502,
        'UPLOAD_STORAGE_FAILED',
        req.t ? req.t('upload.failed') : "Echec de l'upload, veuillez reessayer."
      );
    }
  };
}

module.exports = {
  validateMagicBytesBuffer,
  pushBufferToCloudinary
};
