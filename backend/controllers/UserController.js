// controllers/UserController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const RoleService = require('../services/roleService');

class UserController {
  constructor(models) {
    this.models = models;
    this.roleService = new RoleService(models);
  }

  /**
   * Créer un utilisateur (inscription)
   */
  async createUser(req, res) {
    const transaction = await this.models.sequelize.transaction();

    try {
      const {
        nom,
        prenom,
        email,
        password,
        type_user = 'visiteur',
        accepte_conditions = false,
        accepte_newsletter = false,
        ...otherData
      } = req.body;

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

      // Valider le type d'utilisateur
      const validTypes = [
        'visiteur', 'ecrivain', 'journaliste', 'scientifique',
        'acteur', 'artiste', 'artisan', 'realisateur', 'musicien',
        'photographe', 'danseur', 'sculpteur', 'autre'
      ];

      if (!validTypes.includes(type_user)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Type d\'utilisateur invalide'
        });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

      // Préparer les données utilisateur
      const userData = {
        nom,
        prenom,
        email,
        password: hashedPassword,
        type_user,
        accepte_conditions,
        accepte_newsletter,
        statut: 'actif',
        professionnel_valide: type_user === 'visiteur',
        statut_validation: type_user === 'visiteur' ? 'valide' : 'en_attente',
        ip_inscription: req.ip || req.connection?.remoteAddress,
        ...this.filterValidFields(otherData)
      };

      // Créer l'utilisateur
      const user = await this.models.User.create(userData, { 
        transaction,
        returning: true 
      });

      // Récupérer l'ID de manière sûre
      const userId = user.get('id_user');
      
      if (!userId) {
        throw new Error('Impossible de récupérer l\'ID de l\'utilisateur créé');
      }

      console.log(`✅ Utilisateur créé avec succès - ID: ${userId}`);

      // Assigner le rôle approprié
      const roleName = this.roleService.getRoleByUserType(type_user);
      await this.roleService.assignRoleToUser(userId, roleName, transaction);

      // Commit de la transaction
      await transaction.commit();

      // Générer le token JWT
      const token = this.generateToken(user);

      // Récupérer l'utilisateur avec ses rôles
      const userWithRoles = await this.getUserWithRoles(userId);

      res.status(201).json({
        success: true,
        message: type_user === 'visiteur'
          ? 'Compte créé avec succès'
          : 'Compte créé. En attente de validation par un administrateur.',
        data: {
          user: userWithRoles,
          token
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création de l\'utilisateur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Connexion utilisateur
   */
  async loginUser(req, res) {
    try {
      const { email, password, remember_me = false } = req.body;

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

      // Vérifier le statut du compte
      if (user.statut === 'suspendu' || user.statut === 'banni') {
        return res.status(403).json({
          success: false,
          error: `Votre compte est ${user.statut}. Contactez un administrateur.`
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

      // Mettre à jour la dernière connexion
      await user.update({ derniere_connexion: new Date() });

      // Générer le token
      const token = this.generateToken(user, remember_me);

      // Préparer la réponse
      const userData = user.toJSON();
      delete userData.password;

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: userData,
          token,
          expires_in: remember_me ? 30 * 24 * 60 * 60 : 24 * 60 * 60
        }
      });

    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la connexion'
      });
    }
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id_user;
      const user = await this.getUserWithRoles(userId);

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
      console.error('❌ Erreur lors de la récupération du profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Récupérer les types d'utilisateurs disponibles
   */
  async getTypesUtilisateurs(req, res) {
    try {
      const types = [
        { value: 'visiteur', label: 'Visiteur' },
        { value: 'ecrivain', label: 'Écrivain' },
        { value: 'journaliste', label: 'Journaliste' },
        { value: 'scientifique', label: 'Scientifique' },
        { value: 'acteur', label: 'Acteur' },
        { value: 'artiste', label: 'Artiste' },
        { value: 'artisan', label: 'Artisan' },
        { value: 'realisateur', label: 'Réalisateur' },
        { value: 'musicien', label: 'Musicien' },
        { value: 'photographe', label: 'Photographe' },
        { value: 'danseur', label: 'Danseur' },
        { value: 'sculpteur', label: 'Sculpteur' },
        { value: 'autre', label: 'Autre' }
      ];

      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des types:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des types d\'utilisateurs'
      });
    }
  }

  // ========== MÉTHODES UTILITAIRES ==========

  /**
   * Générer un token JWT
   */
  generateToken(user, rememberMe = false) {
    const payload = {
      id_user: user.id_user,
      email: user.email,
      type_user: user.type_user
    };

    const options = {
      expiresIn: rememberMe ? '30d' : '24h'
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'dev-secret-temporaire',
      options
    );
  }

  /**
   * Récupérer un utilisateur avec ses rôles
   */
  async getUserWithRoles(userId) {
    return await this.models.User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        },
        {
          model: this.models.Wilaya,
          as: 'Wilaya',
          attributes: ['id_wilaya', 'nom', 'codeW']
        }
      ]
    });
  }

  /**
   * Filtrer les champs valides pour la création/mise à jour
   */
  filterValidFields(data) {
    const validFields = [
      'date_naissance', 'sexe', 'telephone', 'photo_url', 'biographie',
      'wilaya_residence', 'adresse', 'langue_preferee', 'theme_prefere',
      'entreprise', 'siret', 'specialites', 'site_web', 'reseaux_sociaux',
      'documents_fournis'
    ];

    const filtered = {};
    validFields.forEach(field => {
      if (data[field] !== undefined) {
        filtered[field] = data[field];
      }
    });

    return filtered;
  }

  // ========== AUTRES MÉTHODES ==========
  
  async logoutUser(req, res) {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id_user;
      const updates = this.filterValidFields(req.body);

      const user = await this.models.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      await user.update(updates);
      const updatedUser = await this.getUserWithRoles(userId);

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: updatedUser
      });

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const userId = req.user.id_user;
      const { current_password, new_password } = req.body;

      const user = await this.models.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Mot de passe actuel incorrect'
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 12);
      await user.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Mot de passe modifié avec succès'
      });

    } catch (error) {
      console.error('❌ Erreur lors du changement de mot de passe:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Implémentez les autres méthodes selon vos besoins...
  async updatePreferences(req, res) { /* ... */ }
  async updatePrivacy(req, res) { /* ... */ }
  async updateProfilePhoto(req, res) { /* ... */ }
  async removeProfilePhoto(req, res) { /* ... */ }
  async submitProfessionalValidation(req, res) { /* ... */ }
  async getValidationStatus(req, res) { /* ... */ }
  async requestPasswordReset(req, res) { /* ... */ }
  async resetPassword(req, res) { /* ... */ }
  async sendVerificationEmail(req, res) { /* ... */ }
  async verifyEmail(req, res) { /* ... */ }
}

module.exports = UserController;