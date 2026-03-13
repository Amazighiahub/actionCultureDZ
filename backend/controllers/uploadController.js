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
}

module.exports = UploadController;
