// middleware/auditMiddleware.js - VERSION CORRIGÉE
// Ne PAS importer directement les modèles ici !

// Variables pour stocker les références
let models = null;
let AuditLog = null;

// Fonction pour obtenir l'IP réelle du client
const getClientIp = (req) => {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
};

// Fonction pour nettoyer les données sensibles
const sanitizeData = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'credit_card', 'cvv'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// Fonction helper pour extraire le type d'entité depuis le path
const extractEntityType = (path) => {
  if (!path) return 'unknown';
  
  const entities = {
    'evenements': 'evenement',
    'oeuvres': 'oeuvre',
    'users': 'user',
    'organisations': 'organisation',
    'lieux': 'lieu',
    'programmes': 'programme'
  };
  
  for (const [key, value] of Object.entries(entities)) {
    if (path.includes(key)) return value;
  }
  
  return path.split('/')[1] || 'unknown';
};

// Factory function pour créer le middleware avec les modèles
const createAuditMiddleware = (injectedModels) => {
  // Stocker les modèles injectés
  if (injectedModels) {
    models = injectedModels;
    AuditLog = models.AuditLog;
    console.log('✅ AuditLog initialisé:', !!AuditLog);
  }

  // Middleware principal pour logger les actions
  const logAction = (action, options = {}) => {
    return async (req, res, next) => {
      try {
        // Si AuditLog n'est pas disponible, continuer sans logger
        if (!AuditLog) {
          console.warn('⚠️  AuditLog non disponible pour l\'action:', action);
          return next();
        }

        // Capturer la méthode originale de res.json
        const originalJson = res.json.bind(res);
        const startTime = Date.now();
        
        // Intercepter la réponse pour logger après l'action
        res.json = function(data) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Logger l'action seulement si elle a réussi (status 2xx) ou selon les options
          if ((res.statusCode >= 200 && res.statusCode < 300) || options.logErrors) {
            const logData = {
              id_admin: req.user?.id_user || null,
              action: action,
              entity_type: options.entityType || extractEntityType(req.route?.path),
              entity_id: req.params?.id || data?.id || null,
              details: {
                method: req.method,
                path: req.originalUrl,
                params: sanitizeData(req.params),
                query: sanitizeData(req.query),
                body: sanitizeData(req.body),
                statusCode: res.statusCode,
                duration: duration,
                userType: req.user?.type_user || 'anonymous',
                userRoles: req.userRoles || [],
                timestamp: new Date().toISOString()
              },
              ip_address: getClientIp(req),
              user_agent: req.get('User-Agent') || 'Unknown'
            };
            
            // Ajouter des détails spécifiques selon l'action
            if (options.includeResponse && res.statusCode < 400) {
              logData.details.response = {
                success: data?.success,
                message: data?.message,
                recordsAffected: data?.count || data?.data?.length || 1
              };
            }
            
            // Enregistrer dans la base de données de manière asynchrone
            if (AuditLog && typeof AuditLog.create === 'function') {
              AuditLog.create(logData).catch(error => {
                console.error('Erreur lors de l\'enregistrement du log d\'audit:', error);
              });
            }
          }
          
          return originalJson(data);
        };
        
        next();
      } catch (error) {
        console.error('Erreur dans le middleware d\'audit:', error);
        next(); // Continuer même si l'audit échoue
      }
    };
  };

  // Middleware pour logger les actions critiques
  const logCriticalAction = (action, entityType) => {
    return logAction(action, {
      entityType,
      includeResponse: true,
      logErrors: true
    });
  };

  // Middleware pour logger les accès aux données sensibles
  const logDataAccess = (dataType) => {
    return async (req, res, next) => {
      try {
        if (AuditLog && typeof AuditLog.create === 'function') {
          await AuditLog.create({
            id_admin: req.user?.id_user || null,
            action: `access_${dataType}`,
            entity_type: dataType,
            entity_id: req.params?.id || null,
            details: {
              method: 'GET',
              path: req.originalUrl,
              timestamp: new Date().toISOString()
            },
            ip_address: getClientIp(req),
            user_agent: req.get('User-Agent') || 'Unknown'
          });
        }
      } catch (error) {
        console.error('Erreur log accès données:', error);
      }
      next();
    };
  };

  // Middleware pour logger les tentatives d'accès non autorisées
  const logUnauthorizedAccess = async (req, res, next) => {
    try {
      // Intercepter les réponses 401 et 403
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        if ((res.statusCode === 401 || res.statusCode === 403) && AuditLog && typeof AuditLog.create === 'function') {
          AuditLog.create({
            id_admin: req.user?.id_user || null,
            action: 'unauthorized_access_attempt',
            entity_type: 'security',
            details: {
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
              reason: data?.message || 'Accès non autorisé',
              timestamp: new Date().toISOString()
            },
            ip_address: getClientIp(req),
            user_agent: req.get('User-Agent') || 'Unknown'
          }).catch(console.error);
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Erreur log accès non autorisé:', error);
      next();
    }
  };

  // Fonction pour logger manuellement une action
  const logManualAction = async (userId, action, entityType, entityId, details = {}) => {
    try {
      if (AuditLog && typeof AuditLog.create === 'function') {
        await AuditLog.create({
          id_admin: userId,
          action: action,
          entity_type: entityType,
          entity_id: entityId,
          details: {
            ...details,
            timestamp: new Date().toISOString()
          },
          ip_address: details.ip || 'system',
          user_agent: details.userAgent || 'System Process'
        });
      }
    } catch (error) {
      console.error('Erreur log manuel:', error);
    }
  };

  // Middleware pour nettoyer les anciens logs
  const cleanOldLogs = async (daysToKeep = 90) => {
    try {
      if (!AuditLog) {
        console.warn('⚠️ AuditLog non disponible pour le nettoyage');
        return;
      }

      const { Op } = require('sequelize');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await AuditLog.destroy({
        where: {
          date_action: {
            [Op.lt]: cutoffDate
          }
        }
      });
      
      console.log(`✅ ${result} logs d'audit supprimés (plus de ${daysToKeep} jours)`);
    } catch (error) {
      console.error('Erreur nettoyage logs:', error);
    }
  };

  // Retourner tous les middlewares
  return {
    logAction,
    logCriticalAction,
    logDataAccess,
    logUnauthorizedAccess,
    logManualAction,
    cleanOldLogs,
    
    // Aliases pour compatibilité
    log: logAction,
    critical: logCriticalAction,
    access: logDataAccess,
    unauthorized: logUnauthorizedAccess
  };
};

