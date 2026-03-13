// controllers/UploadController.js
const path = require('path');
const fs = require('fs').promises;
const cloudinarySvc = require('../services/cloudinaryService');

class UploadController {
  constructor(models) {
    this.models = models;
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    // 🔒 Répertoire racine autorisé pour les uploads
    this.uploadsRoot = path.resolve(__dirname, '..', 'uploads');
  }

  /**
   * 🔒 Valide et sécurise un chemin de fichier contre le path traversal
   * @param {string} filePath - Chemin relatif du fichier
   * @returns {string|null} - Chemin absolu sécurisé ou null si invalide
   */
  _securePath(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;

    // Nettoyer le chemin - supprimer les protocoles et caractères dangereux
    let cleanPath = filePath
      .replace(/^(https?:)?\/\/[^\/]+/, '') // Supprimer domaine
      .replace(/^\/+/, '') // Supprimer les slashes initiaux (évite path.resolve vers la racine disque)
      .replace(/\\/g, '/') // Normaliser les slashes
      .replace(/\.{2,}/g, '.') // Supprimer les séquences de points
      .replace(/[<>:"|?*]/g, ''); // Supprimer caractères Windows interdits

    // Résoudre le chemin absolu
    const absolutePath = path.resolve(__dirname, '..', cleanPath);

    // 🔒 Vérifier que le chemin reste dans le dossier uploads
    if (!absolutePath.startsWith(this.uploadsRoot)) {
      console.error('Path traversal détecté:', { original: filePath, resolved: absolutePath });
      return null;
    }

    return absolutePath;
  }

  _getMediaVisibility(media) {
    if (!media) return true;
    if (typeof media.visible_public === 'boolean') return media.visible_public;
    return true;
  }

  _getUploadedBy(media) {
    if (!media) return null;
    const meta = media.metadata && typeof media.metadata === 'object' ? media.metadata : {};
    return meta.uploadedBy ?? null;
  }

  _getStoragePath(media) {
    if (!media) return null;
    const meta = media.metadata && typeof media.metadata === 'object' ? media.metadata : {};
    return meta.storagePath ?? null;
  }

  _inferTypeMedia(mimetype, fallback = 'document') {
    if (typeof mimetype !== 'string') return fallback;
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf' || mimetype.includes('word')) return 'document';
    return fallback;
  }

  /**
   * Upload public d'image (sans authentification)
   */
  async uploadPublicImage(req, res) {
    try {
      // Vérifier la présence du fichier
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      // URL Cloudinary (déjà complète : https://res.cloudinary.com/...)
      const fileUrl = req.file.path;
      const fullUrl = req.file.path;

      // Si un modèle Media existe, enregistrer en base
      if (this.models.Media) {
        try {
          const media = await this.models.Media.create({
            type_media: this._inferTypeMedia(req.file.mimetype, 'image'),
            url: fileUrl,
            visible_public: true,
            mime_type: req.file.mimetype,
            taille_fichier: req.file.size,
            metadata: {
              uploadedBy: null,
              originalName: req.file.originalname,
              cloudinaryPublicId: req.file.filename,
              cloudinaryResourceType: 'image'
            }
          });
        } catch (dbError) {
          // On continue même si l'enregistrement en base échoue
        }
      }

      // Réponse succès
      const response = {
        success: true,
        message: req.t('upload.imageSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,           // URL relative
          fullUrl: fullUrl,       // URL complète
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Erreur upload public:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError'),
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async downloadMedia(req, res) {
    try {
      const { id } = req.params;

      if (!this.models.Media) {
        return res.status(501).json({
          success: false,
          error: req.t('common.notImplemented')
        });
      }

      const media = await this.models.Media.findByPk(id);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: req.t('media.notFound')
        });
      }

      const isPublic = this._getMediaVisibility(media);
      const uploadedBy = this._getUploadedBy(media);

      if (!isPublic) {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: req.t('auth.required')
          });
        }
        if (uploadedBy !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({
            success: false,
            error: req.t('auth.forbidden')
          });
        }
      }

      // Fichier Cloudinary : redirection directe vers l'URL CDN
      if (cloudinarySvc.isCloudinaryUrl(media.url)) {
        return res.redirect(media.url);
      }

      // Rétrocompatibilité : fichier local
      const storagePath = this._getStoragePath(media);
      if (!storagePath) {
        return res.status(500).json({
          success: false,
          error: req.t('common.serverError')
        });
      }

      const absolutePath = this._securePath(storagePath);
      if (!absolutePath) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      return res.sendFile(absolutePath);
    } catch (error) {
      console.error('Erreur download média:', error);
      return res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  /**
   * Upload photo de profil avec mise à jour automatique
   */
  async uploadProfilePhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      const userId = req.user.id_user;
      const fileUrl = req.file.path; // URL Cloudinary complète

      // Récupérer l'ancienne photo pour la supprimer
      const user = await this.models.User.findByPk(userId);
      const oldPhotoUrl = user.photo_url;

      // Mettre à jour l'utilisateur
      await user.update({ photo_url: fileUrl });

      // Supprimer l'ancienne photo Cloudinary si elle existe
      if (oldPhotoUrl && oldPhotoUrl !== fileUrl) {
        try {
          if (cloudinarySvc.isCloudinaryUrl(oldPhotoUrl)) {
            const oldPublicId = cloudinarySvc.extractPublicId(oldPhotoUrl);
            if (oldPublicId) await cloudinarySvc.deleteAsset(oldPublicId, 'image');
          } else {
            // Rétrocompatibilité : ancienne photo locale
            const oldPath = this._securePath(oldPhotoUrl);
            if (oldPath) await fs.unlink(oldPath).catch(() => {});
          }
        } catch (err) {
          // Impossible de supprimer l'ancienne photo, continuer
        }
      }

      // Enregistrer en base si modèle Media existe
      if (this.models.Media) {
        try {
          await this.models.Media.create({
            type_media: 'image',
            url: fileUrl,
            visible_public: true,
            mime_type: req.file.mimetype,
            taille_fichier: req.file.size,
            metadata: {
              uploadedBy: userId,
              originalName: req.file.originalname,
              cloudinaryPublicId: req.file.filename,
              cloudinaryResourceType: 'image'
            }
          });
        } catch (dbError) {
          // Erreur enregistrement Media, continuer
        }
      }

      res.json({
        success: true,
        message: req.t('upload.profilePhotoUpdated'),
        data: {
          filename: req.file.filename,
          url: fileUrl,
          fullUrl: `${this.baseUrl}${fileUrl}`
        }
      });

    } catch (error) {
      console.error('Erreur upload photo profil:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  /**
   * Upload image générique (authentifié)
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      // URL Cloudinary directe (pas de déplacement local nécessaire)
      const fileUrl = req.file.path;
      const resourceType = cloudinarySvc.getResourceType(req.file.mimetype);

      // Enregistrer en base si modèle Media existe
      let mediaId = null;
      if (this.models.Media) {
        try {
          const media = await this.models.Media.create({
            type_media: this._inferTypeMedia(req.file.mimetype, 'image'),
            url: fileUrl,
            visible_public: false,
            mime_type: req.file.mimetype,
            taille_fichier: req.file.size,
            metadata: {
              uploadedBy: req.user.id_user,
              originalName: req.file.originalname,
              cloudinaryPublicId: req.file.filename,
              cloudinaryResourceType: resourceType
            }
          });
          mediaId = media.id_media;

          return res.json({
            success: true,
            message: req.t('upload.fileSuccess'),
            data: {
              id: mediaId,
              filename: req.file.filename,
              originalName: req.file.originalname,
              url: fileUrl,
              fullUrl: fileUrl,
              size: req.file.size,
              mimetype: req.file.mimetype,
              uploadedBy: req.user.id_user
            }
          });
        } catch (dbError) {
          // Erreur enregistrement Media
        }
      }

      // Pas de modèle Media : retourner l'URL Cloudinary directement
      return res.json({
        success: true,
        message: req.t('upload.fileSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          fullUrl: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Erreur upload:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  /**
   * Obtenir les infos d'un média
   */
  async getMediaInfo(req, res) {
    try {
      const { id } = req.params;

      if (!this.models.Media) {
        return res.status(501).json({
          success: false,
          error: req.t('common.notImplemented')
        });
      }

      const media = await this.models.Media.findByPk(id);

      if (!media) {
        return res.status(404).json({
          success: false,
          error: req.t('media.notFound')
        });
      }

      // Vérifier les permissions
      const isPublic = this._getMediaVisibility(media);
      const uploadedBy = this._getUploadedBy(media);
      if (!isPublic && uploadedBy !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      res.json({
        success: true,
        data: media
      });

    } catch (error) {
      console.error('Erreur récupération média:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(req, res) {
    try {
      const { id } = req.params;

      if (!this.models.Media) {
        // Si pas de modèle Media, on ne peut pas supprimer
        return res.status(501).json({
          success: false,
          error: req.t('common.notImplemented')
        });
      }

      const media = await this.models.Media.findByPk(id);

      if (!media) {
        return res.status(404).json({
          success: false,
          error: req.t('media.notFound')
        });
      }

      // Vérifier les permissions
      const uploadedBy = this._getUploadedBy(media);
      if (uploadedBy !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      // Supprimer le fichier Cloudinary ou local (rétrocompatibilité)
      try {
        const meta = media.metadata && typeof media.metadata === 'object' ? media.metadata : {};
        const publicId = meta.cloudinaryPublicId || cloudinarySvc.extractPublicId(media.url);

        if (publicId) {
          const resourceType = meta.cloudinaryResourceType ||
                               cloudinarySvc.getResourceType(media.mime_type);
          await cloudinarySvc.deleteAsset(publicId, resourceType);
        } else {
          // Rétrocompatibilité : fichier local
          const storagePath = this._getStoragePath(media) || media.url;
          const filePath = this._securePath(storagePath);
          if (filePath) await fs.unlink(filePath).catch(() => {});
        }
      } catch (err) {
        // Erreur suppression fichier, continuer
      }

      // Supprimer de la base
      await media.destroy();

      res.json({
        success: true,
        message: req.t('media.deleted')
      });

    } catch (error) {
      console.error('Erreur suppression média:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }
}

module.exports = UploadController;