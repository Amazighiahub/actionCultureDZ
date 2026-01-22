// middlewares/authMiddleware.js - VERSION CORRIGÉE ET SÉCURISÉE
// Compatible avec: createAuthMiddleware(models) OU createAuthMiddleware(User)
const jwt = require('jsonwebtoken');

// ============================================================================
// VALIDATION DE SÉCURITÉ JWT
// ============================================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEV_MODE = process.env.NODE_ENV === 'development';
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true' || IS_DEV_MODE;

// Valeurs d'exemple à rejeter
const INSECURE_SECRETS = [
  'your-secret-key-change-in-production',
  'votre_secret_jwt_tres_long_et_aleatoire_min_32_caracteres',
  'secret',
  'jwt_secret',
  'changeme',
  'your-secret-key'
];

// Validation du JWT_SECRET
const validateJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (IS_PRODUCTION) {
    if (!secret) {
      throw new Error('❌ ERREUR CRITIQUE: JWT_SECRET non défini en production!');
    }
    if (secret.length < 32) {
      throw new Error(`❌ ERREUR CRITIQUE: JWT_SECRET trop court (${secret.length} caractères). Minimum 32 requis en production.`);
    }
    if (INSECURE_SECRETS.some(s => secret.toLowerCase().includes(s.toLowerCase()))) {
      throw new Error('❌ ERREUR CRITIQUE: JWT_SECRET contient une valeur d\'exemple non sécurisée!');
    }
  }

  return secret || 'dev-secret-key-only-for-development';
};

// Valider au chargement du module
const JWT_SECRET = validateJwtSecret();