// Actions prédéfinies
const actions = {
  // Événements
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  PUBLISH_EVENT: 'publish_event',
  CANCEL_EVENT: 'cancel_event',
  
  // Utilisateurs
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  VALIDATE_PROFESSIONAL: 'validate_professional',
  SUSPEND_USER: 'suspend_user',
  
  // Œuvres
  CREATE_OEUVRE: 'create_oeuvre',
  UPDATE_OEUVRE: 'update_oeuvre',
  DELETE_OEUVRE: 'delete_oeuvre',
  VALIDATE_OEUVRE: 'validate_oeuvre',
  
  // Authentification
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  
  // Administration
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
  SYSTEM_CONFIG_CHANGE: 'system_config_change',
  
  // Modération
  MODERATE_CONTENT: 'moderate_content',
  DELETE_COMMENT: 'delete_comment',
  BAN_USER: 'ban_user'
};

// Créer une instance par défaut (sans modèles pour compatibilité)
const defaultInstance = createAuditMiddleware();

// Export avec toutes les propriétés nécessaires
module.exports = {
  // Factory function pour créer une instance avec modèles
  create: createAuditMiddleware,
  
  // Actions disponibles
  actions,
  
  // Instance par défaut (sans modèles)
  ...defaultInstance,
  
  // Fonction pour initialiser avec des modèles après coup
  initialize: (models) => {
    const newInstance = createAuditMiddleware(models);
    // Copier toutes les méthodes dans l'export
    Object.assign(module.exports, newInstance);
    return newInstance;
  }
};