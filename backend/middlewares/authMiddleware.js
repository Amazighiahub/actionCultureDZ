// middlewares/authMiddleware.js - VERSION CORRIGÉE
// Compatible avec: createAuthMiddleware(models) OU createAuthMiddleware(User)
const jwt = require('jsonwebtoken');

// ✅ Configuration pour le mode développement
const IS_DEV_MODE = process.env.NODE_ENV === 'development';
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true' || IS_DEV_MODE;

module.exports = (modelsOrUser) => {
  // ✅ COMPATIBILITÉ: Accepte soit models complet, soit juste User
  let User, Role, Organisation;
  
  if (modelsOrUser.findByPk) {
    // C'est un modèle User directement
    User = modelsOrUser;
    Role = null;
    Organisation = null;
    console.log('🔐 AuthMiddleware initialisé avec User seul');
  } else {
    // C'est l'objet models complet
    User = modelsOrUser.User;
    Role = modelsOrUser.Role;
    Organisation = modelsOrUser.Organisation;
    console.log('🔐 AuthMiddleware initialisé avec models complet');
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
        
        user.isAdmin = user.roleNames.includes('Administrateur');
        user.isProfessionnel = user.roleNames.includes('Professionnel');
        user.isUser = user.roleNames.includes('User') || user.roleNames.length === 0;
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
          user.isAdmin = false;
          user.isProfessionnel = false;
          user.isUser = true;
          user.hasOrganisation = false;
          user.isProfessionnelValide = false;
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
   */
  const authenticate = async (req, res, next) => {
    try {
      // Récupérer le token
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.headers['x-access-token'] || req.cookies?.token;

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
   */
  const optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.headers['x-access-token'] || req.cookies?.token;

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
    
    // Rate limiting
    rateLimit,
    strictRateLimit,
    
    // Helpers exposés
    verifyToken,
    getUserWithRoles
  };
};