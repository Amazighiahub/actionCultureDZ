// controllers/UploadController.js

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class UploadController extends BaseController {
  get service() {
    return container.uploadService;
  }

  /**
   * Upload public d'image (sans authentification)
   */
  async uploadPublicImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      const data = await this.service.createPublicMedia(req.file);

      res.status(201).json({
        success: true,
        message: req.t('upload.imageSuccess'),
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async downloadMedia(req, res) {
    try {
      const { id } = req.params;

      if (!this.service.hasMediaModel()) {
        return res.status(501).json({
          success: false,
          error: req.t('common.notImplemented')
        });
      }

      const result = await this.service.getDownloadData(id);

      if (!result.media) {
        return res.status(404).json({
          success: false,
          error: req.t('media.notFound')
        });
      }

      // Access control for private media
      if (!result.isPublic) {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: req.t('auth.required')
          });
        }
        if (result.uploadedBy !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({
            success: false,
            error: req.t('auth.forbidden')
          });
        }
      }

      // Cloudinary URL: redirect
      if (result.isCloudinaryUrl) {
        return res.redirect(result.redirectUrl);
      }

      // Error cases for local files
      if (result.error === 'no_storage_path') {
        return res.status(500).json({
          success: false,
          error: req.t('common.serverError')
        });
      }
      if (result.error === 'invalid_path') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      return res.sendFile(result.absolutePath);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Upload photo de profil avec mise a jour automatique
   */
  async uploadProfilePhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      const data = await this.service.updateProfilePhoto(req.user.id_user, req.file);

      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Upload image generique (authentifie)
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      const data = await this.service.createAuthenticatedMedia(req.file, req.user.id_user);

      res.json({
        success: true,
        message: req.t('upload.fileSuccess'),
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtenir les infos d'un media
   */
  async getMediaInfo(req, res) {
    try {
      const { id } = req.params;

      if (!this.service.hasMediaModel()) {
        return res.status(501).json({
          success: false,
          error: req.t('common.notImplemented')
        });
      }

      const result = await this.service.getMediaInfo(id, req.user.id_user, req.user.isAdmin);

      if (!result.media) {
        return res.status(404).json({
          success: false,
          error: req.t('media.notFound')
        });
      }

      if (result.forbidden) {
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      this._sendSuccess(res, result.media);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Supprimer un media
   */
  async deleteMedia(req, res) {
    try {
      const { id } = req.params;

      if (!this.service.hasMediaModel()) {
        return res.status(501).json({
          success: false,
          error: req.t('common.notImplemented')
        });
      }

      const result = await this.service.deleteMedia(id, req.user.id_user, req.user.isAdmin);

      if (!result.media) {
        return res.status(404).json({
          success: false,
          error: req.t('media.notFound')
        });
      }

      if (result.forbidden) {
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      this._sendMessage(res, req.t('media.deleted'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // UPLOAD VIDÉO / AUDIO / DOCUMENT / OEUVRE MEDIA
  // ============================================================================

  /**
   * Upload document (authentifié)
   */
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: req.t('upload.noDocument') });
      }
      const data = await this.service.createAuthenticatedMedia(req.file, req.user.id_user);
      res.json({ success: true, message: req.t('upload.documentSuccess'), data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Upload vidéo (authentifié)
   */
  async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: req.t('upload.noVideo') });
      }
      const data = await this.service.createAuthenticatedMedia(req.file, req.user.id_user);
      res.json({ success: true, message: req.t('upload.videoSuccess'), data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Upload audio (authentifié)
   */
  async uploadAudio(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: req.t('upload.noAudio') });
      }
      const data = await this.service.createAuthenticatedMedia(req.file, req.user.id_user);
      res.json({ success: true, message: req.t('upload.audioSuccess'), data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Upload multiple médias pour une œuvre
   */
  async uploadOeuvreMedia(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: req.t('upload.noFile') });
      }

      const uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        url: `/uploads/${file.path.replace(/\\/g, '/').split('uploads/')[1] || file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        type: this._getFileType(file.mimetype)
      }));

      res.json({
        success: true,
        message: req.t('upload.mediaSuccess', { count: req.files.length }),
        data: uploadedFiles
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtenir les infos de configuration d'upload
   */
  getUploadInfo(req, res) {
    const config = require('../config/envAdapter').getConfig();
    const maxSizes = config.upload?.maxSizes || {};

    res.json({
      success: true,
      data: {
        limits: {
          image: `${(maxSizes.image || 10485760) / 1048576}MB`,
          video: `${(maxSizes.video || 104857600) / 1048576}MB`,
          audio: `${(maxSizes.audio || 52428800) / 1048576}MB`,
          document: `${(maxSizes.document || 20971520) / 1048576}MB`
        },
        supportedFormats: {
          image: ['JPEG', 'JPG', 'PNG', 'GIF', 'WebP'],
          video: ['MP4', 'MPEG', 'MOV', 'AVI'],
          audio: ['MP3', 'WAV', 'OGG'],
          document: ['PDF', 'DOC', 'DOCX']
        },
        uploadEndpoints: {
          public: '/api/upload/image/public',
          image: '/api/upload/image',
          video: '/api/upload/video',
          audio: '/api/upload/audio',
          document: '/api/upload/document',
          oeuvreMedia: '/api/upload/oeuvre/media'
        }
      }
    });
  }

  /**
   * Détermine le type de fichier depuis le mimetype
   */
  _getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'pdf';
    return 'document';
  }
}

module.exports = new UploadController();