module.exports = (modelsOrUser) => {
  // ✅ COMPATIBILITÉ: Accepte soit models complet, soit juste User
  let User, Role, Organisation;

  if (modelsOrUser.findByPk) {
    // C'est un modèle User directement
    User = modelsOrUser;
    Role = null;
    Organisation = null;
    if (!IS_PRODUCTION) console.log('🔐 AuthMiddleware initialisé avec User seul');
  } else {
    // C'est l'objet models complet
    User = modelsOrUser.User;
    Role = modelsOrUser.Role;
    Organisation = modelsOrUser.Organisation;
    if (!IS_PRODUCTION) console.log('🔐 AuthMiddleware initialisé avec models complet');
  }

  // ====================
  // HELPERS INTERNES
  // ====================
  
  // Vérifier un token JWT
  const verifyToken = (token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('❌ Erreur vérification token:', error.message);
      return null;
    }
  };

  // Récupérer l'utilisateur complet avec ses rôles
  const getUserWithRoles = async (userId) => {
    try {
      // Configuration de base
      const queryOptions = {
        attributes: { exclude: ['password'] }
      };

      // Ajouter les includes si les modèles sont disponibles
      if (Role) {
        queryOptions.include = [{
          model: Role,
          as: 'Roles',
          through: { attributes: [] },
          required: false
        }];

        // Ajouter Organisation si disponible
        if (Organisation) {
          queryOptions.include.push({
            model: Organisation,
            as: 'Organisations',
            through: { attributes: [] },
            required: false
          });
        }
      }

      const user = await User.findByPk(userId, queryOptions);

      if (user) {
        // Ajouter des propriétés helper
        if (user.Roles) {
          user.roleNames = user.Roles.map(role => role.nom_role);
        } else {
          user.roleNames = [];
        }

        // Types professionnels: tout sauf visiteur (1) et admin (29)
        const professionalTypeIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
        const isProfessionalByType = user.id_type_user && professionalTypeIds.includes(user.id_type_user);

        // Log uniquement en développement
        if (IS_DEV_MODE) {
          console.log(`🔍 Auth Debug: user.id_type_user=${user.id_type_user}, isProfessionalByType=${isProfessionalByType}`);
        }

        user.isAdmin = user.roleNames.includes('Administrateur') || user.id_type_user === 29;
        user.isProfessionnel = user.roleNames.includes('Professionnel') || isProfessionalByType;
        user.isUser = user.roleNames.includes('User') || user.id_type_user === 1 || user.roleNames.length === 0;
        user.hasOrganisation = user.Organisations && user.Organisations.length > 0;

        // Helper pour la validation professionnelle
        user.isProfessionnelValide = user.isProfessionnel && user.statut_validation === 'valide';
      }

      return user;
    } catch (error) {
      console.error('❌ Erreur getUserWithRoles:', error.message);
      
      // Fallback: récupérer l'utilisateur sans les associations
      try {
        const user = await User.findByPk(userId, {
          attributes: { exclude: ['password'] }
        });
        
        if (user) {
          user.roleNames = [];
          // Types professionnels: tout sauf visiteur (1) et admin (29)
          const professionalTypeIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
          const isProfessionalByType = user.id_type_user && professionalTypeIds.includes(user.id_type_user);

          user.isAdmin = user.id_type_user === 29;
          user.isProfessionnel = isProfessionalByType;
          user.isUser = user.id_type_user === 1 || !isProfessionalByType;
          user.hasOrganisation = false;
          user.isProfessionnelValide = isProfessionalByType && user.statut_validation === 'valide';
        }
        
        return user;
      } catch (fallbackError) {
        console.error('❌ Erreur fallback getUserWithRoles:', fallbackError.message);
        return null;
      }
    }
  };

  // ====================
  // MIDDLEWARES PRINCIPAUX
  // ====================

  /**
   * Middleware d'authentification principal
   * Vérifie le token JWT et charge l'utilisateur
   * ✅ SÉCURITÉ: Priorité aux cookies httpOnly, fallback sur header Authorization
   */
  const authenticate = async (req, res, next) => {
    try {
      // ✅ SÉCURITÉ: Priorité au cookie httpOnly (plus sécurisé)
      // Fallback sur header Authorization pour compatibilité
      const authHeader = req.headers.authorization;
      const token = req.cookies?.access_token  // 1. Cookie httpOnly (prioritaire)
        || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null)  // 2. Header Authorization
        || req.headers['x-access-token']  // 3. Header legacy
        || req.cookies?.token;  // 4. Ancien cookie (migration)

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token d\'authentification manquant'
        });
      }

      // Vérifier le token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide ou expiré'
        });
      }

      // Récupérer l'utilisateur avec ses rôles
      const user = await getUserWithRoles(decoded.id || decoded.id_user);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // ✅ CORRIGÉ: Gestion des statuts avec les valeurs ENUM existantes
      // ENUM disponibles: 'actif', 'en_attente_validation', 'inactif', 'suspendu', 'banni'
      
      // Statuts bloqués définitivement
      const blockedStatuses = ['suspendu', 'banni', 'inactif'];
      if (blockedStatuses.includes(user.statut)) {
        return res.status(403).json({
          success: false,
          message: `Votre compte est ${user.statut}. Veuillez contacter l'administrateur.`,
          statut: user.statut
        });
      }

      // ✅ CORRIGÉ: Statuts autorisés pour l'authentification
      // - actif: compte pleinement fonctionnel
      // - en_attente_validation: professionnel en attente OU utilisateur en attente de vérification email
      const allowedStatuses = ['actif', 'en_attente_validation'];
      
      if (!allowedStatuses.includes(user.statut)) {
        return res.status(401).json({
          success: false,
          message: 'Statut de compte non reconnu',
          statut: user.statut
        });
      }

      // Ajouter l'utilisateur et ses infos à la requête
      req.user = user;
      req.userId = user.id_user;
      req.userRoles = user.roleNames;
      
      next();
    } catch (error) {
      console.error('❌ Erreur authentification:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'authentification',
        details: IS_DEV_MODE ? error.message : undefined
      });
    }
  };

  /**
   * ✅ ALIAS: isAuthenticated = authenticate
   * Pour compatibilité avec app.js
   */
  const isAuthenticated = authenticate;

  /**
   * Middleware optionnel - Authentifie si un token est présent
   * ✅ SÉCURITÉ: Priorité aux cookies httpOnly
   */
  const optionalAuth = async (req, res, next) => {
    try {
      // ✅ SÉCURITÉ: Même logique que authenticate
      const authHeader = req.headers.authorization;
      const token = req.cookies?.access_token
        || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null)
        || req.headers['x-access-token']
        || req.cookies?.token;

      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const user = await getUserWithRoles(decoded.id || decoded.id_user);
          if (user && !['suspendu', 'banni', 'inactif'].includes(user.statut)) {
            req.user = user;
            req.userId = user.id_user;
            req.userRoles = user.roleNames;
          }
        }
      }
      
      next();
    } catch (error) {
      // En cas d'erreur, continuer sans authentification
      next();
    }
  };

  /**
   * ✅ NOUVEAU: Middleware pour vérifier que l'email est vérifié
   */
  const requireVerifiedEmail = async (req, res, next) => {
    try {
      // En mode DEV, on skip la vérification
      if (SKIP_EMAIL_VERIFICATION) {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      if (!req.user.email_verifie) {
        return res.status(403).json({
          success: false,
          message: 'Veuillez vérifier votre email pour accéder à cette fonctionnalité.',
          needsEmailVerification: true
        });
      }

      next();
    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  };

  /**
   * ✅ NOUVEAU: Middleware pour vérifier que le compte est actif
   */
  const requireActiveAccount = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      if (req.user.statut !== 'actif') {
        return res.status(403).json({
          success: false,
          message: 'Votre compte doit être actif pour accéder à cette fonctionnalité.',
          statut: req.user.statut
        });
      }

      next();
    } catch (error) {
      console.error('❌ Erreur vérification compte actif:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  };

  // ====================
  // MIDDLEWARES DE RÔLES
  // ====================

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  const requireRole = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const userRoles = req.userRoles || [];
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé. Rôle requis: ' + roles.join(' ou ')
        });
      }

      next();
    };
  };

  /**
   * Vérifie si l'utilisateur est administrateur
   */
  const requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }

    next();
  };

  /**
   * ✅ ALIAS: isAdmin = requireAdmin
   * Pour compatibilité avec app.js
   */
  const isAdmin = requireAdmin;

  /**
   * Vérifie si l'utilisateur est un professionnel validé
   */
  const requireValidatedProfessional = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les admins passent toujours
    if (req.user.isAdmin) {
      return next();
    }

    // Vérifier que c'est un professionnel
    if (!req.user.isProfessionnel) {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux professionnels'
      });
    }

    // ✅ CORRIGÉ: Vérifier statut_validation (pas statut)
    if (req.user.statut_validation !== 'valide') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte professionnel est en attente de validation.',
        needsAdminValidation: true,
        statut_validation: req.user.statut_validation
      });
    }

    next();
  };

  /**
   * Vérifie si l'utilisateur est propriétaire de la ressource ou admin
   */
  const requireOwnerOrAdmin = (userIdField = 'id_user') => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const resourceUserId = req.params[userIdField] || req.body[userIdField];
      const isOwner = req.user.id_user === parseInt(resourceUserId, 10);
      const isAdminUser = req.user.isAdmin;

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cette ressource'
        });
      }

      next();
    };
  };

  /**
   * ✅ NOUVEAU: Vérifie si l'utilisateur est propriétaire d'une ressource
   * @param {string} modelName - Nom du modèle (ex: 'Oeuvre', 'Evenement')
   * @param {string} paramName - Nom du paramètre contenant l'ID (ex: 'id')
   * @param {string} ownerField - Champ contenant l'ID du propriétaire (ex: 'saisi_par', 'id_user')
   */
  const requireOwnership = (modelName, paramName, ownerField) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        // Les admins passent toujours
        if (req.user.isAdmin) {
          return next();
        }

        const resourceId = req.params[paramName];
        if (!resourceId) {
          return res.status(400).json({
            success: false,
            message: `Paramètre ${paramName} manquant`
          });
        }

        // Récupérer le modèle depuis modelsOrUser
        const Model = modelsOrUser[modelName];
        if (!Model) {
          console.error(`❌ Modèle ${modelName} non trouvé`);
          return res.status(500).json({
            success: false,
            message: 'Erreur de configuration serveur'
          });
        }

        // Trouver la ressource
        const resource = await Model.findByPk(resourceId);
        if (!resource) {
          return res.status(404).json({
            success: false,
            message: `${modelName} non trouvé(e)`
          });
        }

        // Vérifier la propriété
        const ownerId = resource[ownerField];
        if (ownerId !== req.user.id_user) {
          return res.status(403).json({
            success: false,
            message: 'Vous n\'êtes pas autorisé à modifier cette ressource'
          });
        }

        // Ajouter la ressource à req pour éviter de la recharger
        req.resource = resource;
        next();
      } catch (error) {
        console.error('❌ Erreur requireOwnership:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des droits'
        });
      }
    };
  };

  // ====================
  // MIDDLEWARES DE RATE LIMITING
  // ====================

  const rateLimitStore = new Map();

  const rateLimit = (options = {}) => {
    const {
      windowMs = 60 * 1000,
      max = 100,
      message = 'Trop de requêtes, veuillez réessayer plus tard.'
    } = options;

    return (req, res, next) => {
      const key = req.user?.id_user || req.ip;
      const now = Date.now();
      
      if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        return next();
      }

      const record = rateLimitStore.get(key);
      
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
      }

      record.count++;
      
      if (record.count > max) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }

      next();
    };
  };

  const strictRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.'
  });

  // ====================
  // EXPORT
  // ====================
  
  return {
    // Authentification
    authenticate,
    isAuthenticated,  // ✅ Alias pour app.js
    optionalAuth,

    // Vérifications de compte
    requireVerifiedEmail,
    requireActiveAccount,

    // Rôles
    requireRole,
    requireAdmin,
    isAdmin,          // ✅ Alias pour app.js
    requireValidatedProfessional,
    requireOwnerOrAdmin,
    requireOwnership,  // ✅ NOUVEAU: Vérification de propriété

    // Rate limiting
    rateLimit,
    strictRateLimit,

    // Helpers exposés
    verifyToken,
    getUserWithRoles
  };
};