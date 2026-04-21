// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadService = require('../services/uploadService');
const auditMiddleware = require('../middlewares/auditMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const FileValidator = require('../utils/fileValidator');
const {
  validateMagicBytesBuffer,
  pushBufferToCloudinary
} = require('../middlewares/uploadSecurity');
const logger = require('../utils/logger');

// ============================================================================
// LIMITES ALIGNEES FILEVALIDATOR vs MULTER
// ----------------------------------------------------------------------------
// Sans alignement, multer accepte le fichier entier (bande passante consommee,
// RAM) avant que fileValidator ne le rejette. On veut que multer coupe des le
// depassement.
// ============================================================================
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;                                // 10 MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;                             // 50 MB
const MAX_VIDEO_SIZE = parseInt(process.env.UPLOAD_VIDEO_MAX_SIZE, 10) || 100 * 1024 * 1024;  // 100 MB
const MAX_AUDIO_SIZE = parseInt(process.env.UPLOAD_AUDIO_MAX_SIZE, 10) || 50 * 1024 * 1024;   // 50 MB
const MAX_MEDIA_SIZE = MAX_VIDEO_SIZE;                                  // max attendu en media mixte
const MAX_OEUVRE_FILES = 5;                                             // au lieu de 10

const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const VIDEO_MIMES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
const OEUVRE_MEDIA_MIMES = [
  ...IMAGE_MIMES,
  ...VIDEO_MIMES,
  ...AUDIO_MIMES,
  ...DOCUMENT_MIMES
];

/**
 * Intercepte les erreurs multer (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, fileFilter)
 * et les convertit en reponses 400/413 sans leaker stacktrace au client.
 * Le log complet (stack + http_code) reste cote serveur pour debug/Sentry.
 */
function multerErrorGuard(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (!err) return next();

      logger.error('Upload multer error', {
        message: err.message,
        code: err.code,
        http_code: err.http_code,
        route: req.originalUrl
      });

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          code: 'UPLOAD_TOO_LARGE',
          error: req.t ? req.t('upload.fileTooLarge') : 'Fichier trop volumineux'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          code: 'UPLOAD_TOO_MANY',
          error: req.t ? req.t('upload.tooManyFiles') : 'Trop de fichiers'
        });
      }
      // Defaut : 500 generique, pas de leak de message.
      return res.status(500).json({
        success: false,
        code: 'UPLOAD_FAILED',
        error: req.t ? req.t('upload.failed') : "Echec de l'upload, veuillez reessayer."
      });
    });
  };
}

