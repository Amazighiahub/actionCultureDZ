// routes/uploadRoutes.js
const fs = require('fs');
const express = require('express');
const router = express.Router();
const uploadService = require('../services/uploadService');
const auditMiddleware = require('../middlewares/auditMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const {
  validateMagicBytesBuffer,
  pushBufferToCloudinary,
  multerErrorGuard,
  secureDiskUpload
} = require('../middlewares/uploadSecurity');
const logger = require('../utils/logger');

// ============================================================================
// LIMITES ALIGNEES FILEVALIDATOR vs MULTER
// ----------------------------------------------------------------------------
// Sans alignement, multer accepte le fichier entier (bande passante consommee,
// RAM) avant que fileValidator ne le rejette. On veut que multer coupe des le
// depassement.
// ============================================================================
const {
  MAX_IMAGE_SIZE, MAX_DOCUMENT_SIZE, MAX_VIDEO_SIZE, MAX_AUDIO_SIZE, MAX_MEDIA_SIZE,
  IMAGE_MIMES, DOCUMENT_MIMES, VIDEO_MIMES, AUDIO_MIMES, MEDIA_MIMES: OEUVRE_MEDIA_MIMES
} = require('../constants/uploadMimes');
const MAX_OEUVRE_FILES = 5;                                             // au lieu de 10


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
          'POST /image/public': 'Upload public (inscription)'
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

  // (pas d'upload public de documents : il permettait d'héberger des PDF anonymes sur notre
  //  compte Cloudinary ; les documents passent par la route authentifiée /document)

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
  // Gros fichiers : écriture sur disque temporaire (pas en RAM), validation de la
  // signature binaire, PUIS envoi vers Cloudinary (secureDiskUpload).
  // Auparavant le fichier partait sur Cloudinary avant toute validation.
  // ========================================================================

  router.post('/video',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    ...secureDiskUpload({ field: 'video', mimes: VIDEO_MIMES, maxFileSize: MAX_VIDEO_SIZE }),
    auditMiddleware.logAction('upload_video', { entityType: 'video' }),
    (req, res) => uploadController.uploadVideo(req, res)
  );

  router.post('/audio',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    ...secureDiskUpload({ field: 'audio', mimes: AUDIO_MIMES, maxFileSize: MAX_AUDIO_SIZE }),
    auditMiddleware.logAction('upload_audio', { entityType: 'audio' }),
    (req, res) => uploadController.uploadAudio(req, res)
  );

  const [receiveOeuvreMedia, validateOeuvreMedia, pushOeuvreMedia] = secureDiskUpload({
    field: 'medias', mimes: OEUVRE_MEDIA_MIMES, maxFileSize: MAX_MEDIA_SIZE, maxFiles: MAX_OEUVRE_FILES
  });
  router.post('/oeuvre/media',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    rateLimitMiddleware.upload,
    receiveOeuvreMedia,
    // Taille totale : empêche 5 fichiers de 100 MB = 500 MB par requête
    async (req, res, next) => {
      const files = req.files || [];
      const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
      if (totalSize <= MAX_MEDIA_SIZE * 2) return next();
      await Promise.all(files.map(f => fs.promises.unlink(f.path).catch(() => {})));
      return res.status(413).json({
        success: false,
        code: 'UPLOAD_TOTAL_TOO_LARGE',
        error: req.t ? req.t('upload.fileTooLarge') : 'Volume total trop important'
      });
    },
    validateOeuvreMedia,
    pushOeuvreMedia,
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
