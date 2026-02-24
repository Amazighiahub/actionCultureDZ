// controllers/UploadController.js
const path = require('path');
const fs = require('fs').promises;

class UploadController {
  constructor(models) {
    this.models = models;
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  }

  /**
   * Upload public d'image (sans authentification)
   */
  async uploadPublicImage(req, res) {
    try {
      console.log('📸 Upload public - Début');
      
      // Vérifier la présence du fichier
      if (!req.file) {
        console.log('❌ Aucun fichier reçu');
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni'
        });
      }

      console.log('📁 Fichier reçu:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      // Construire l'URL du fichier
      const fileUrl = `/uploads/images/${req.file.filename}`;
      const fullUrl = `${this.baseUrl}${fileUrl}`;

      // Si un modèle Media existe, enregistrer en base
      if (this.models.Media) {
        try {
          const media = await this.models.Media.create({
            filename: req.file.filename,
            original_name: req.file.originalname,
            file_path: req.file.path,
            file_url: fileUrl,
            mime_type: req.file.mimetype,
            size: req.file.size,
            type: 'image',
            uploaded_by: null, // Upload public
            is_public: true
          });
          console.log('✅ Media enregistré en base:', media.id_media);
        } catch (dbError) {
          console.log('⚠️ Erreur enregistrement base (ignorée):', dbError.message);
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

      console.log('✅ Upload public réussi:', response.data.url);
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

      // Supprimer l'ancienne photo si elle existe
      if (oldPhotoUrl && oldPhotoUrl !== fileUrl) {
        try {
          const oldPath = path.join(__dirname, '..', oldPhotoUrl);
          await fs.unlink(oldPath);
          console.log('🗑️ Ancienne photo supprimée');
        } catch (err) {
          console.log('⚠️ Impossible de supprimer l\'ancienne photo:', err.message);
        }
      }

      // Enregistrer en base si modèle Media existe
      if (this.models.Media) {
        try {
          await this.models.Media.create({
            filename: req.file.filename,
            original_name: req.file.originalname,
            file_path: req.file.path,
            file_url: fileUrl,
            mime_type: req.file.mimetype,
            size: req.file.size,
            type: 'profile_photo',
            uploaded_by: userId,
            is_public: true
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

      const fileUrl = `/uploads/${req.file.fieldname}s/${req.file.filename}`;

      // Enregistrer en base si modèle Media existe
      let mediaId = null;
      if (this.models.Media) {
        try {
          const media = await this.models.Media.create({
            filename: req.file.filename,
            original_name: req.file.originalname,
            file_path: req.file.path,
            file_url: fileUrl,
            mime_type: req.file.mimetype,
            size: req.file.size,
            type: req.file.fieldname || 'image',
            uploaded_by: req.user.id_user,
            is_public: false
          });
          mediaId = media.id_media;
        } catch (dbError) {
          console.log('⚠️ Erreur enregistrement Media:', dbError.message);
        }
      }

      res.json({
        success: true,
        message: 'Fichier uploadé avec succès',
        data: {
          id: mediaId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          fullUrl: `${this.baseUrl}${fileUrl}`,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadedBy: req.user.id_user
        }
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

      const media = await this.models.Media.findByPk(id, {
        include: [{
          model: this.models.User,
          as: 'Uploader',
          attributes: ['id_user', 'nom', 'prenom', 'email']
        }]
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      // Vérifier les permissions
      if (!media.is_public && media.uploaded_by !== req.user.id_user) {
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
      if (media.uploaded_by !== req.user.id_user && req.user.role !== 'Admin') {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à supprimer ce média'
        });
      }

      // Supprimer le fichier physique
      try {
        const filePath = path.join(__dirname, '..', media.file_url);
        await fs.unlink(filePath);
        console.log('🗑️ Fichier supprimé:', filePath);
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