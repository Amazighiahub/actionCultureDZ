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
        error: 'Erreur serveur lors de la récupération des utilisateurs' 
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
          error: 'Utilisateur non trouvé' 
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
        error: 'Erreur serveur lors de la récupération de l\'utilisateur' 
      });
    }
  }

  // Créer un nouvel utilisateur
 async createUser(req, res) {
    try {
      console.log('🔍 === DÉBUT CRÉATION UTILISATEUR ===');
      console.log('📦 Body reçu:', { ...req.body, password: '[REDACTED]' });
      
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

      // ✅ DEBUG SPÉCIAL PHOTO
      if (process.env.NODE_ENV !== 'production') {
        console.log('🖼️ === DEBUG PHOTO_URL ===');
        console.log('📷 photo_url reçue:', photo_url);
        console.log('📷 Type:', typeof photo_url);
        console.log('📷 Longueur:', photo_url ? photo_url.length : 'N/A');
        console.log('📷 Valide?:', photo_url && photo_url.length > 0);
      }

      // Validation des champs obligatoires
      if (!nom || !prenom || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Les champs nom, prénom, email et mot de passe sont obligatoires'
        });
      }

      if (!accepte_conditions) {
        return res.status(400).json({
          success: false,
          error: 'Vous devez accepter les conditions d\'utilisation'
        });
      }

      // Vérifier si l'email existe déjà
      const existingUser = await this.models.User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }

      // Validations
      if (sexe && !['M', 'F'].includes(sexe)) {
        return res.status(400).json({
          success: false,
          error: 'Sexe invalide. Doit être M ou F'
        });
      }

      if (specialites && !Array.isArray(specialites)) {
        return res.status(400).json({
          success: false,
          error: 'Les spécialités doivent être un tableau'
        });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

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
        console.log('✅ Photo URL ajoutée aux données:', userData.photo_url);
      } else {
        console.log('⚠️ Pas de photo_url valide, utilisateur créé sans photo');
        // Ne pas ajouter photo_url du tout si elle est vide
      }

      // ✅ CORRIGÉ : Nettoyer les valeurs undefined SAUF photo_url
      Object.keys(userData).forEach(key => {
        if (key !== 'photo_url' && (userData[key] === undefined || userData[key] === '')) {
          console.log(`🧹 Suppression de ${key}: ${userData[key]}`);
          delete userData[key];
        }
      });

      console.log('📤 === DONNÉES FINALES POUR LA DB ===');
      console.log('📊 userData final:', { 
        ...userData, 
        password: '[REDACTED]',
        photo_url: userData.photo_url ? `Photo présente: ${userData.photo_url}` : 'PAS DE PHOTO'
      });

      // Créer l'utilisateur
      console.log('💾 Création en base de données...');
      const user = await this.models.User.create(userData);
      console.log('✅ Utilisateur créé avec ID:', user.id_user);
      console.log('🖼️ Photo URL dans la DB après création:', user.photo_url);

      // Assigner automatiquement le rôle approprié
      await this.roleService.assignRoleToUser(user);

      // ✅ SÉCURISÉ : Récupération avec gestion d'erreur
      console.log('🔄 Récupération utilisateur complet...');
      
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
        console.log('⚠️ Erreur relation Wilaya (ignorée):', wilayaError.message);
      }

      const userComplete = await this.models.User.findByPk(user.id_user, {
        attributes: { exclude: ['password'] },
        include: includeOptions
      });

      console.log('🔍 === VÉRIFICATION FINALE ===');
      console.log('📷 Photo URL dans userComplete:', userComplete.photo_url);
      console.log('📷 Photo URL type:', typeof userComplete.photo_url);

      // ✅ SÉCURISÉ : Génération token avec gestion d'erreur
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('❌ JWT_SECRET non défini dans les variables d\'environnement');
        return res.status(500).json({
          success: false,
          error: 'Erreur de configuration serveur'
        });
      }

      let token;
      try {
        token = jwt.sign(
          {
            id_user: user.id_user,
            email: user.email,
            type_user: user.type_user,
            statut_validation: user.statut_validation,
            roles: userComplete.Roles ? userComplete.Roles.map(role => role.nom_role) : []
          },
          secret,
          { expiresIn: '24h' }
        );
        console.log('✅ Token JWT généré');
      } catch (jwtError) {
        console.error('❌ Erreur génération JWT:', jwtError);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la génération du token'
        });
      }

      // Message différent selon le type
      let message = 'Utilisateur créé avec succès';
      if (type_user !== 'visiteur') {
        message = 'Compte professionnel créé. En attente de validation par un administrateur.';
      }

      // ✅ Log détaillé pour debug
      console.log(`✅ Nouvel utilisateur créé: ${userComplete.prenom} ${userComplete.nom} (${userComplete.type_user})`);
      if (userComplete.photo_url) {
        console.log(`📸 Photo URL finale: ${userComplete.photo_url}`);
      } else {
        console.log(`❌ PROBLÈME: Pas de photo_url dans userComplete!`);
      }
      if (specialites?.length > 0) console.log(`🎯 Spécialités: ${specialites.join(', ')}`);
      if (wilaya_residence) console.log(`📍 Wilaya: ${wilaya_residence}`);

      // ✅ Réponse avec le même format que la connexion
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
          error: `Erreur de validation: ${validationErrors}` 
        });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.error('❌ Contrainte d\'unicité violée');
        return res.status(409).json({ 
          success: false, 
          error: 'Un utilisateur avec ces informations existe déjà' 
        });
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        console.error('❌ Contrainte de clé étrangère violée');
        return res.status(400).json({ 
          success: false, 
          error: 'Wilaya de résidence invalide' 
        });
      }

      if (error.name === 'SequelizeDatabaseError') {
        console.error('❌ Erreur de base de données:', error.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Erreur de base de données' 
        });
      }
      
      // Erreur générique
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création de l\'utilisateur' 
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
          error: 'Utilisateur non trouvé'
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
        error: 'Erreur serveur lors de la récupération du profil' 
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
          error: 'Email et mot de passe requis'
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
          error: 'Identifiants invalides'
        });
      }

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Identifiants invalides'
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
        message: 'Connexion réussie',
        data: {
          user: userData,
          token
        }
      });

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la connexion' 
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
        error: 'Erreur serveur lors de la récupération du profil' 
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
        message: 'Profil mis à jour avec succès',
        data: userUpdated
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la mise à jour du profil' 
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
          error: 'Mot de passe actuel et nouveau mot de passe requis'
        });
      }

      const user = await this.models.User.findByPk(id_user);
      
      // Vérifier le mot de passe actuel
      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Mot de passe actuel incorrect'
        });
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await bcrypt.hash(new_password, 12);
      await user.update({ password: hashedNewPassword });

      res.json({
        success: true,
        message: 'Mot de passe mis à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors du changement de mot de passe' 
      });
    }
  }



  
}

module.exports = UserController;