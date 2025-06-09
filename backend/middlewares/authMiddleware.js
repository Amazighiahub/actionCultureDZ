// middlewares/authMiddleware.js
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
  const { User, Role, UserRole, Evenement, Oeuvre, Commentaire } = models;

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

      // Récupérer l'utilisateur avec ses rôles
      const user = await User.findByPk(decoded.id || decoded.id_user, {
        include: [{
          model: Role,
          as: 'Roles',
          through: { attributes: [] }
        }],
        attributes: { exclude: ['password'] }
      });

      if (!user || user.statut !== 'actif') {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé ou inactif'
        });
      }

      // Ajouter l'utilisateur à la requête
      req.user = user;
      req.userId = user.id_user;
      req.userRoles = user.Roles ? user.Roles.map(role => role.nom_role) : [];
      
      // Ajouter des helpers
      req.user.isAdmin = req.userRoles.includes('Administrateur');
      req.user.isProfessionnel = req.user.professionnel_valide && req.userRoles.includes('Professionnel');
      
      next();
    } catch (error) {
      console.error('Erreur authentification:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'authentification'
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
          const user = await User.findByPk(decoded.id || decoded.id_user, {
            include: [{
              model: Role,
              as: 'Roles',
              through: { attributes: [] }
            }],
            attributes: { exclude: ['password'] }
          });

          if (user && user.statut === 'actif') {
            req.user = user;
            req.userId = user.id_user;
            req.userRoles = user.Roles ? user.Roles.map(role => role.nom_role) : [];
            req.user.isAdmin = req.userRoles.includes('Administrateur');
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Erreur isAuthenticated:', error);
      next();
    }
  };

  // Middleware pour vérifier les rôles
  const requireRole = (roles) => {
    // Convertir en tableau si c'est une string
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        const userRoles = req.userRoles || [];
        const hasRole = rolesArray.some(role => userRoles.includes(role));

        if (!hasRole && !userRoles.includes('Administrateur')) {
          return res.status(403).json({
            success: false,
            message: 'Permissions insuffisantes'
          });
        }

        next();
      } catch (error) {
        console.error('Erreur requireRole:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des rôles'
        });
      }
    };
  };

  // IMPORTANT: Créer des alias pour la compatibilité
  const isAdmin = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      if (!req.userRoles.includes('Administrateur')) {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé aux administrateurs'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur isAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification admin'
      });
    }
  };

  // Alias pour requireAdmin
  const requireAdmin = isAdmin;

  // Middleware pour vérifier si l'utilisateur est professionnel validé
  const isProfessional = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      if (!req.user.professionnel_valide || 
          !req.userRoles.includes('Professionnel')) {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé aux professionnels validés'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur isProfessional:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification professionnel'
      });
    }
  };

  // Alias pour requireValidatedProfessional
  const requireValidatedProfessional = isProfessional;

  // Middleware pour vérifier la propriété d'une ressource
  const requireOwnership = (modelName, paramName = 'id', ownerField = 'id_user') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        // Les admins peuvent tout modifier
        if (req.userRoles.includes('Administrateur')) {
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
      } catch (error) {
        console.error('Erreur requireOwnership:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des droits'
        });
      }
    };
  };

  // Middleware pour vérifier si l'utilisateur peut modifier une ressource
  const canModify = (resourceType) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        // Les admins peuvent tout modifier
        if (req.userRoles.includes('Administrateur')) {
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
        
        switch (resourceType) {
          case 'event':
            const event = await Evenement.findByPk(resourceId);
            isOwner = event && event.id_user === req.user.id_user;
            break;
            
          case 'oeuvre':
            const oeuvre = await Oeuvre.findByPk(resourceId);
            isOwner = oeuvre && oeuvre.saisi_par === req.user.id_user;
            break;
            
          case 'comment':
            const comment = await Commentaire.findByPk(resourceId);
            isOwner = comment && comment.id_user === req.user.id_user;
            break;
            
          default:
            return res.status(400).json({
              success: false,
              message: 'Type de ressource non supporté'
            });
        }

        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: 'Vous n\'êtes pas autorisé à modifier cette ressource'
          });
        }

        next();
      } catch (error) {
        console.error('Erreur canModify:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des droits'
        });
      }
    };
  };

  // Middleware pour limiter l'accès aux utilisateurs actifs
  const requireActiveUser = async (req, res, next) => {
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
          message: 'Compte utilisateur inactif ou suspendu'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur requireActiveUser:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification du statut'
      });
    }
  };

  // Middleware pour vérifier les permissions
  const checkPermission = (resource, action) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        // Les administrateurs ont toutes les permissions
        if (req.userRoles.includes('Administrateur')) {
          return next();
        }

        // Définir les permissions par rôle
        const permissions = {
          'Modérateur': ['moderation', 'view_users', 'view_content'],
          'Professionnel': ['create_content', 'manage_own_content', 'view_stats'],
          'Visiteur': ['view_content', 'create_comments']
        };

        // Vérifier les permissions
        let hasPermission = false;
        for (const role of req.userRoles) {
          const rolePerms = permissions[role] || [];
          if (rolePerms.includes(`${resource}_${action}`) || 
              rolePerms.includes(`${action}_${resource}`) ||
              rolePerms.includes(action)) {
            hasPermission = true;
            break;
          }
        }

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission '${action}' sur '${resource}' requise`
          });
        }

        next();
      } catch (error) {
        console.error('Erreur checkPermission:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des permissions'
        });
      }
    };
  };

  // Middleware pour vérifier l'appartenance à une organisation
  const requireOrganizationMembership = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      // Les admins passent toujours
      if (req.userRoles.includes('Administrateur')) {
        return next();
      }

      // Vérifier si l'utilisateur a une organisation
      if (!req.user.id_organisation) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez appartenir à une organisation pour cette action'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur requireOrganizationMembership:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification de l\'organisation'
      });
    }
  };

  // Retourner tous les middlewares
  return {
    authenticate,
    isAuthenticated,
    requireRole,
    checkPermission,
    isAdmin, // Alias pour compatibilité
    requireAdmin,
    isProfessional,
    requireValidatedProfessional,
    canModify,
    requireActiveUser,
    requireOwnership,
    requireOrganizationMembership,
    verifyToken
  };
};

// Export de la fonction factory
module.exports = createAuthMiddleware;