const initUploadRoutes = (models, authMiddleware) => {
  const uploadController = require('../controllers/uploadController');

  // ========================================================================
  // ROUTE INFO
  // ========================================================================

  router.get('/', (req, res) => {
    res.json({
      message: 'API Upload - Action Culture',
      endpoints: {
        public: {
          'POST /image/public': 'Upload public (inscription)',
          'POST /document/public': 'Upload document public'
        },
        authenticated: {
          'POST /image': 'Upload image generique',
          'POST /profile-photo': 'Upload photo profil (mise a jour auto)',
          'POST /document': 'Upload document',
          'GET /:id': 'Obtenir infos media',
          'DELETE /:id': 'Supprimer media'
        }
      },
      config: {
        maxSize: {
          image: `${MAX_IMAGE_SIZE / 1024 / 1024} MB`,
          document: `${MAX_DOCUMENT_SIZE / 1024 / 1024} MB`,
          video: `${MAX_VIDEO_SIZE / 1024 / 1024} MB`,
          audio: `${MAX_AUDIO_SIZE / 1024 / 1024} MB`
        },
        formats: {
          image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          document: ['pdf', 'doc', 'docx']
        }
      }
    });
  });

  // ========================================================================
  // ROUTES PUBLIQUES (memoryStorage + magic bytes AVANT Cloudinary)
  // ========================================================================

  router.post('/image/public',
    ...rateLimitMiddleware.publicUpload,
    multerErrorGuard(uploadService.uploadImageSafe(MAX_IMAGE_SIZE).single('image')),
    validateMagicBytesBuffer(IMAGE_MIMES, { maxFileSize: MAX_IMAGE_SIZE }),
    pushBufferToCloudinary({ type: 'image', context: 'default' }),
    auditMiddleware.logAction('upload_image_public', { entityType: 'media' }),
    (req, res) => uploadController.uploadPublicImage(req, res)
  );

  router.post('/document/public',
    ...rateLimitMiddleware.publicUpload,
    multerErrorGuard(uploadService.uploadDocumentSafe(MAX_DOCUMENT_SIZE).single('document')),
    validateMagicBytesBuffer(DOCUMENT_MIMES, { maxFileSize: MAX_DOCUMENT_SIZE }),
    pushBufferToCloudinary({ type: 'document' }),
    auditMiddleware.logAction('upload_document_public', { entityType: 'media' }),
    (req, res) => uploadController.uploadPublicImage(req, res) // meme shape de reponse
  );

  // ========================================================================
  // ROUTES AUTHENTIFIEES
  // ========================================================================

  router.get('/file/:id',
    authMiddleware.optionalAuth,
    (req, res) => uploadController.downloadMedia(req, res)
  );

  router.post('/profile-photo',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    multerErrorGuard(uploadService.uploadImageSafe(MAX_IMAGE_SIZE).single('image')),
    validateMagicBytesBuffer(IMAGE_MIMES, { maxFileSize: MAX_IMAGE_SIZE }),
    pushBufferToCloudinary({ type: 'image', context: 'profile' }),
    auditMiddleware.logAction('upload_profile_photo', { entityType: 'media' }),
    (req, res) => uploadController.uploadProfilePhoto(req, res)
  );

  router.post('/image',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    multerErrorGuard(uploadService.uploadImageSafe(MAX_IMAGE_SIZE).single('image')),
    validateMagicBytesBuffer(IMAGE_MIMES, { maxFileSize: MAX_IMAGE_SIZE }),
    pushBufferToCloudinary({ type: 'image', context: 'default' }),
    auditMiddleware.logAction('upload_image', { entityType: 'media' }),
    (req, res) => uploadController.uploadImage(req, res)
  );

  router.post('/document',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    multerErrorGuard(uploadService.uploadDocumentSafe(MAX_DOCUMENT_SIZE).single('document')),
    validateMagicBytesBuffer(DOCUMENT_MIMES, { maxFileSize: MAX_DOCUMENT_SIZE }),
    pushBufferToCloudinary({ type: 'document' }),
    auditMiddleware.logAction('upload_document', { entityType: 'media' }),
    (req, res) => uploadController.uploadImage(req, res) // meme shape
  );

  // Obtenir les infos d'un media
  router.get('/:id',
    authMiddleware.authenticate,
    (req, res) => uploadController.getMediaInfo(req, res)
  );

  // Supprimer un media
  router.delete('/:id',
    authMiddleware.authenticate,
    auditMiddleware.logAction('delete_media', { entityType: 'media' }),
    (req, res) => uploadController.deleteMedia(req, res)
  );

  // ========================================================================
  // ROUTES VIDEO / AUDIO / OEUVRE MEDIA
  // ----------------------------------------------------------------------------
  // Ces routes continuent a passer par multer-storage-cloudinary (upload
  // direct streamant vers Cloudinary). On ne peut pas facilement faire
  // magic-bytes sur buffer sans encombrer la RAM (100+ MB).
  // Protections appliquees :
  //  - limits multer serrees (100 MB video / 50 MB audio)
  //  - fileValidator.uploadValidator conserve le check MIME sur file.path
  //    URL si possible, sinon sur file.mimetype en degrade
  //  - rateLimit upload 30/h/user
  // ========================================================================

  router.post('/video',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    multerErrorGuard(
      (uploadService.uploadVideo
        ? uploadService.uploadVideo()
        : uploadService.uploadMedia()
      ).single('video')
    ),
    FileValidator.uploadValidator(VIDEO_MIMES, MAX_VIDEO_SIZE),
    auditMiddleware.logAction('upload_video', { entityType: 'video' }),
    (req, res) => uploadController.uploadVideo(req, res)
  );

  router.post('/audio',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    multerErrorGuard(
      (uploadService.uploadAudio
        ? uploadService.uploadAudio()
        : uploadService.uploadMedia()
      ).single('audio')
    ),
    FileValidator.uploadValidator(AUDIO_MIMES, MAX_AUDIO_SIZE),
    auditMiddleware.logAction('upload_audio', { entityType: 'audio' }),
    (req, res) => uploadController.uploadAudio(req, res)
  );

  router.post('/oeuvre/media',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    rateLimitMiddleware.upload,
    multerErrorGuard(uploadService.uploadMedia().array('medias', MAX_OEUVRE_FILES)),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) return next();

        // Taille totale : empeche 5 fichiers de 100 MB = 500 MB par requete
        const totalSize = req.files.reduce((sum, f) => sum + (f.size || 0), 0);
        if (totalSize > MAX_MEDIA_SIZE * 2) {
          const fs = require('fs');
          req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
          return res.status(413).json({
            success: false,
            code: 'UPLOAD_TOTAL_TOO_LARGE',
            error: req.t ? req.t('upload.fileTooLarge') : 'Volume total trop important'
          });
        }

        const results = await FileValidator.validateFilesBatch(
          req.files.map(f => f.path),
          OEUVRE_MEDIA_MIMES
        );
        const invalidFiles = results.filter(r => !r.valid);
        if (invalidFiles.length > 0) {
          const fs = require('fs');
          req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
          logger.warn('upload_oeuvre_media: invalid files rejected', {
            count: invalidFiles.length,
            details: invalidFiles
          });
          return res.status(400).json({
            success: false,
            code: 'UPLOAD_INVALID_TYPE',
            error: req.t ? req.t('upload.invalidFileType') : 'Type de fichier non autorise'
          });
        }
        next();
      } catch (error) {
        next(error);
      }
    },
    auditMiddleware.logAction('upload_oeuvre_media', { entityType: 'media' }),
    (req, res) => uploadController.uploadOeuvreMedia(req, res)
  );

  // Infos de configuration upload
  router.get('/info', (req, res) => uploadController.getUploadInfo(req, res));

  // ========================================================================
  // UPLOAD MULTIPLE (images batch, authentifie)
  // Pipeline safe : memoryStorage + magic bytes + push batch vers Cloudinary.
  // ========================================================================

  router.post('/multiple',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    multerErrorGuard(uploadService.uploadImageSafe(MAX_IMAGE_SIZE).array('images', 10)),
    validateMagicBytesBuffer(IMAGE_MIMES, { maxFileSize: MAX_IMAGE_SIZE }),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) return next();
        const { uploadImageBuffer } = require('../services/upload/cloudinaryUploader');
        // Upload sequentiel : garantit qu'un echec partiel est log, et evite
        // de saturer Cloudinary / le quota.
        for (const file of req.files) {
          const result = await uploadImageBuffer(file.buffer, { originalname: file.originalname });
          file.path = result.secure_url;
          file.filename = result.public_id;
          file.size = result.bytes || file.size;
          file.buffer = undefined;
        }
        next();
      } catch (error) {
        logger.error('upload_multiple: Cloudinary batch push failed', { message: error?.message });
        return res.status(502).json({
          success: false,
          code: 'UPLOAD_STORAGE_FAILED',
          error: req.t ? req.t('upload.failed') : "Echec de l'upload, veuillez reessayer."
        });
      }
    },
    auditMiddleware.logAction('upload_multiple', { entityType: 'media' }),
    async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            error: req.t ? req.t('upload.noFile') : 'No file provided'
          });
        }

        const uploadedFiles = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          url: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));

        res.json({
          success: true,
          message: req.t ? req.t('upload.fileSuccess') : `${uploadedFiles.length} files uploaded`,
          data: uploadedFiles
        });
      } catch (error) {
        logger.error('upload_multiple: response build failed', { message: error?.message });
        res.status(500).json({
          success: false,
          code: 'UPLOAD_FAILED',
          error: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  return router;
};

module.exports = initUploadRoutes;
