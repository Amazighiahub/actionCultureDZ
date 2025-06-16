// controllers/UserController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const TYPE_USER_IDS = {
  VISITEUR: 1,
  ECRIVAIN: 2,
  JOURNALISTE: 3,
  SCIENTIFIQUE: 4,
  ACTEUR: 5,
  ARTISTE: 6,
  ARTISAN: 7,
  REALISATEUR: 8,
  MUSICIEN: 9,
  PHOTOGRAPHE: 10,
  DANSEUR: 11,
  SCULPTEUR: 12,
  AUTRE: 13
};
class UserController {
  constructor(models) {
    this.models = models;
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  }

  /**
   * ÉTAPE 1 : Créer un utilisateur (inscription) - AVEC PHOTO OPTIONNELLE
   */
  async createUser(req, res) {
    const transaction = await this.models.sequelize.transaction();

    try {
      const {
        nom,
        prenom,
        email,
        password,
        id_type_user = 'visiteur',
        accepte_conditions = false,
        accepte_newsletter = false,
        photo_url, // NOUVEAU: Accepte photo_url dans le body
        ...otherData
      } = req.body;

      console.log('📝 Nouvelle inscription:', { 
        nom, 
        prenom, 
        email, 
        id_type_user,
        photo_url: photo_url ? '✅ Photo fournie' : '❌ Pas de photo'
      });

      // Validation des champs obligatoires
      if (!nom || !prenom || !email || !password) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs nom, prénom, email et mot de passe sont obligatoires'
        });
      }

      if (!accepte_conditions) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Vous devez accepter les conditions d\'utilisation'
        });
      }

      // NOUVEAU: Validation de photo_url si fournie
      if (photo_url) {
        // Vérifier que l'URL commence par /uploads/images/
        if (!photo_url.startsWith('/uploads/images/')) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'URL de photo invalide. Elle doit commencer par /uploads/images/'
          });
        }

        // Vérifier le format du fichier (optionnel)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const hasValidExtension = allowedExtensions.some(ext => 
          photo_url.toLowerCase().endsWith(ext)
        );

        if (!hasValidExtension) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Format de photo non supporté. Formats acceptés: JPG, JPEG, PNG, GIF, WEBP, BMP'
          });
        }

        // Vérifier que le fichier n'est pas un chemin traversal
        if (photo_url.includes('..') || photo_url.includes('//')) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'URL de photo invalide'
          });
        }
      }

      // Vérifier l'unicité de l'email
      const existingUser = await this.models.User.findOne({
        where: { email },
        transaction
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

      // Créer l'utilisateur avec ou sans photo
      const userData = {
        nom,
        prenom,
        email,
        password: hashedPassword,
        id_type_user,
        accepte_conditions,
        accepte_newsletter,
        statut: 'actif',
        email_verifie: false,
        photo_url: photo_url || null, // MODIFIÉ: Utilise la photo fournie ou null
        statut_validation: id_type_user === TYPE_USER_IDS.VISITEUR ? null : 'en_attente',
        date_creation: new Date(),
        ip_inscription: req.ip
      };

      const user = await this.models.User.create(userData, { 
        transaction,
        returning: true 
      });

      const userId = user.get('id_user');
      console.log(`✅ Utilisateur créé - ID: ${userId}, Photo: ${photo_url ? '✅' : '❌'}`);

      // Si une photo a été fournie et qu'un modèle Media existe, l'enregistrer
      if (photo_url && this.models.Media) {
        try {
          // Extraire le nom du fichier de l'URL
          const filename = photo_url.split('/').pop();
          
          await this.models.Media.create({
            filename: filename,
            original_name: filename,
            file_path: `uploads/images/${filename}`,
            file_url: photo_url,
            mime_type: 'image/jpeg', // Pourrait être déduit de l'extension
            size: 0, // Non disponible à ce stade
            type: 'profile_photo',
            uploaded_by: userId,
            is_public: true
          }, { transaction });
          
          console.log('✅ Photo enregistrée dans la table Media');
        } catch (mediaError) {
          console.log('⚠️ Erreur enregistrement Media (ignorée):', mediaError.message);
          // On continue même si l'enregistrement Media échoue
        }
      }

      // Assigner le rôle User par défaut
      if (this.models.UserRole && this.models.Role) {
        const userRole = await this.models.Role.findOne({
          where: { nom_role: 'User' },
          transaction
        });

        if (userRole) {
          await this.models.UserRole.create({
            id_user: userId,
            id_role: userRole.id_role
          }, { transaction });
        }
      }

      await transaction.commit();

      // Générer le token JWT
      const token = this.generateToken(user);

      // Préparer la réponse
      const userResponse = user.toJSON();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: photo_url 
          ? 'Inscription réussie avec photo de profil !' 
          : 'Inscription réussie ! Vous pouvez ajouter une photo de profil plus tard.',
        data: {
          user: userResponse,
          token,
          nextStep: photo_url ? null : 'upload_photo' // Pas de prochaine étape si photo déjà fournie
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur inscription:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'inscription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * ÉTAPE 2 : Mettre à jour la photo de profil (reste disponible pour changement ultérieur)
   */
  async updateProfilePhoto(req, res) {
    try {
      const userId = req.user.id_user;
      const { photo_url } = req.body;

      console.log(`📸 Mise à jour photo - User: ${userId}, URL: ${photo_url}`);

      if (!photo_url) {
        return res.status(400).json({
          success: false,
          error: 'URL de la photo requise'
        });
      }

      // Validation de l'URL
      if (!photo_url.startsWith('/uploads/images/')) {
        return res.status(400).json({
          success: false,
          error: 'URL de photo invalide. Elle doit commencer par /uploads/images/'
        });
      }

      // Vérifier le format
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const hasValidExtension = allowedExtensions.some(ext => 
        photo_url.toLowerCase().endsWith(ext)
      );

      if (!hasValidExtension) {
        return res.status(400).json({
          success: false,
          error: 'Format de photo non supporté'
        });
      }

      // Vérifier les tentatives de path traversal
      if (photo_url.includes('..') || photo_url.includes('//')) {
        return res.status(400).json({
          success: false,
          error: 'URL de photo invalide'
        });
      }

      // Récupérer l'ancienne photo
      const user = await this.models.User.findByPk(userId);
      const oldPhotoUrl = user.photo_url;

      // Mettre à jour uniquement photo_url
      const [updatedRows] = await this.models.User.update(
        { photo_url },
        { where: { id_user: userId } }
      );

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Si l'ancienne photo existe et est différente, on pourrait la marquer pour suppression
      if (oldPhotoUrl && oldPhotoUrl !== photo_url) {
        console.log(`🔄 Photo remplacée: ${oldPhotoUrl} → ${photo_url}`);
        // Note: La suppression physique du fichier devrait être gérée par un service dédié
      }

      // Récupérer l'utilisateur mis à jour
      const updatedUser = await this.models.User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      console.log(`✅ Photo mise à jour pour l'utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès',
        data: {
          user: updatedUser
        }
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour photo:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de la photo'
      });
    }
  }

  /**
   * Connexion utilisateur
   */
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      // Récupérer l'utilisateur avec ses rôles
      const user = await this.models.User.findOne({
        where: { email },
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le statut
      if (user.statut !== 'actif') {
        return res.status(403).json({
          success: false,
          error: `Votre compte est ${user.statut}`
        });
      }

      // Mettre à jour dernière connexion
      await user.update({ derniere_connexion: new Date() });

      // Générer le token
      const token = this.generateToken(user);

      // Préparer la réponse
      const userData = user.toJSON();
      delete userData.password;

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: userData,
          token
        }
      });

    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la connexion'
      });
    }
  }

  /**
   * Récupérer le profil
   */
  async getProfile(req, res) {
    try {
      const user = await this.models.User.findByPk(req.user.id_user, {
        attributes: { exclude: ['password'] },
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('❌ Erreur récupération profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Mettre à jour le profil
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id_user;
      const allowedFields = [
        'nom', 'prenom', 'date_naissance', 'sexe', 
        'telephone', 'biographie', 'wilaya_residence', 
        'adresse', 'langue_preferee', 'theme_prefere',
        'entreprise', 'site_web', 'specialites'
      ];

      // Filtrer les champs autorisés
      const updates = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }

      await this.models.User.update(updates, {
        where: { id_user: userId }
      });

      const updatedUser = await this.models.User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: updatedUser
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Supprimer la photo de profil
   */
  async removeProfilePhoto(req, res) {
    try {
      await this.models.User.update(
        { photo_url: null },
        { where: { id_user: req.user.id_user } }
      );

      res.json({
        success: true,
        message: 'Photo de profil supprimée'
      });

    } catch (error) {
      console.error('❌ Erreur suppression photo:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          error: 'Mot de passe actuel et nouveau requis'
        });
      }

      const user = await this.models.User.findByPk(req.user.id_user);
      
      const isValid = await bcrypt.compare(current_password, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Mot de passe actuel incorrect'
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 12);
      await user.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Mot de passe modifié'
      });

    } catch (error) {
      console.error('❌ Erreur changement mot de passe:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Déconnexion
   */
  async logoutUser(req, res) {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }

  /**
   * Générer un token JWT
   */
  generateToken(user) {
    const payload = {
      id_user: user.id_user,
      email: user.email,
      id_type_user: user.id_type_user
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '24h' });
  }
}

module.exports = UserController;