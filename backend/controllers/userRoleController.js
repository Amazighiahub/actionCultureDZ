const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserController {
  constructor(models) {
    this.models = models;
  }

  // Récupérer tous les utilisateurs
  async getAllUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        type_user,
        search,
        active_only = true
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (type_user) where.type_user = type_user;
      if (search) {
        where[Op.or] = [
          { nom: { [Op.like]: `%${search}%` } },
          { prenom: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const users = await this.models.User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: { exclude: ['password'] }, // Ne pas retourner le mot de passe
        include: [
          {
            model: this.models.Role,
            through: { model: this.models.UserRole },
            attributes: ['nom_role', 'description']
          }
        ],
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          users: users.rows,
          pagination: {
            total: users.count,
            page: parseInt(page),
            pages: Math.ceil(users.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // Récupérer un utilisateur par ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await this.models.User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: this.models.Role,
            through: { model: this.models.UserRole },
            attributes: ['nom_role', 'description']
          },
          {
            model: this.models.Oeuvre,
            through: { 
              model: this.models.OeuvreUser,
              attributes: ['role_dans_oeuvre', 'role_principal']
            },
            attributes: ['titre', 'annee_creation', 'statut']
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: req.t('auth.userNotFound') 
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // Créer un nouvel utilisateur
 async createUser(req, res) {
    try {
      const {
        nom,
        prenom,
        email,
        password,
        date_naissance,
        sexe,
        biographie,
        type_user = 'visiteur',
        telephone,
        wilaya_residence,
        photo_url,          // ✅ IMPORTANT : Vérifier que c'est bien reçu
        specialites = [],
        accepte_newsletter = false,
        accepte_conditions = false,
        documents_justificatifs = {}
      } = req.body;

      // Validation des champs obligatoires
      if (!nom || !prenom || !email || !password) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      if (!accepte_conditions) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.mustAcceptTerms')
        });
      }

      // Vérifier si l'email existe déjà
      const existingUser = await this.models.User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: req.t('auth.emailAlreadyUsed')
        });
      }

      // Validations
      if (sexe && !['M', 'F'].includes(sexe)) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      if (specialites && !Array.isArray(specialites)) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      // Hasher le mot de passe
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, rounds);

      // Déterminer le statut initial selon le type
      let statutCompte = 'actif';
      let professionnelValide = false;

      if (type_user !== 'visiteur') {
        statutCompte = 'en_attente_validation';
        professionnelValide = false;
      }

      // ✅ CORRIGÉ : Données utilisateur avec gestion explicite de photo_url
      const userData = {
        nom,
        prenom,
        email,
        password: hashedPassword,
        date_naissance,
        sexe,
        biographie,
        type_user,
        telephone,
        wilaya_residence,
        specialites,
        accepte_newsletter,
        documents_justificatifs,
        professionnel_valide: professionnelValide,
        statut_compte: statutCompte
      };

      // ✅ CRITIQUE : Gérer photo_url explicitement
      if (photo_url && photo_url.trim().length > 0) {
        userData.photo_url = photo_url.trim();
      } else {
      }

      // ✅ CORRIGÉ : Nettoyer les valeurs undefined SAUF photo_url
      Object.keys(userData).forEach(key => {
        if (key !== 'photo_url' && (userData[key] === undefined || userData[key] === '')) {
          delete userData[key];
        }
      });

      const user = await this.models.User.create(userData);

      // Assigner automatiquement le rôle approprié
      await this.roleService.assignRoleToUser(user);

      const includeOptions = [
        {
          model: this.models.Role,
          through: { model: this.models.UserRole },
          attributes: ['nom_role']
        }
      ];

      // ✅ SÉCURISÉ : Ajouter Wilaya seulement si le modèle existe et la relation est définie
      try {
        if (this.models.Wilaya && userData.wilaya_residence) {
          includeOptions.push({
            model: this.models.Wilaya,
            as: 'WilayaResidence',
            attributes: ['id_wilaya', 'nom', 'code'],
            required: false // ✅ IMPORTANT : Left join au lieu d'inner join
          });
        }
      } catch (wilayaError) {
        // Wilaya relation not available, continue without it
      }

      const userComplete = await this.models.User.findByPk(user.id_user, {
        attributes: { exclude: ['password'] },
        include: includeOptions
      });

      // Génération token avec gestion d'erreur
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('❌ JWT_SECRET non défini dans les variables d\'environnement');
        return res.status(500).json({
          success: false,
          error: req.t('common.serverError')
        });
      }

      let token;
      try {
        token = jwt.sign(
          {
            id_user: user.id_user,
            email: user.email,
            type_user: user.type_user,
            statut: user.statut,
            roles: userComplete.Roles ? userComplete.Roles.map(role => role.nom_role) : []
          },
          secret,
          { expiresIn: '24h' }
        );
      } catch (jwtError) {
        console.error('Erreur génération JWT:', jwtError.message);
        return res.status(500).json({
          success: false,
          error: req.t('common.serverError')
        });
      }

      // Message différent selon le type
      let message = req.t('auth.userCreated');
      if (type_user !== 'visiteur') {
        message = req.t('auth.professionalCreated');
      }

      // Réponse avec le même format que la connexion
      res.status(201).json({
        success: true,
        message,
        data: {
          user: userComplete,
          token
        }
      });

    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
      console.error('❌ Stack trace:', error.stack);
      
      // ✅ Gestion d'erreurs spécifique et détaillée
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => err.message).join(', ');
        console.error('❌ Erreurs de validation:', validationErrors);
        return res.status(400).json({ 
          success: false, 
          error: req.t('common.badRequest') 
        });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.error('❌ Contrainte d\'unicité violée');
        return res.status(409).json({ 
          success: false, 
          error: req.t('auth.emailAlreadyUsed') 
        });
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        console.error('❌ Contrainte de clé étrangère violée');
        return res.status(400).json({ 
          success: false, 
          error: req.t('common.badRequest') 
        });
      }

      if (error.name === 'SequelizeDatabaseError') {
        console.error('❌ Erreur de base de données:', error.message);
        return res.status(500).json({ 
          success: false, 
          error: req.t('common.serverError') 
        });
      }
      
      // Erreur générique
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // ✅ Autres méthodes inchangées (getProfile, updateProfile, etc.)
  async getProfile(req, res) {
    try {
      const { id_user } = req.user;

      const includeOptions = [
        {
          model: this.models.Role,
          through: { model: this.models.UserRole },
          attributes: ['nom_role']
        },
        {
          model: this.models.Organisation,
          through: { model: this.models.UserOrganisation },
          attributes: ['id_organisation', 'nom', 'type']
        }
      ];

      if (this.models.Wilaya) {
        includeOptions.push({
          model: this.models.Wilaya,
          as: 'WilayaResidence',
          attributes: ['id_wilaya', 'nom', 'code']
        });
      }

      const user = await this.models.User.findByPk(id_user, {
        attributes: { exclude: ['password'] },
        include: includeOptions
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: req.t('auth.userNotFound')
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }
  // Connexion utilisateur
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      // Trouver l'utilisateur avec ses rôles
      const user = await this.models.User.findOne({
        where: { email },
        include: [
          {
            model: this.models.Role,
            through: { model: this.models.UserRole },
            attributes: ['nom_role']
          }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: req.t('auth.invalidCredentials')
        });
      }

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: req.t('auth.invalidCredentials')
        });
      }

      // Générer le token JWT
      const token = jwt.sign(
        { 
          id_user: user.id_user, 
          email: user.email,
          roles: user.Roles.map(role => role.nom_role)
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Retourner les données utilisateur (sans mot de passe) et le token
      const userData = {
        nom,
      prenom,
      email,
      password: hashedPassword,
      date_naissance,
      biographie,
      type_user,
      telephone,
      photo_url,  // ✅ NOUVEAU : Ajout de photo_url
      sexe,       // ✅ NOUVEAU : Ajout de sexe
      wilaya_residence, // ✅ NOUVEAU : Ajout de wilaya
      documents_justificatifs,
      professionnel_valide: professionnelValide,
      statut_compte: statutCompte,
      accepte_newsletter, //
      };

      res.json({
        success: true,
        message: req.t('auth.loginSuccess'),
        data: {
          user: userData,
          token
        }
      });

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  

  // Profil utilisateur (utilisateur connecté)
  async getProfile(req, res) {
    try {
      const user = await this.models.User.findByPk(req.user.id_user, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: this.models.Role,
            through: { model: this.models.UserRole },
            attributes: ['nom_role', 'description']
          },
          {
            model: this.models.Oeuvre,
            as: 'OeuvresSaisies',
            attributes: ['id_oeuvre', 'titre', 'statut', 'date_creation']
          }
        ]
      });

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // Mettre à jour le profil
  async updateProfile(req, res) {
    try {
      const { id_user } = req.user;
      const updates = req.body;

      // Supprimer les champs sensibles des mises à jour
      delete updates.password;
      delete updates.email; // L'email ne peut pas être modifié via cette route

      const user = await this.models.User.findByPk(id_user);
      await user.update(updates);

      const userUpdated = await this.models.User.findByPk(id_user, {
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        message: req.t('user.profileUpdated'),
        data: userUpdated
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // Changer le mot de passe
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const { id_user } = req.user;

      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      const user = await this.models.User.findByPk(id_user);
      
      // Vérifier le mot de passe actuel
      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: req.t('auth.invalidPassword')
        });
      }

      // Hasher le nouveau mot de passe
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(new_password, rounds);
      await user.update({ password: hashedNewPassword });

      res.json({
        success: true,
        message: req.t('auth.passwordChanged')
      });

    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }



  
}

module.exports = UserController;