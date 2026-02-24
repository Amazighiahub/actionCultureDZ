// controllers/UploadController.js
const path = require('path');
const fs = require('fs').promises;

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
      console.error('🚨 Path traversal détecté:', { original: filePath, resolved: absolutePath });
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('📸 Upload public - Début');
      }
      
      // Vérifier la présence du fichier
      if (!req.file) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('❌ Aucun fichier reçu');
        }
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni'
        });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('📁 Fichier reçu:', {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        });
      }

      // Construire l'URL du fichier
      const folder = req.file.fieldname === 'document' ? 'documents' : 'images';
      const fileUrl = `/uploads/${folder}/${req.file.filename}`;
      const fullUrl = `${this.baseUrl}${fileUrl}`;

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
              storagePath: `uploads/${folder}/${req.file.filename}`
            }
          });
          if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Media enregistré en base:', media.id_media);
          }
        } catch (dbError) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('⚠️ Erreur enregistrement base (ignorée):', dbError.message);
          }
          // On continue même si l'enregistrement en base échoue
        }
      }

      // Réponse succès
      const response = {
        success: true,
        message: 'Image uploadée avec succès',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,           // URL relative
          fullUrl: fullUrl,       // URL complète
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Upload public réussi:', response.data.url);
      }
      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Erreur upload public:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload de l\'image',
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
          error: 'Modèle Media non disponible'
        });
      }

      const media = await this.models.Media.findByPk(id);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      const isPublic = this._getMediaVisibility(media);
      const uploadedBy = this._getUploadedBy(media);

      if (!isPublic) {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Authentification requise'
          });
        }
        if (uploadedBy !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Accès non autorisé'
          });
        }
      }

      const storagePath = this._getStoragePath(media);
      if (!storagePath) {
        return res.status(500).json({
          success: false,
          error: 'Chemin du fichier indisponible'
        });
      }

      const absolutePath = this._securePath(storagePath);
      if (!absolutePath) {
        return res.status(400).json({
          success: false,
          error: 'Chemin du fichier invalide'
        });
      }

      return res.sendFile(absolutePath);
    } catch (error) {
      console.error('❌ Erreur download média:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Upload photo de profil avec mise à jour automatique
   */
  async uploadProfilePhoto(req, res) {
    try {
      console.log('👤 Upload photo profil - User:', req.user.id_user);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucune image fournie'
        });
      }

      const userId = req.user.id_user;
      const fileUrl = `/uploads/images/${req.file.filename}`;

      // Récupérer l'ancienne photo pour la supprimer
      const user = await this.models.User.findByPk(userId);
      const oldPhotoUrl = user.photo_url;

      // Mettre à jour l'utilisateur
      await user.update({ photo_url: fileUrl });

      // 🔒 Supprimer l'ancienne photo si elle existe (avec protection path traversal)
      if (oldPhotoUrl && oldPhotoUrl !== fileUrl) {
        try {
          const oldPath = this._securePath(oldPhotoUrl);
          if (oldPath) {
            await fs.unlink(oldPath);
            console.log('🗑️ Ancienne photo supprimée');
          } else {
            console.log('⚠️ Chemin non sécurisé ignoré:', oldPhotoUrl);
          }
        } catch (err) {
          console.log('⚠️ Impossible de supprimer l\'ancienne photo:', err.message);
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
              storagePath: `uploads/images/${req.file.filename}`
            }
          });
        } catch (dbError) {
          console.log('⚠️ Erreur enregistrement Media:', dbError.message);
        }
      }

      console.log('✅ Photo profil mise à jour');

      res.json({
        success: true,
        message: 'Photo de profil mise à jour',
        data: {
          filename: req.file.filename,
          url: fileUrl,
          fullUrl: `${this.baseUrl}${fileUrl}`
        }
      });

    } catch (error) {
      console.error('❌ Erreur upload photo profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload'
      });
    }
  }

  /**
   * Upload image générique (authentifié)
   */
  async uploadImage(req, res) {
    try {
      console.log('🖼️ Upload image - User:', req.user.email);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni'
        });
      }

      const privateDir = path.join(this.uploadsRoot, 'private', `${req.file.fieldname}s`);
      const privateStoragePath = path.join(privateDir, req.file.filename);

      try {
        await fs.mkdir(privateDir, { recursive: true });
        await fs.rename(req.file.path, privateStoragePath);
      } catch (moveError) {
        console.error('❌ Erreur déplacement fichier vers private:', moveError);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la sécurisation du fichier'
        });
      }

      // Enregistrer en base si modèle Media existe
      let mediaId = null;
      if (this.models.Media) {
        try {
          const media = await this.models.Media.create({
            type_media: this._inferTypeMedia(req.file.mimetype, 'image'),
            url: '/api/upload/file/pending',
            visible_public: false,
            mime_type: req.file.mimetype,
            taille_fichier: req.file.size,
            metadata: {
              uploadedBy: req.user.id_user,
              originalName: req.file.originalname,
              storagePath: `uploads/private/${req.file.fieldname}s/${req.file.filename}`
            }
          });
          mediaId = media.id_media;
          const downloadUrl = `/api/upload/file/${mediaId}`;
          await media.update({ url: downloadUrl });
          const fileUrlForResponse = downloadUrl;

          return res.json({
            success: true,
            message: 'Fichier uploadé avec succès',
            data: {
              id: mediaId,
              filename: req.file.filename,
              originalName: req.file.originalname,
              url: fileUrlForResponse,
              fullUrl: `${this.baseUrl}${fileUrlForResponse}`,
              size: req.file.size,
              mimetype: req.file.mimetype,
              uploadedBy: req.user.id_user
            }
          });
        } catch (dbError) {
          console.log('⚠️ Erreur enregistrement Media:', dbError.message);
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement du média'
      });

    } catch (error) {
      console.error('❌ Erreur upload:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload'
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
          error: 'Modèle Media non disponible'
        });
      }

      const media = await this.models.Media.findByPk(id);

      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      // Vérifier les permissions
      const isPublic = this._getMediaVisibility(media);
      const uploadedBy = this._getUploadedBy(media);
      if (!isPublic && uploadedBy !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      res.json({
        success: true,
        data: media
      });

    } catch (error) {
      console.error('❌ Erreur récupération média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
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
          error: 'Suppression non disponible'
        });
      }

      const media = await this.models.Media.findByPk(id);

      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      // Vérifier les permissions
      const uploadedBy = this._getUploadedBy(media);
      if (uploadedBy !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à supprimer ce média'
        });
      }

      // 🔒 Supprimer le fichier physique (avec protection path traversal)
      try {
        const storagePath = this._getStoragePath(media) || media.url;
        const filePath = this._securePath(storagePath);
        if (filePath) {
          await fs.unlink(filePath);
          console.log('🗑️ Fichier supprimé:', filePath);
        } else {
          console.log('⚠️ Chemin non sécurisé ignoré:', storagePath);
        }
      } catch (err) {
        console.log('⚠️ Erreur suppression fichier:', err.message);
      }

      // Supprimer de la base
      await media.destroy();

      res.json({
        success: true,
        message: 'Média supprimé avec succès'
      });

    } catch (error) {
      console.error('❌ Erreur suppression média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression'
      });
    }
  }
}

module.exports = UploadController;