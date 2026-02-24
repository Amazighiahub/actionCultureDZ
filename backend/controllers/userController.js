// controllers/UserController.js - VERSION i18n CORRIGÉE
const emailService = require('../services/emailService');
const EmailVerification = require('../models/misc/emailVerification')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');
const { accountRateLimiter } = require('../middlewares/rateLimitMiddleware');

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

// ✅ Configuration pour le mode développement
const IS_DEV_MODE = process.env.NODE_ENV === 'development';
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true' || IS_DEV_MODE;

class UserController {
  constructor(models) {
    this.models = models;
    
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        throw new Error('JWT_SECRET manquant ou trop court (min 32 caractères) en production');
      }
      console.warn('⚠️ JWT_SECRET non configuré ou trop court - utilisation d\'un secret temporaire (dev uniquement)');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    
    // Log de la configuration au démarrage
    console.log('📧 Configuration email:');
    console.log(`   - Mode: ${IS_DEV_MODE ? 'DÉVELOPPEMENT' : 'PRODUCTION'}`);
    console.log(`   - Vérification email: ${SKIP_EMAIL_VERIFICATION ? 'DÉSACTIVÉE' : 'ACTIVÉE'}`);
  }

  /**
   * ⚡ Helper pour préparer les champs multilingues (nom, prenom, biographie)
   * Accepte soit une string simple, soit un objet JSON multilingue
   */
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    
    // Si c'est déjà un objet JSON, le retourner tel quel
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    
    // Si c'est une string, créer l'objet multilingue
    return createMultiLang(value, lang);
  }

  /**
   * ✅ Helper pour construire les options d'include Role
   * Évite les erreurs si le modèle Role n'est pas défini
   */
  getRoleInclude() {
    if (this.models.Role) {
      return [{
        model: this.models.Role,
        as: 'Roles',
        through: { attributes: [] },
        required: false
      }];
    }
    return [];
  }

  /**
   * INSCRIPTION
   */
  async createUser(req, res) {
    const transaction = await this.models.sequelize.transaction();

    try {
      const {
        nom,
        prenom,
        email,
        password,
        id_type_user = TYPE_USER_IDS.VISITEUR,
        accepte_conditions = false,
        accepte_newsletter = false,
        photo_url,
        biographie,
        ...otherData
      } = req.body;

      // ⚡ Récupérer la langue de la requête
      const lang = req.lang || 'fr';

      const maskedEmail = email ? `${email.substring(0, 3)}***@${email.split('@')[1] || '***'}` : '***';
      console.log('📝 Nouvelle inscription:', { 
        email: maskedEmail,
        id_type_user,
        lang,
        photo_url: photo_url ? '✅ Photo fournie' : '❌ Pas de photo',
        mode: IS_DEV_MODE ? 'DEV' : 'PROD'
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

      // Validation de photo_url si fournie
      if (photo_url) {
        if (!photo_url.startsWith('/uploads/images/')) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'URL de photo invalide. Elle doit commencer par /uploads/images/'
          });
        }

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

      // ✅ CORRIGÉ: Utiliser UNIQUEMENT les valeurs ENUM existantes
      const isVisiteur = id_type_user === TYPE_USER_IDS.VISITEUR;
      
      let statut;
      let email_verifie;
      let statut_validation;

      if (SKIP_EMAIL_VERIFICATION) {
        statut = isVisiteur ? 'actif' : 'en_attente_validation';
        email_verifie = true;
        statut_validation = isVisiteur ? null : 'en_attente';
        console.log('⚡ Mode DEV: Email considéré comme vérifié');
      } else {
        statut = 'en_attente_validation';
        email_verifie = false;
        statut_validation = isVisiteur ? null : 'en_attente';
      }

      // ⚡ Préparer les champs multilingues
      const nomMultiLang = this.prepareMultiLangField(nom, lang);
      const prenomMultiLang = this.prepareMultiLangField(prenom, lang);
      const biographieMultiLang = this.prepareMultiLangField(biographie, lang);

      // Créer l'utilisateur
      const userData = {
        nom: nomMultiLang,           // ⚡ JSON multilingue
        prenom: prenomMultiLang,     // ⚡ JSON multilingue
        email,
        password: hashedPassword,
        id_type_user,
        accepte_conditions,
        accepte_newsletter,
        statut,
        email_verifie,
        photo_url: photo_url || null,
        biographie: biographieMultiLang,  // ⚡ JSON multilingue
        statut_validation,
        date_creation: new Date(),
        ip_inscription: req.ip
      };

      console.log('📦 Création utilisateur avec statut:', statut, ', email_verifie:', email_verifie);

      const user = await this.models.User.create(userData, { 
        transaction,
        returning: true 
      });

      const userId = user.get('id_user');
      console.log(`✅ Utilisateur créé - ID: ${userId}, Statut: ${statut}, Email vérifié: ${email_verifie}`);

      // Enregistrer la photo dans Media si présente
      if (photo_url && this.models.Media) {
        try {
          const filename = photo_url.split('/').pop();
          
          await this.models.Media.create({
            filename: filename,
            original_name: filename,
            file_path: `uploads/images/${filename}`,
            file_url: photo_url,
            mime_type: 'image/jpeg',
            size: 0,
            type: 'profile_photo',
            uploaded_by: userId,
            is_public: true
          }, { transaction });
          
          console.log('✅ Photo enregistrée dans la table Media');
        } catch (mediaError) {
          console.log('⚠️ Erreur enregistrement Media (ignorée):', mediaError.message);
        }
      }

      // Assigner le rôle
      let roleName = isVisiteur ? 'User' : 'Professionnel';

      if (this.models.UserRole && this.models.Role) {
        const userRole = await this.models.Role.findOne({
          where: { nom_role: roleName },
          transaction
        });

        if (userRole) {
          await this.models.UserRole.create({
            id_user: userId,
            id_role: userRole.id_role
          }, { transaction });
          
          console.log(`✅ Rôle "${roleName}" assigné à l'utilisateur ${userId}`);
        }
      }

      // Gestion de la vérification email selon le mode
      if (!SKIP_EMAIL_VERIFICATION) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await this.models.EmailVerification.create({
          id_user: userId,
          token: verificationToken,
          type: 'email_verification',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }, { transaction });

        await transaction.commit();

        try {
          await emailService.sendVerificationEmail(user, verificationToken);
          console.log(`📧 Email de vérification envoyé à ${user.email}`);
        } catch (emailError) {
          console.error("⚠️ Erreur envoi email (utilisateur créé quand même):", emailError);
        }
      } else {
        await transaction.commit();
        console.log('⚡ Mode DEV: Pas d\'email de vérification envoyé');
      }

      // ✅ SÉCURITÉ: Générer les tokens (accès 15min + refresh 7j)
      const accessToken = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // ✅ SÉCURITÉ: Définir les cookies httpOnly sécurisés
      this.setAuthCookies(res, accessToken, refreshToken);

      // ⚡ Préparer la réponse traduite
      // ✅ CORRIGÉ: Convertir en JSON avant translateDeep
      const userJSON = user.toJSON();
      delete userJSON.password;
      const userResponse = translateDeep(userJSON, lang);

      // Message selon le mode et le type d'utilisateur
      let message;
      if (SKIP_EMAIL_VERIFICATION) {
        if (isVisiteur) {
          message = 'Inscription réussie ! Votre compte est actif.';
        } else {
          message = 'Inscription réussie ! Votre compte professionnel est en attente de validation par un administrateur.';
        }
      } else {
        message = 'Inscription réussie ! Un e-mail de vérification a été envoyé à votre adresse.';
      }

      res.status(201).json({
        success: true,
        message,
        data: {
          user: userResponse,
          token: accessToken, // Pour compatibilité
          refreshToken,
          expiresIn: 15 * 60, // 15 minutes en secondes
          needsEmailVerification: !SKIP_EMAIL_VERIFICATION && !email_verifie,
          needsAdminValidation: !isVisiteur,
          devMode: IS_DEV_MODE
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur création utilisateur:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création du compte',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * CONNEXION - ✅ VERSION CORRIGÉE
   */
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;
      const lang = req.lang || 'fr';

      console.log('🔐 Tentative connexion:', email);

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      // ✅ CORRECTION 1: Construire les options de requête dynamiquement
      const queryOptions = {
        where: { email }
      };

      // Ajouter l'include Role seulement si le modèle existe
      const roleInclude = this.getRoleInclude();
      if (roleInclude.length > 0) {
        queryOptions.include = roleInclude;
      }

      // Chercher l'utilisateur
      const user = await this.models.User.findOne(queryOptions);

      if (!user) {
        // Enregistrer la tentative échouée
        accountRateLimiter.recordFailedAttempt(email);
        return res.status(401).json({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Enregistrer la tentative échouée
        accountRateLimiter.recordFailedAttempt(email);
        return res.status(401).json({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le statut
      const blockedStatuses = ['suspendu', 'banni', 'inactif'];
      if (blockedStatuses.includes(user.statut)) {
        return res.status(403).json({
          success: false,
          error: `Votre compte est ${user.statut}. Veuillez contacter l'administrateur.`
        });
      }

      // Vérifier si l'email doit être vérifié (seulement en mode PROD)
      if (!SKIP_EMAIL_VERIFICATION && !user.email_verifie) {
        return res.status(403).json({
          success: false,
          error: 'Veuillez vérifier votre email avant de vous connecter.',
          needsEmailVerification: true
        });
      }

      // Réinitialiser les tentatives de connexion après succès
      accountRateLimiter.resetAttempts(email);

      // Mettre à jour dernière connexion
      await user.update({ derniere_connexion: new Date() });

      // ✅ SÉCURITÉ: Générer les tokens (accès 15min + refresh 7j)
      const accessToken = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // ✅ SÉCURITÉ: Définir les cookies httpOnly sécurisés
      this.setAuthCookies(res, accessToken, refreshToken);

      // ✅ CORRECTION 2: Convertir en JSON AVANT translateDeep
      const userJSON = user.toJSON();
      delete userJSON.password;

      // Appliquer la traduction sur l'objet JSON (pas sur l'instance Sequelize)
      const userData = translateDeep(userJSON, lang);

      console.log('✅ Connexion réussie pour:', email);

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: userData,
          token: accessToken, // Pour compatibilité avec le frontend existant
          refreshToken, // Nouveau: refresh token
          expiresIn: 15 * 60, // 15 minutes en secondes
          needsAdminValidation: user.id_type_user !== TYPE_USER_IDS.VISITEUR &&
                                user.statut_validation !== 'valide'
        }
      });

    } catch (error) {
      // ✅ CORRECTION 3: Afficher les détails de l'erreur en mode DEV
      console.error('❌ Erreur connexion:', error);
      console.error('❌ Stack:', error.stack);
      
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la connexion',
        details: IS_DEV_MODE ? error.message : undefined,
        stack: IS_DEV_MODE ? error.stack : undefined
      });
    }
  }

  /**
   * Récupérer le profil - ✅ VERSION CORRIGÉE
   */
  async getProfile(req, res) {
    try {
      const lang = req.lang || 'fr';

      // ✅ CORRIGÉ: Utiliser le helper pour l'include
      const queryOptions = {
        attributes: { exclude: ['password'] }
      };

      const roleInclude = this.getRoleInclude();
      if (roleInclude.length > 0) {
        queryOptions.include = roleInclude;
      }

      const user = await this.models.User.findByPk(req.user.id_user, queryOptions);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // ✅ CORRIGÉ: Convertir en JSON avant translateDeep
      const userJSON = user.toJSON();
      
      res.json({
        success: true,
        data: translateDeep(userJSON, lang)
      });

    } catch (error) {
      console.error('❌ Erreur récupération profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * Mettre à jour le profil
   */
  async updateProfile(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { 
        nom, 
        prenom, 
        biographie,
        telephone,
        date_naissance,
        sexe,
        adresse,
        wilaya_residence,
        accepte_newsletter,
        langue_preferee,
        theme_prefere,
        site_web,
        reseaux_sociaux,
        specialites
      } = req.body;

      const user = await this.models.User.findByPk(req.user.id_user);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Préparer les mises à jour
      const updates = {};

      // ⚡ Champs multilingues
      if (nom !== undefined) {
        updates.nom = mergeTranslations(user.nom, 
          typeof nom === 'object' ? nom : { [lang]: nom }
        );
      }
      
      if (prenom !== undefined) {
        updates.prenom = mergeTranslations(user.prenom, 
          typeof prenom === 'object' ? prenom : { [lang]: prenom }
        );
      }
      
      if (biographie !== undefined) {
        updates.biographie = mergeTranslations(user.biographie, 
          typeof biographie === 'object' ? biographie : { [lang]: biographie }
        );
      }

      // Champs simples
      if (telephone !== undefined) updates.telephone = telephone;
      if (date_naissance !== undefined) updates.date_naissance = date_naissance;
      if (sexe !== undefined) updates.sexe = sexe;
      if (adresse !== undefined) updates.adresse = adresse;
      if (wilaya_residence !== undefined) updates.wilaya_residence = wilaya_residence;
      if (accepte_newsletter !== undefined) updates.accepte_newsletter = accepte_newsletter;
      if (langue_preferee !== undefined) updates.langue_preferee = langue_preferee;
      if (theme_prefere !== undefined) updates.theme_prefere = theme_prefere;
      if (site_web !== undefined) updates.site_web = site_web;
      if (reseaux_sociaux !== undefined) updates.reseaux_sociaux = reseaux_sociaux;
      if (specialites !== undefined) updates.specialites = specialites;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }

      await user.update(updates);

      // Recharger avec les associations
      const queryOptions = {
        attributes: { exclude: ['password'] }
      };

      const roleInclude = this.getRoleInclude();
      if (roleInclude.length > 0) {
        queryOptions.include = roleInclude;
      }

      const updatedUser = await this.models.User.findByPk(req.user.id_user, queryOptions);

      // ✅ CORRIGÉ: Convertir en JSON avant translateDeep
      const userJSON = updatedUser.toJSON();

      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: translateDeep(userJSON, lang)
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * Mettre à jour la photo de profil
   */
  async updateProfilePhoto(req, res) {
    try {
      const { photo_url } = req.body;

      if (!photo_url) {
        return res.status(400).json({
          success: false,
          error: 'URL de photo requise'
        });
      }

      // Validation de l'URL
      if (!photo_url.startsWith('/uploads/images/')) {
        return res.status(400).json({
          success: false,
          error: 'URL de photo invalide'
        });
      }

      await this.models.User.update(
        { photo_url },
        { where: { id_user: req.user.id_user } }
      );

      res.json({
        success: true,
        message: 'Photo de profil mise à jour',
        data: { photo_url }
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour photo:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
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
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
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
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * Déconnexion - ✅ Efface les cookies httpOnly
   */
  async logoutUser(req, res) {
    // ✅ SÉCURITÉ: Effacer les cookies d'authentification
    this.clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }

  /**
   * Vérification de l'email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token de vérification manquant'
        });
      }

      // Chercher le token de vérification
      const verification = await this.models.EmailVerification.findOne({
        where: {
          token,
          type: 'email_verification',
          expires_at: { [Op.gt]: new Date() }
        }
      });

      if (!verification) {
        return res.status(400).json({
          success: false,
          error: 'Token invalide ou expiré'
        });
      }

      // Mettre à jour l'utilisateur
      const user = await this.models.User.findByPk(verification.id_user);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Déterminer le nouveau statut
      const isVisiteur = user.id_type_user === TYPE_USER_IDS.VISITEUR;
      const newStatut = isVisiteur ? 'actif' : 'en_attente_validation';

      await user.update({
        email_verifie: true,
        statut: newStatut
      });

      // Supprimer le token utilisé
      await verification.destroy();

      console.log(`✅ Email vérifié pour l'utilisateur ${user.id_user}, nouveau statut: ${newStatut}`);

      res.json({
        success: true,
        message: 'Email vérifié avec succès',
        data: {
          email_verifie: true,
          statut: newStatut,
          needsAdminValidation: !isVisiteur
        }
      });

    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * ⚡ Récupérer un utilisateur par ID (avec traduction) - ✅ VERSION CORRIGÉE
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const lang = req.lang || 'fr';

      // ✅ CORRIGÉ: Utiliser le helper pour l'include
      const queryOptions = {
        attributes: { exclude: ['password', 'ip_inscription'] }
      };

      const roleInclude = this.getRoleInclude();
      if (roleInclude.length > 0) {
        queryOptions.include = roleInclude;
      }

      const user = await this.models.User.findByPk(id, queryOptions);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // ✅ CORRIGÉ: Convertir en JSON avant translateDeep
      const userJSON = user.toJSON();

      res.json({
        success: true,
        data: translateDeep(userJSON, lang)
      });

    } catch (error) {
      console.error('❌ Erreur récupération utilisateur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * ⚡ Lister les utilisateurs (avec traduction) - ✅ VERSION CORRIGÉE
   */
  async listUsers(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page = 1, limit = 20, type, statut, search } = req.query;

      const where = {};
      
      if (type) where.id_type_user = type;
      if (statut) where.statut = statut;
      
      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          this.models.sequelize.where(
            this.models.sequelize.fn('JSON_EXTRACT', this.models.sequelize.col('nom'), this.models.sequelize.literal("'$.fr'")),
            { [Op.like]: `%${search}%` }
          ),
          this.models.sequelize.where(
            this.models.sequelize.fn('JSON_EXTRACT', this.models.sequelize.col('nom'), this.models.sequelize.literal("'$.ar'")),
            { [Op.like]: `%${search}%` }
          ),
          this.models.sequelize.where(
            this.models.sequelize.fn('JSON_EXTRACT', this.models.sequelize.col('prenom'), this.models.sequelize.literal("'$.fr'")),
            { [Op.like]: `%${search}%` }
          ),
          this.models.sequelize.where(
            this.models.sequelize.fn('JSON_EXTRACT', this.models.sequelize.col('prenom'), this.models.sequelize.literal("'$.ar'")),
            { [Op.like]: `%${search}%` }
          ),
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await this.models.User.findAndCountAll({
        where,
        attributes: { exclude: ['password', 'ip_inscription'] },
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['date_creation', 'DESC']]
      });

      // ✅ CORRIGÉ: Convertir en JSON avant translateDeep
      const usersJSON = rows.map(user => user.toJSON());

      res.json({
        success: true,
        data: translateDeep(usersJSON, lang),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('❌ Erreur liste utilisateurs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * ⚡ Récupérer toutes les traductions d'un utilisateur (admin)
   */
  async getUserTranslations(req, res) {
    try {
      const { id } = req.params;

      const user = await this.models.User.findByPk(id, {
        attributes: ['id_user', 'nom', 'prenom', 'biographie', 'email']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Retourner les données brutes (JSON multilingue)
      res.json({
        success: true,
        data: {
          id_user: user.id_user,
          email: user.email,
          nom: user.nom,           // { fr: "...", ar: "...", ... }
          prenom: user.prenom,     // { fr: "...", ar: "...", ... }
          biographie: user.biographie
        }
      });

    } catch (error) {
      console.error('❌ Erreur récupération traductions:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * ⚡ Mettre à jour une traduction spécifique (admin)
   */
  async updateUserTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, prenom, biographie } = req.body;

      const user = await this.models.User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      const updates = {};

      if (nom) {
        updates.nom = mergeTranslations(user.nom, { [lang]: nom });
      }

      if (prenom) {
        updates.prenom = mergeTranslations(user.prenom, { [lang]: prenom });
      }

      if (biographie) {
        updates.biographie = mergeTranslations(user.biographie, { [lang]: biographie });
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }

      await user.update(updates);

      // ✅ CORRIGÉ: Convertir en JSON pour la réponse
      const userJSON = user.toJSON();

      res.json({
        success: true,
        message: `Traduction ${lang} mise à jour avec succès`,
        data: userJSON
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour traduction:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  }

  /**
   * Générer un token JWT d'accès (courte durée)
   */
  generateToken(user) {
    const payload = {
      id_user: user.id_user,
      email: user.email,
      id_type_user: user.id_type_user,
      type: 'access'
    };

    // ✅ SÉCURITÉ: Token d'accès de 15 minutes (au lieu de 24h)
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '15m' });
  }

  /**
   * ✅ NOUVEAU: Générer un refresh token (longue durée)
   */
  generateRefreshToken(user) {
    const payload = {
      id_user: user.id_user,
      email: user.email,
      type: 'refresh'
    };

    // Refresh token valide 7 jours
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * ✅ NOUVEAU: Configurer les cookies httpOnly sécurisés
   */
  setAuthCookies(res, accessToken, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Cookie pour le token d'accès (15 minutes)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS uniquement en production
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Cookie pour le refresh token (7 jours)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/users/refresh-token' // Limité à la route de refresh
    });
  }

  /**
   * ✅ NOUVEAU: Effacer les cookies d'authentification
   */
  clearAuthCookies(res) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/users/refresh-token' });
  }

  /**
   * ✅ NOUVEAU: Rafraîchir le token d'accès
   */
  async refreshToken(req, res) {
    try {
      // Récupérer le refresh token depuis le cookie ou le body
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token manquant'
        });
      }

      // Vérifier le refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, this.JWT_SECRET);
      } catch (error) {
        this.clearAuthCookies(res);
        return res.status(401).json({
          success: false,
          error: 'Refresh token invalide ou expiré',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }

      // Vérifier que c'est bien un refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: 'Type de token invalide'
        });
      }

      // Récupérer l'utilisateur
      const user = await this.models.User.findByPk(decoded.id_user);

      if (!user) {
        this.clearAuthCookies(res);
        return res.status(401).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Vérifier le statut du compte
      const blockedStatuses = ['suspendu', 'banni', 'inactif'];
      if (blockedStatuses.includes(user.statut)) {
        this.clearAuthCookies(res);
        return res.status(403).json({
          success: false,
          error: `Votre compte est ${user.statut}`
        });
      }

      // Générer de nouveaux tokens
      const newAccessToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Définir les cookies
      this.setAuthCookies(res, newAccessToken, newRefreshToken);

      console.log(`🔄 Token rafraîchi pour: ${user.email}`);

      res.json({
        success: true,
        message: 'Token rafraîchi avec succès',
        data: {
          token: newAccessToken, // Pour compatibilité avec le frontend existant
          refreshToken: newRefreshToken,
          expiresIn: 15 * 60 // 15 minutes en secondes
        }
      });

    } catch (error) {
      console.error('❌ Erreur refresh token:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du rafraîchissement du token'
      });
    }
  }
}

module.exports = UserController;