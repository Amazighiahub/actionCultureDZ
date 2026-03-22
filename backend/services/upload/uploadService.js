/**
 * UploadService - Business logic for media uploads
 * Architecture: Controller -> Service -> Database
 *
 * Handles all Sequelize queries (Media, User), Cloudinary operations,
 * and file system operations for uploads.
 */

const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');
const cloudinarySvc = require('../cloudinaryService');

class UploadService {
  constructor(models) {
    this.models = models;
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    this.uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
  }

  // ============================================================================
  // SECURITY HELPERS
  // ============================================================================

  /**
   * Valide et securise un chemin de fichier contre le path traversal
   * @param {string} filePath - Chemin relatif du fichier
   * @returns {string|null} - Chemin absolu securise ou null si invalide
   */
  _securePath(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;

    // Nettoyer le chemin - supprimer les protocoles et caracteres dangereux
    let cleanPath = filePath
      .replace(/^(https?:)?\/\/[^\/]+/, '') // Supprimer domaine
      .replace(/^\/+/, '') // Supprimer les slashes initiaux
      .replace(/\\/g, '/') // Normaliser les slashes
      .replace(/\.{2,}/g, '.') // Supprimer les sequences de points
      .replace(/[<>:"|?*]/g, ''); // Supprimer caracteres Windows interdits

    // Resoudre le chemin absolu
    const absolutePath = path.resolve(this.uploadsRoot, '..', cleanPath);

    // Verifier que le chemin reste dans le dossier uploads
    if (!absolutePath.startsWith(this.uploadsRoot)) {
      logger.error('Path traversal detecte:', { original: filePath, resolved: absolutePath });
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

  // ============================================================================
  // MEDIA CRUD
  // ============================================================================

  /**
   * Enregistrer un media public en base
   * @param {object} fileData - Donnees du fichier uploade (req.file)
   * @returns {object} - Donnees du media cree
   */
  async createPublicMedia(fileData) {
    const fileUrl = fileData.path;

    // Enregistrer en base si modele Media existe
    if (this.models.Media) {
      try {
        await this.models.Media.create({
          type_media: this._inferTypeMedia(fileData.mimetype, 'image'),
          url: fileUrl,
          visible_public: true,
          mime_type: fileData.mimetype,
          taille_fichier: fileData.size,
          metadata: {
            uploadedBy: null,
            originalName: fileData.originalname,
            cloudinaryPublicId: fileData.filename,
            cloudinaryResourceType: 'image'
          }
        });
      } catch (dbError) {
        // Continue even if DB save fails
      }
    }

    return {
      filename: fileData.filename,
      originalName: fileData.originalname,
      url: fileUrl,
      fullUrl: fileUrl,
      size: fileData.size,
      mimetype: fileData.mimetype
    };
  }

  /**
   * Recuperer un media par ID
   * @param {number} id
   * @returns {object|null}
   */
  async getMediaById(id) {
    if (!this.models.Media) return null;
    return this.models.Media.findByPk(id);
  }

  /**
   * Verifier si le modele Media est disponible
   * @returns {boolean}
   */
  hasMediaModel() {
    return !!this.models.Media;
  }

  /**
   * Obtenir les donnees de download d'un media
   * @param {number} id
   * @returns {object} - { media, isCloudinaryUrl, redirectUrl, absolutePath }
   */
  async getDownloadData(id) {
    const media = await this.getMediaById(id);
    if (!media) return { media: null };

    const isPublic = this._getMediaVisibility(media);
    const uploadedBy = this._getUploadedBy(media);

    // Check if Cloudinary URL
    if (cloudinarySvc.isCloudinaryUrl(media.url)) {
      return { media, isPublic, uploadedBy, isCloudinaryUrl: true, redirectUrl: media.url };
    }

    // Retrocompatibilite: fichier local
    const storagePath = this._getStoragePath(media);
    if (!storagePath) {
      return { media, isPublic, uploadedBy, isCloudinaryUrl: false, error: 'no_storage_path' };
    }

    const absolutePath = this._securePath(storagePath);
    if (!absolutePath) {
      return { media, isPublic, uploadedBy, isCloudinaryUrl: false, error: 'invalid_path' };
    }

    return { media, isPublic, uploadedBy, isCloudinaryUrl: false, absolutePath };
  }

  /**
   * Upload et mise a jour photo de profil
   * @param {number} userId
   * @param {object} fileData - Donnees du fichier uploade (req.file)
   * @returns {object} - Donnees de la photo mise a jour
   */
  async updateProfilePhoto(userId, fileData) {
    const fileUrl = fileData.path; // URL Cloudinary complete

    // Recuperer l'ancienne photo pour la supprimer
    const user = await this.models.User.findByPk(userId);
    const oldPhotoUrl = user.photo_url;

    // Mettre a jour l'utilisateur
    await user.update({ photo_url: fileUrl });

    // Supprimer l'ancienne photo Cloudinary si elle existe
    if (oldPhotoUrl && oldPhotoUrl !== fileUrl) {
      try {
        if (cloudinarySvc.isCloudinaryUrl(oldPhotoUrl)) {
          const oldPublicId = cloudinarySvc.extractPublicId(oldPhotoUrl);
          if (oldPublicId) await cloudinarySvc.deleteAsset(oldPublicId, 'image');
        } else {
          // Retrocompatibilite: ancienne photo locale
          const oldPath = this._securePath(oldPhotoUrl);
          if (oldPath) await fs.unlink(oldPath).catch(() => {});
        }
      } catch (err) {
        // Impossible de supprimer l'ancienne photo, continuer
      }
    }

    // Enregistrer en base si modele Media existe
    if (this.models.Media) {
      try {
        await this.models.Media.create({
          type_media: 'image',
          url: fileUrl,
          visible_public: true,
          mime_type: fileData.mimetype,
          taille_fichier: fileData.size,
          metadata: {
            uploadedBy: userId,
            originalName: fileData.originalname,
            cloudinaryPublicId: fileData.filename,
            cloudinaryResourceType: 'image'
          }
        });
      } catch (dbError) {
        // Erreur enregistrement Media, continuer
      }
    }

    return {
      filename: fileData.filename,
      url: fileUrl,
      fullUrl: `${this.baseUrl}${fileUrl}`
    };
  }

  /**
   * Upload image generique (authentifie)
   * @param {object} fileData - Donnees du fichier uploade (req.file)
   * @param {number} userId - ID de l'utilisateur
   * @returns {object} - Donnees du media cree
   */
  async createAuthenticatedMedia(fileData, userId) {
    const fileUrl = fileData.path;
    const resourceType = cloudinarySvc.getResourceType(fileData.mimetype);

    let mediaId = null;
    if (this.models.Media) {
      try {
        const media = await this.models.Media.create({
          type_media: this._inferTypeMedia(fileData.mimetype, 'image'),
          url: fileUrl,
          visible_public: false,
          mime_type: fileData.mimetype,
          taille_fichier: fileData.size,
          metadata: {
            uploadedBy: userId,
            originalName: fileData.originalname,
            cloudinaryPublicId: fileData.filename,
            cloudinaryResourceType: resourceType
          }
        });
        mediaId = media.id_media;
      } catch (dbError) {
        // Erreur enregistrement Media
      }
    }

    return {
      id: mediaId,
      filename: fileData.filename,
      originalName: fileData.originalname,
      url: fileUrl,
      fullUrl: fileUrl,
      size: fileData.size,
      mimetype: fileData.mimetype,
      uploadedBy: userId
    };
  }

  /**
   * Supprimer un media (fichier + base)
   * @param {number} id - ID du media
   * @param {number} userId - ID de l'utilisateur demandant la suppression
   * @param {boolean} isAdmin - Si l'utilisateur est admin
   * @returns {object} - { success, media }
   */
  async deleteMedia(id, userId, isAdmin) {
    const media = await this.getMediaById(id);
    if (!media) return { media: null };

    // Verifier les permissions
    const uploadedBy = this._getUploadedBy(media);
    if (uploadedBy !== userId && !isAdmin) {
      return { media, forbidden: true };
    }

    // Supprimer le fichier Cloudinary ou local
    try {
      const meta = media.metadata && typeof media.metadata === 'object' ? media.metadata : {};
      const publicId = meta.cloudinaryPublicId || cloudinarySvc.extractPublicId(media.url);

      if (publicId) {
        const resourceType = meta.cloudinaryResourceType ||
                             cloudinarySvc.getResourceType(media.mime_type);
        await cloudinarySvc.deleteAsset(publicId, resourceType);
      } else {
        // Retrocompatibilite: fichier local
        const storagePath = this._getStoragePath(media) || media.url;
        const filePath = this._securePath(storagePath);
        if (filePath) await fs.unlink(filePath).catch(() => {});
      }
    } catch (err) {
      // Erreur suppression fichier, continuer
    }

    // Supprimer de la base
    await media.destroy();

    return { media, success: true };
  }

  /**
   * Obtenir les infos d'un media avec verification des permissions
   * @param {number} id
   * @param {number} userId
   * @param {boolean} isAdmin
   * @returns {object} - { media, forbidden }
   */
  async getMediaInfo(id, userId, isAdmin) {
    const media = await this.getMediaById(id);
    if (!media) return { media: null };

    const isPublic = this._getMediaVisibility(media);
    const uploadedBy = this._getUploadedBy(media);

    if (!isPublic && uploadedBy !== userId && !isAdmin) {
      return { media, forbidden: true };
    }

    return { media };
  }
}

module.exports = UploadService;
