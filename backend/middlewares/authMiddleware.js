// middlewares/authMiddleware.js - VERSION CORRIGÉE AVEC UN SEUL CHAMP
const jwt = require('jsonwebtoken');

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Fonction helper pour vérifier le token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Factory function qui crée les middlewares avec les modèles
const createAuthMiddleware = (models) => {
  const { User, Role, UserRole, Evenement, Oeuvre, Commentaire, Organisation } = models;

  // ====================
  // HELPERS INTERNES
  // ====================
  
  // Récupérer l'utilisateur complet avec ses rôles et organisation
  const getUserWithRoles = async (userId) => {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'Roles',
          through: { attributes: [] }
        },
        {
          model: Organisation,
          as: 'Organisations',
          through: { attributes: [] },
          required: false
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (user) {
      // Ajouter des propriétés helper
      user.roleNames = user.Roles ? user.Roles.map(role => role.nom_role) : [];
      user.isAdmin = user.roleNames.includes('Administrateur');
      user.isProfessionnel = user.roleNames.includes('Professionnel');
      user.isUser = user.roleNames.includes('User') || user.roleNames.length === 0;
      user.hasOrganisation = user.Organisations && user.Organisations.length > 0;
      
      // IMPORTANT : Ajouter une propriété helper pour la validation
      user.isProfessionnelValide = user.isProfessionnel && user.statut_validation === 'valide';
    }

    return user;
  };

  // Vérifier si l'utilisateur a les permissions nécessaires
  const hasPermission = (user, requiredPermissions) => {
    if (!user) return false;
    
    // Les admins ont toujours toutes les permissions
    if (user.isAdmin) return true;
    
    // Définir les permissions par rôle
    const rolePermissions = {
      'Professionnel': [
        // Événements (nécessite organisation)
        'create_event',
        'update_own_event',
        'delete_own_event',
        // Œuvres (pas besoin d'organisation)
        'create_oeuvre',
        'update_oeuvre',
        'delete_oeuvre',
        // Patrimoine (pas besoin d'organisation)
        'create_patrimoine',
        'update_patrimoine',
        'delete_patrimoine',
        // Autres
        'manage_profile',
        'manage_favorites',
        'view_participants'
      ],
      'User': [
        'view_content',
        'manage_profile',
        'manage_favorites',
        'create_comment',
        'register_event',
        'rate_content'
      ]
    };

    // Vérifier si l'utilisateur a au moins une des permissions requises
    const userPermissions = user.roleNames.flatMap(role => rolePermissions[role] || []);
    return requiredPermissions.some(perm => userPermissions.includes(perm));
  };

  // ====================
  // MIDDLEWARES PRINCIPAUX
  // ====================

  // Middleware d'authentification principal
  const authenticate = async (req, res, next) => {
    try {
      // Récupérer le token depuis le header Authorization
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

      // Récupérer l'utilisateur avec ses rôles et organisation
      const user = await getUserWithRoles(decoded.id || decoded.id_user);

      if (!user || user.statut !== 'actif') {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé ou inactif'
        });
      }

      // Ajouter l'utilisateur et ses infos à la requête
      req.user = user;
      req.userId = user.id_user;
      req.userRoles = user.roleNames;
      
      next();
    } catch (error) {
      console.error('Erreur authentification:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'authentification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Middleware pour vérifier si l'utilisateur est authentifié (optionnel)
  const isAuthenticated = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.headers['x-access-token'] || req.cookies?.token;

      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const user = await getUserWithRoles(decoded.id || decoded.id_user);
          if (user && user.statut === 'actif') {
            req.user = user;
            req.userId = user.id_user;
            req.userRoles = user.roleNames;
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Erreur isAuthenticated:', error);
      next(); // Continuer même en cas d'erreur (optionnel)
    }
  };

  // ====================
  // MIDDLEWARES DE RÔLES
  // ====================

  // Vérifier si l'utilisateur est admin
  const requireAdmin = async (req, res, next) => {
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

  // Vérifier si l'utilisateur est professionnel validé OU admin (pour événements)
  const requireValidatedProfessional = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les administrateurs ont tous les droits
    if (req.user.isAdmin) {
      return next();
    }

    // MODIFICATION ICI : Utiliser statut_validation au lieu de professionnel_valide
    if (!req.user.isProfessionnel || req.user.statut_validation !== 'valide') {
      // Message différent selon le statut
      let message = 'Accès réservé aux professionnels validés';
      
      if (req.user.isProfessionnel && req.user.statut_validation === 'en_attente') {
        message = 'Votre compte professionnel est en attente de validation';
      } else if (req.user.isProfessionnel && req.user.statut_validation === 'rejete') {
        message = 'Votre demande de validation professionnelle a été rejetée';
      }
      
      return res.status(403).json({
        success: false,
        message,
        statut_validation: req.user.statut_validation
      });
    }

    // Pour les événements, vérifier l'appartenance à une organisation
    if (req.baseUrl && req.baseUrl.includes('/evenements') && req.method === 'POST') {
      if (!req.user.hasOrganisation) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez appartenir à une organisation pour créer des événements'
        });
      }
    }

    next();
  };

  // Vérifier si l'utilisateur est professionnel validé OU admin (pour contenu: œuvres, patrimoine)
  const requireValidatedProfessionalForContent = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les administrateurs ont tous les droits
    if (req.user.isAdmin) {
      return next();
    }

    // MODIFICATION ICI : Utiliser statut_validation au lieu de professionnel_valide
    if (!req.user.isProfessionnel || req.user.statut_validation !== 'valide') {
      let message = 'Accès réservé aux professionnels validés';
      
      if (req.user.isProfessionnel && req.user.statut_validation === 'en_attente') {
        message = 'Votre compte professionnel est en attente de validation';
      } else if (req.user.isProfessionnel && req.user.statut_validation === 'rejete') {
        message = 'Votre demande de validation professionnelle a été rejetée';
      }
      
      return res.status(403).json({
        success: false,
        message,
        statut_validation: req.user.statut_validation
      });
    }

    next();
  };

  // Vérifier si l'utilisateur a un rôle spécifique
  const requireRole = (roles) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    return async (req, res, next) => {
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

      const hasRequiredRole = rolesArray.some(role => req.userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: `Accès réservé aux : ${rolesArray.join(', ')}`
        });
      }

      next();
    };
  };

  // ====================
  // MIDDLEWARES DE PROPRIÉTÉ
  // ====================

  // Vérifier la propriété d'une ressource
  const requireOwnership = (modelName, paramName = 'id', ownerField = 'id_user') => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      // Les admins peuvent tout modifier
      if (req.user.isAdmin) {
        return next();
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'ID de ressource manquant'
        });
      }

      const Model = models[modelName];
      if (!Model) {
        return res.status(500).json({
          success: false,
          message: 'Modèle non trouvé'
        });
      }

      const resource = await Model.findByPk(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${modelName} non trouvé`
        });
      }

      if (resource[ownerField] !== req.user.id_user) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier cette ressource'
        });
      }

      req.resource = resource;
      next();
    };
  };

  // Vérifier si l'utilisateur peut modifier une ressource
  const canModify = (resourceType) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      // Les admins peuvent tout modifier
      if (req.user.isAdmin) {
        return next();
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'ID de ressource manquant'
        });
      }

      let isOwner = false;
      let resource = null;
      
      switch (resourceType) {
        case 'event':
        case 'evenement':
          resource = await Evenement.findByPk(resourceId);
          isOwner = resource && resource.id_user === req.user.id_user;
          break;
          
        case 'oeuvre':
          resource = await Oeuvre.findByPk(resourceId);
          isOwner = resource && resource.saisi_par === req.user.id_user;
          break;
          
        case 'comment':
        case 'commentaire':
          resource = await Commentaire.findByPk(resourceId);
          isOwner = resource && resource.id_user === req.user.id_user;
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Type de ressource non supporté'
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Ressource non trouvée'
        });
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier cette ressource'
        });
      }

      req.resource = resource;
      next();
    };
  };

  // ====================
  // MIDDLEWARES DE PERMISSIONS
  // ====================

  // Vérifier les permissions spécifiques
  const checkPermission = (requiredPermissions) => {
    const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      if (hasPermission(req.user, permissionsArray)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes pour cette action'
      });
    };
  };

  // Vérifier si l'utilisateur est actif
  const requireActiveUser = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (req.user.statut !== 'actif') {
      return res.status(403).json({
        success: false,
        message: 'Compte utilisateur inactif ou suspendu'
      });
    }

    next();
  };

  // Vérifier l'appartenance à une organisation (pour les professionnels)
  const requireOrganizationMembership = async (req, res, next) => {
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

    // Vérifier si l'utilisateur a une organisation
    if (!req.user.hasOrganisation) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez appartenir à une organisation pour cette action'
      });
    }

    next();
  };

  // ====================
  // MIDDLEWARES UTILITAIRES
  // ====================

  // Logger les accès pour audit
  const logAccess = (action) => {
    return (req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${action} - User: ${req.user?.email || 'anonymous'} - IP: ${req.ip}`);
      next();
    };
  };

  // Middleware pour enrichir la requête avec des infos utiles
  const enrichRequest = async (req, res, next) => {
    if (req.user) {
      req.isAdmin = req.user.isAdmin;
      // MODIFICATION : Utiliser statut_validation
      req.isProfessional = req.user.isProfessionnel && req.user.statut_validation === 'valide';
      req.canCreateContent = req.user.statut === 'actif' && 
                           (req.isProfessional || req.isAdmin);
    }
    next();
  };

  // ====================
  // ALIAS POUR COMPATIBILITÉ
  // ====================
  const isAdmin = requireAdmin;
  const isProfessional = requireValidatedProfessional;
  const isProfessionalForContent = requireValidatedProfessionalForContent;

  // ====================
  // EXPORT DES MIDDLEWARES
  // ====================
  return {
    // Authentification de base
    authenticate,
    isAuthenticated,
    
    // Vérification des rôles
    requireRole,
    requireAdmin,
    requireValidatedProfessional,
    requireValidatedProfessionalForContent,
    
    // Vérification de propriété
    requireOwnership,
    canModify,
    
    // Vérification des permissions
    checkPermission,
    requireActiveUser,
    requireOrganizationMembership,
    
    // Utilitaires
    logAccess,
    enrichRequest,
    verifyToken,
    
    // Alias pour compatibilité
    isAdmin,
    isProfessional,
    isProfessionalForContent,
    
    // Helpers exposés
    getUserWithRoles,
    hasPermission
  };
};

// Export de la fonction factory
module.exports = createAuthMiddleware;