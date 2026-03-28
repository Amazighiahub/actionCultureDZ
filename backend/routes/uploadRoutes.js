// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadService = require('../services/uploadService');
const auditMiddleware = require('../middlewares/auditMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const FileValidator = require('../utils/fileValidator');

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
          'POST /image': 'Upload image générique',
          'POST /profile-photo': 'Upload photo profil (mise à jour auto)',
          'POST /document': 'Upload document',
          'GET /:id': 'Obtenir infos média',
          'DELETE /:id': 'Supprimer média'
        }
      },
      config: {
        maxSize: {
          image: '10MB',
          document: '50MB'
        },
        formats: {
          image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          document: ['pdf', 'doc', 'docx', 'txt']
        }
      }
    });
  });

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // Upload public d'image (pour inscription)
  router.post('/image/public',
    ...rateLimitMiddleware.publicUpload,
    (req, res, next) => {
      const upload = uploadService.uploadImage().single('image');
      upload(req, res, (err) => {
        if (err) {
          console.error('Erreur upload Cloudinary:', err.message, err.http_code || '');
          return res.status(500).json({
            success: false,
            error: 'Erreur upload image: ' + err.message
          });
        }
        next();
      });
    },
    FileValidator.uploadValidator(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 10 * 1024 * 1024),
    auditMiddleware.logAction('upload_image_public', { entityType: 'media' }),
    (req, res) => uploadController.uploadPublicImage(req, res)
  );

  // Upload public de document
  router.post('/document/public',
    ...rateLimitMiddleware.publicUpload,
    uploadService.uploadDocument().single('document'),
    FileValidator.uploadValidator(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], 50 * 1024 * 1024),
    auditMiddleware.logAction('upload_document_public', { entityType: 'media' }),
    (req, res) => uploadController.uploadPublicImage(req, res) // Réutilise la même logique
  );

  // ========================================================================
  // ROUTES AUTHENTIFIÉES
  // ========================================================================
  router.get('/file/:id',
    authMiddleware.optionalAuth,
    (req, res) => uploadController.downloadMedia(req, res)
  );

  // Upload photo de profil avec mise à jour automatique
  router.post('/profile-photo',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    uploadService.uploadImage().single('image'),
    FileValidator.uploadValidator(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 10 * 1024 * 1024),
    auditMiddleware.logAction('upload_profile_photo', { entityType: 'media' }),
    (req, res) => uploadController.uploadProfilePhoto(req, res)
  );

  // Upload image générique
  router.post('/image',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    uploadService.uploadImage().single('image'),
    FileValidator.uploadValidator(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 10 * 1024 * 1024),
    auditMiddleware.logAction('upload_image', { entityType: 'media' }),
    (req, res) => uploadController.uploadImage(req, res)
  );

  // Upload document
  router.post('/document',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    uploadService.uploadDocument().single('document'),
    FileValidator.uploadValidator(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], 50 * 1024 * 1024),
    auditMiddleware.logAction('upload_document', { entityType: 'media' }),
    (req, res) => uploadController.uploadImage(req, res) // Même logique avec document
  );

  // Obtenir les infos d'un média
  router.get('/:id',
    authMiddleware.authenticate,
    (req, res) => uploadController.getMediaInfo(req, res)
  );

  // Supprimer un média
  router.delete('/:id',
    authMiddleware.authenticate,
    auditMiddleware.logAction('delete_media', { entityType: 'media' }),
    (req, res) => uploadController.deleteMedia(req, res)
  );

  // ========================================================================
  // ROUTES VIDÉO / AUDIO / OEUVRE MEDIA
  // ========================================================================

  // Upload vidéo
  router.post('/video',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    uploadService.uploadVideo ? uploadService.uploadVideo().single('video') : uploadService.uploadMedia().single('video'),
    FileValidator.uploadValidator(
      ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
      parseInt(process.env.UPLOAD_VIDEO_MAX_SIZE) || 100 * 1024 * 1024
    ),
    auditMiddleware.logAction('upload_video', { entityType: 'video' }),
    (req, res) => uploadController.uploadVideo(req, res)
  );

  // Upload audio
  router.post('/audio',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    uploadService.uploadAudio ? uploadService.uploadAudio().single('audio') : uploadService.uploadMedia().single('audio'),
    FileValidator.uploadValidator(
      ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'],
      parseInt(process.env.UPLOAD_AUDIO_MAX_SIZE) || 50 * 1024 * 1024
    ),
    auditMiddleware.logAction('upload_audio', { entityType: 'audio' }),
    (req, res) => uploadController.uploadAudio(req, res)
  );

  // Upload médias d'œuvre (multiple)
  router.post('/oeuvre/media',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    rateLimitMiddleware.upload,
    uploadService.uploadMedia().array('medias', 10),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) return next();
        const allowedTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
          'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac',
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const results = await FileValidator.validateFilesBatch(
          req.files.map(f => f.path),
          allowedTypes
        );
        const invalidFiles = results.filter(r => !r.valid);
        if (invalidFiles.length > 0) {
          const fs = require('fs');
          req.files.forEach(f => {
            try { fs.unlinkSync(f.path); } catch (e) { /* ignore */ }
          });
          return res.status(400).json({
            success: false,
            error: req.t ? req.t('upload.invalidFileType') : 'Invalid file type',
            details: invalidFiles
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
  // ROUTES POUR GESTION AVANCÉE (si nécessaire)
  // ========================================================================

  // Upload multiple
  router.post('/multiple',
    authMiddleware.authenticate,
    rateLimitMiddleware.upload,
    uploadService.uploadImage().array('images', 10), // Max 10 images
    // 🔒 Validation du type réel des fichiers uploadés (batch)
    async (req, res, next) => {
      if (!req.files || req.files.length === 0) return next();
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const results = await FileValidator.validateFilesBatch(
        req.files.map(f => f.path),
        allowedTypes
      );
      const invalidFiles = results.filter(r => !r.valid);
      if (invalidFiles.length > 0) {
        // Supprimer tous les fichiers (invalides inclus)
        const fs = require('fs');
        req.files.forEach(f => {
          try { fs.unlinkSync(f.path); } catch (e) { /* ignore */ }
        });
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('upload.invalidFormat') : 'Invalid file type',
          details: invalidFiles
        });
      }
      next();
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
          url: `/uploads/images/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype
        }));

        res.json({
          success: true,
          message: req.t ? req.t('upload.fileSuccess') : `${uploadedFiles.length} files uploaded`,
          data: uploadedFiles
        });
      } catch (error) {
        console.error('Erreur upload multiple:', error);
        res.status(500).json({
          success: false,
          error: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // ========================================================================
  // LOG DES ROUTES
  // ========================================================================

  const routeCount = router.stack.filter(layer => layer.route).length;

  return router;
};

module.exports = initUploadRoutes;