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
 * Gros fichiers (video/audio/medias mixtes) : secureDiskUpload ecrit le fichier
 * dans un dossier temporaire local, valide sa signature binaire, PUIS l'envoie
 * vers Cloudinary et supprime le fichier temporaire. Plus aucun fichier n'est
 * pousse vers Cloudinary avant validation.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const FileValidator = require('../utils/fileValidator');
const {
  uploadImageBuffer,
  uploadDocumentBuffer,
  uploadLocalFile
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

    // Sanitiser originalname avant tout traitement (évite path traversal dans logs/stockage)
    for (const file of files) {
      file.originalname = (file.originalname || 'file')
        .replace(/\x00/g, '')
        .replace(/[/\\]/g, '_')
        .replace(/\.\./g, '_')
        .substring(0, 255);
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

/**
 * Intercepte les erreurs multer (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, fileFilter)
 * et les convertit en reponses 400/413 sans leaker de message interne au client.
 */
function multerErrorGuard(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (!err) return next();
      logger.error('Upload multer error', { message: err.message, code: err.code, route: req.originalUrl });
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendRejection(res, 413, 'UPLOAD_TOO_LARGE', req.t ? req.t('upload.fileTooLarge') : 'Fichier trop volumineux');
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return sendRejection(res, 400, 'UPLOAD_TOO_MANY', req.t ? req.t('upload.tooManyFiles') : 'Trop de fichiers');
      }
      if (err.code === 'UPLOAD_INVALID_TYPE') {
        return sendRejection(res, 400, 'UPLOAD_INVALID_TYPE', req.t ? req.t('upload.invalidFileType') : 'Type de fichier non autorise');
      }
      return sendRejection(res, 500, 'UPLOAD_FAILED', req.t ? req.t('upload.failed') : "Echec de l'upload, veuillez reessayer.");
    });
  };
}

const uploadedFiles = (req) => (req.files ? [].concat(...Object.values(req.files)) : (req.file ? [req.file] : []));

async function removeTempFiles(files) {
  await Promise.all(files.map(f => (f && f.path && !/^https?:/i.test(f.path)
    ? fs.promises.unlink(f.path).catch(() => {})
    : null)));
}

// Disque temporaire local (jamais servi) : chaque fichier y reste le temps de la validation
const TEMP_DIR = path.join(os.tmpdir(), 'eventculture-uploads');

/**
 * Pipeline d'upload sur disque : multer (disque temporaire) → validation de la
 * signature binaire → envoi Cloudinary → suppression du fichier temporaire.
 * @param {object} opts
 * @param {string} opts.field - nom du champ multipart
 * @param {string[]} opts.mimes - types acceptés (vérifiés sur le contenu)
 * @param {number} opts.maxFileSize - taille max par fichier (octets)
 * @param {number} [opts.maxFiles] - > 1 : plusieurs fichiers (req.files)
 * @returns {Function[]} middlewares Express
 */
function secureDiskUpload({ field, mimes, maxFileSize, maxFiles = 1 }) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const storage = multer.diskStorage({
    destination: TEMP_DIR,
    // nom aléatoire sans extension : rien d'exécutable ni de deviné
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex'))
  });
  const fileFilter = (req, file, cb) => {
    if (mimes.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Type de fichier non autorise');
    err.code = 'UPLOAD_INVALID_TYPE';
    return cb(err);
  };
  const uploader = multer({ storage, fileFilter, limits: { fileSize: maxFileSize, files: maxFiles } });

  const validate = async (req, res, next) => {
    const files = uploadedFiles(req);
    try {
      for (const file of files) {
        // Signature lue sur les premiers octets ; le nom d'origine sert à distinguer
        // les formats Office (ZIP) — le fichier temporaire n'a pas d'extension
        const handle = await fs.promises.open(file.path, 'r');
        const header = Buffer.alloc(16);
        const { bytesRead } = await handle.read(header, 0, 16, 0).finally(() => handle.close());
        const result = FileValidator.validateBuffer(header.subarray(0, bytesRead), mimes, { originalname: file.originalname });
        if (!result.valid) {
          await removeTempFiles(files);
          logger.warn('secureDiskUpload: fichier refuse', { route: req.originalUrl, detected: result.detected });
          return sendRejection(res, 400, 'UPLOAD_INVALID_TYPE', req.t ? req.t('upload.invalidFileType') : 'Type de fichier non autorise');
        }
        file.mimetype = result.mimeType; // type réel détecté, pas celui déclaré
      }
      return next();
    } catch (error) {
      await removeTempFiles(files);
      return next(error);
    }
  };

  const push = async (req, res, next) => {
    const files = uploadedFiles(req);
    try {
      for (const file of files) {
        const tempPath = file.path;
        const result = await uploadLocalFile(tempPath, { originalname: file.originalname, mimetype: file.mimetype });
        await fs.promises.unlink(tempPath).catch(() => {});
        // Même forme que l'ancien stockage direct : les contrôleurs lisent file.path = URL
        file.path = result.secure_url;
        file.secure_url = result.secure_url;
        file.filename = result.public_id;
        file.size = result.bytes || file.size;
        file._cloudinary = { public_id: result.public_id, resource_type: result.resource_type, format: result.format };
      }
      return next();
    } catch (error) {
      await removeTempFiles(files);
      logger.error('secureDiskUpload: Cloudinary push failed', { route: req.originalUrl, message: error?.message });
      return sendRejection(res, 502, 'UPLOAD_STORAGE_FAILED', req.t ? req.t('upload.failed') : "Echec de l'upload, veuillez reessayer.");
    }
  };

  const multerStep = maxFiles > 1 ? uploader.array(field, maxFiles) : uploader.single(field);
  return [multerErrorGuard(multerStep), validate, push];
}

module.exports = {
  validateMagicBytesBuffer,
  pushBufferToCloudinary,
  multerErrorGuard,
  secureDiskUpload
};
