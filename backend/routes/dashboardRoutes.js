// routes/dashboardRoutes.js - VERSION COMPLÈTE
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const auditMiddleware = require('../middlewares/auditMiddleware');
const { body, query, param } = require('express-validator');

const initDashboardRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const dashboardController = DashboardController;

  // Auto-bind toutes les méthodes du controller
  Object.getOwnPropertyNames(Object.getPrototypeOf(dashboardController))
    .filter(method => method !== 'constructor' && typeof dashboardController[method] === 'function')
    .forEach(method => {
      dashboardController[method] = dashboardController[method].bind(dashboardController);
    });


  // Toutes les routes nécessitent l'authentification admin
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // ========================================
  // DASHBOARD PRINCIPAL
  // ========================================

  router.get('/overview',
    cacheMiddleware.conditionalCache(300),
    dashboardController.getOverview
  );

  router.get('/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats
  );

  // ========================================
  // DASHBOARD PATRIMOINE
  // ========================================

  router.get('/patrimoine',
    cacheMiddleware.conditionalCache(600),
    auditMiddleware.logAction('VIEW_PATRIMOINE_DASHBOARD'),
    dashboardController.getPatrimoineDashboard
  );

  router.get('/patrimoine/qr-stats',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    dashboardController.getQRStats
  );

  router.get('/patrimoine/parcours',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod')),
      query('statut').optional().isIn(['actif', 'inactif', 'maintenance']).withMessage((value, { req }) => req.t('validation.invalidStatus'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: req.t('common.notImplemented')
      });
    }
  );

  // ========================================
  // GESTION DES UTILISATEURS
  // ========================================

  // Liste de TOUS les utilisateurs (avec filtres optionnels)
  router.get('/users',
    validationMiddleware.validatePagination,
    cacheMiddleware.conditionalCache(120),
    dashboardController.getAllUsers
  );

  // Liste des utilisateurs en attente
  router.get('/users/pending',
    validationMiddleware.validatePagination,
    cacheMiddleware.conditionalCache(180),
    dashboardController.getPendingUsers
  );

  // Statistiques utilisateurs
  router.get('/users/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage((value, { req }) => req.t('validation.invalidPeriod')),
      query('type').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage((value, { req }) => req.t('validation.invalidUserType'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats
  );

  // Distribution géographique
  router.get('/users/geographic',
    cacheMiddleware.conditionalCache(1800),
    dashboardController.getDetailedStats
  );

  // Obtenir les détails d'un utilisateur
  router.get('/users/:id',
    validationMiddleware.validateId('id'),
    cacheMiddleware.conditionalCache(300),
    dashboardController.getUserDetails
  );

  // Recherche d'utilisateurs
  router.get('/users/search',
    [
      query('q').notEmpty().withMessage((value, { req }) => req.t('validation.searchRequired')),
      query('type').optional().isIn(['nom', 'email', 'telephone']).withMessage((value, { req }) => req.t('validation.invalidSearchType'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(300),
    dashboardController.searchUsers
  );

  // Export des utilisateurs
  router.get('/users/export',
    [
      query('format').optional().isIn(['csv', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat')),
      query('type_user').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage((value, { req }) => req.t('validation.invalidType')),
      query('statut').optional().isIn(['actif', 'inactif', 'suspendu']).withMessage((value, { req }) => req.t('validation.invalidStatus')),
      query('start_date').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidStartDate')),
      query('end_date').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidEndDate'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('EXPORT_USERS'),
    dashboardController.exportUsers
  );

  // Validation d'un utilisateur (PATCH)
  router.patch('/users/:id/validate',
    validationMiddleware.validateId('id'),
    [
      body('valide').isBoolean().withMessage((value, { req }) => req.t('validation.invalidValidationValue')),
      body('raison').optional().isString().withMessage((value, { req }) => req.t('validation.invalidReason'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('VALIDATE_USER'),
    async (req, res) => {
      req.body = {
        action: 'validate_user',
        entityType: 'user',
        entityId: req.params.id,
        data: {
          valide: req.body.valide,
          validateur_id: req.user.id_user,
          raison: req.body.raison
        }
      };
      return dashboardController.performAdminAction(req, res);
    }
  );

  // Mettre à jour un utilisateur
  router.put('/users/:id',
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().isString().trim().notEmpty().withMessage((value, { req }) => req.t('validation.invalidName')),
      body('prenom').optional().isString().trim().notEmpty().withMessage((value, { req }) => req.t('validation.invalidFirstName')),
      body('email').optional().isEmail().withMessage((value, { req }) => req.t('validation.invalidEmail')),
      body('telephone').optional().isMobilePhone('any').withMessage((value, { req }) => req.t('validation.invalidPhone')),
      body('type_user').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage((value, { req }) => req.t('validation.invalidUserType')),
      body('statut').optional().isIn(['actif', 'inactif', 'suspendu']).withMessage((value, { req }) => req.t('validation.invalidStatus')),
      body('biographie').optional().isString().withMessage((value, { req }) => req.t('validation.invalidBiography')),
      body('entreprise').optional().isString().withMessage((value, { req }) => req.t('validation.invalidCompany')),
      body('site_web').optional().isURL().withMessage((value, { req }) => req.t('validation.invalidWebsite')),
      body('wilaya_residence').optional().isInt({ min: 1, max: 58 }).withMessage((value, { req }) => req.t('validation.invalidWilaya'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('UPDATE_USER'),
    dashboardController.updateUser
  );

  // Supprimer un utilisateur (soft delete)
 // Remplacez la route DELETE existante dans dashboardRoutes.js par celle-ci :
// Supprimer un utilisateur (hard delete)
  router.delete('/users/:id',
    validationMiddleware.validateId('id'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('DELETE_USER'),
    dashboardController.deleteUser
  );
  // Réactiver un utilisateur suspendu
  router.post('/users/:id/suspend',
    validationMiddleware.validateId('id'),
    [
      body('raison').notEmpty().isString().withMessage((value, { req }) => req.t('validation.reasonRequired')),
      body('duree').optional().isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidDuration'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('SUSPEND_USER'),
    async (req, res) => {
      req.body = {
        action: 'suspend_user',
        entityType: 'user',
        entityId: req.params.id,
        data: {
          raison: req.body.raison,
          duree: req.body.duree,
          suspendu_par: req.user.id_user
        }
      };
      return dashboardController.performAdminAction(req, res);
    }
  );

  // Réactiver un utilisateur suspendu
  router.post('/users/:id/reactivate',
    validationMiddleware.validateId('id'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('REACTIVATE_USER'),
    dashboardController.reactivateUser
  );

  // Changer le rôle d'un utilisateur
  router.put('/users/:id/role',
    validationMiddleware.validateId('id'),
    [
      body('role_id').isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidRoleId'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('CHANGE_USER_ROLE'),
    dashboardController.changeUserRole
  );

  // Réinitialiser le mot de passe d'un utilisateur
  router.post('/users/:id/reset-password',
    validationMiddleware.validateId('id'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('RESET_USER_PASSWORD'),
    dashboardController.resetUserPassword
  );

  // Actions en masse sur les utilisateurs
  router.post('/users/bulk-action',
    [
      body('user_ids').isArray({ min: 1 }).withMessage((value, { req }) => req.t('validation.userListRequired')),
      body('user_ids.*').isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidUserId')),
      body('action').isIn(['activate', 'deactivate', 'delete', 'change_role']).withMessage((value, { req }) => req.t('validation.invalidAction')),
      body('role_id').optional().isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidRoleId'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('BULK_USER_ACTION'),
    dashboardController.bulkUserAction
  );

  // ========================================
  // GESTION DU CONTENU
  // ========================================

  router.get('/content/pending-oeuvres',
    validationMiddleware.validatePagination,
    cacheMiddleware.conditionalCache(10),
    dashboardController.getPendingOeuvres
  );

  router.get('/content/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage((value, { req }) => req.t('validation.invalidPeriod')),
      query('type').optional().isIn(['oeuvre', 'evenement', 'artisanat']).withMessage((value, { req }) => req.t('validation.invalidContentType'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats
  );

  router.get('/content/top-contributors',
    [
      query('limit').optional().isInt({ min: 1, max: 50 }).withMessage((value, { req }) => req.t('validation.invalidLimit')),
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    dashboardController.getDetailedStats
  );

  // ========================================
  // MODÉRATION
  // ========================================

  router.get('/moderation/queue',
    cacheMiddleware.conditionalCache(60),
    auditMiddleware.logAction('VIEW_MODERATION_QUEUE'),
    dashboardController.getModerationQueue
  );

  router.get('/moderation/signalements',
    validationMiddleware.validatePagination,
    [
      query('type').optional().isIn(['commentaire', 'oeuvre', 'evenement', 'user']).withMessage((value, { req }) => req.t('validation.invalidType')),
      query('priorite').optional().isIn(['basse', 'normale', 'haute', 'urgente']).withMessage((value, { req }) => req.t('validation.invalidPriority')),
      query('statut').optional().isIn(['en_attente', 'en_cours', 'traite']).withMessage((value, { req }) => req.t('validation.invalidStatus'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(120),
    dashboardController.getReportedContent
  );

  router.get('/moderation/stats',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats
  );

  // ========================================
  // ACTIONS ADMINISTRATIVES
  // ========================================

  router.post('/actions',
    [
      body('action')
        .isIn([
          'validate_user', 'validate_oeuvre', 'moderate_comment', 
          'moderate_signalement', 'suspend_user', 'bulk_moderate'
        ])
        .withMessage((value, { req }) => req.t('validation.invalidAction')),
      body('entityType')
        .optional()
        .isIn(['user', 'oeuvre', 'comment', 'signalement'])
        .withMessage((value, { req }) => req.t('validation.invalidEntityType')),
      body('entityId')
        .optional()
        .isInt({ min: 1 })
        .withMessage((value, { req }) => req.t('validation.invalidEntityId')),
      body('data').optional().isObject().withMessage((value, { req }) => req.t('validation.invalidData'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('ADMIN_ACTION'),
    dashboardController.performAdminAction
  );

  router.post('/actions/bulk',
    [
      body('action').isString().withMessage((value, { req }) => req.t('validation.actionRequired')),
      body('entities').isArray().withMessage((value, { req }) => req.t('validation.entitiesMustBeArray')),
      body('data').optional().isObject().withMessage((value, { req }) => req.t('validation.invalidData'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('BULK_ADMIN_ACTION'),
    (req, res) => {
      req.body.data = { ...req.body.data, signalements: req.body.entities };
      req.body.action = 'bulk_moderate';
      dashboardController.performAdminAction(req, res);
    }
  );

  // Validation d'une œuvre
  router.patch('/oeuvres/:id/validate',
    validationMiddleware.validateId('id'),
    [
      body('valide').isBoolean().withMessage((value, { req }) => req.t('validation.invalidValidationValue')),
      body('raison_rejet').optional().isString().withMessage((value, { req }) => req.t('validation.invalidRejectReason'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('VALIDATE_OEUVRE'),
    cacheMiddleware.invalidateCache(['pending-oeuvres', 'content/stats']),
    async (req, res) => {
      req.body = {
        action: 'validate_oeuvre',
        entityType: 'oeuvre',
        entityId: req.params.id,
        data: {
          valide: req.body.valide,
          validateur_id: req.user.id_user,
          raison_rejet: req.body.raison_rejet
        }
      };
      return dashboardController.performAdminAction(req, res);
    }
  );

  // Modération d'un signalement
  router.patch('/signalements/:id/moderate',
    validationMiddleware.validateId('id'),
    [
      body('action')
        .isIn([
          'aucune', 'avertissement', 'suppression_contenu', 
          'suspension_temporaire', 'suspension_permanente'
        ])
        .withMessage((value, { req }) => req.t('validation.invalidModerationAction')),
      body('notes').optional().isString().withMessage((value, { req }) => req.t('validation.invalidNotes'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('MODERATE_SIGNALEMENT'),
    async (req, res) => {
      req.body = {
        action: 'moderate_signalement',
        entityType: 'signalement',
        entityId: req.params.id,
        data: {
          action: req.body.action,
          notes: req.body.notes
        }
      };
      return dashboardController.performAdminAction(req, res);
    }
  );

  // ========================================
  // ANALYTICS AVANCÉES
  // ========================================

  router.get('/analytics/advanced',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(1800),
    dashboardController.getAdvancedAnalytics
  );

  router.get('/analytics/retention',
    [
      query('period').optional().isInt({ min: 7, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod')),
      query('cohort').optional().isString().withMessage((value, { req }) => req.t('validation.invalidCohort'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(3600),
    dashboardController.getAdvancedAnalytics
  );

  router.get('/analytics/funnel',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(1800),
    dashboardController.getAdvancedAnalytics
  );

  router.get('/analytics/engagement',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod')),
      query('metric').optional().isIn(['session_duration', 'pages_per_session', 'bounce_rate']).withMessage((value, { req }) => req.t('validation.invalidMetric'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    dashboardController.getAdvancedAnalytics
  );

  // ========================================
  // AUDIT ET LOGS (SUPER ADMIN SEULEMENT)
  // ========================================

  router.get('/audit/logs',
    validationMiddleware.validatePagination,
    [
      query('action').optional().isString().withMessage((value, { req }) => req.t('validation.invalidAction')),
      query('userId').optional().isInt().withMessage((value, { req }) => req.t('validation.invalidUserId')),
      query('startDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidStartDate')),
      query('endDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidEndDate'))
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.requireRole(['Super Admin']),
    cacheMiddleware.conditionalCache(300),
    auditMiddleware.logAction('VIEW_AUDIT_LOGS'),
    dashboardController.getAuditLogs
  );

  router.get('/audit/user/:userId',
    validationMiddleware.validateId('userId'),
    validationMiddleware.validatePagination,
    authMiddleware.requireRole(['Super Admin']),
    cacheMiddleware.conditionalCache(300),
    auditMiddleware.logAction('VIEW_USER_AUDIT'),
    (req, res) => {
      req.query.userId = req.params.userId;
      dashboardController.getAuditLogs(req, res);
    }
  );

  // ========================================
  // RAPPORTS
  // ========================================

  router.get('/reports/activity',
    [
      query('startDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidStartDate')),
      query('endDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidEndDate')),
      query('format').optional().isIn(['json', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_ACTIVITY_REPORT'),
    dashboardController.generateActivityReport
  );

  router.get('/reports/moderation',
    [
      query('startDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidStartDate')),
      query('endDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidEndDate')),
      query('format').optional().isIn(['json', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_MODERATION_REPORT'),
    dashboardController.generateActivityReport
  );

  router.get('/reports/patrimoine',
    [
      query('startDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidStartDate')),
      query('endDate').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidEndDate')),
      query('format').optional().isIn(['json', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_PATRIMOINE_REPORT'),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: req.t('common.notImplemented')
      });
    }
  );

  // ========================================
  // CONFIGURATION ET PARAMÈTRES (SUPER ADMIN)
  // ========================================

  router.get('/config/permissions',
    authMiddleware.requireRole(['Super Admin']),
    cacheMiddleware.conditionalCache(3600),
    (req, res) => {
      res.json({
        success: true,
        data: dashboardController.adminPermissions
      });
    }
  );

  router.get('/config/metrics',
    cacheMiddleware.conditionalCache(3600),
    (req, res) => {
      const metrics = {
        users: ['total', 'new', 'active', 'retention'],
        content: ['oeuvres', 'evenements', 'artisanats', 'comments'],
        engagement: ['views', 'favorites', 'participations'],
        moderation: ['signalements', 'response_time', 'accuracy'],
        patrimoine: ['sites', 'qr_scans', 'parcours_usage']
      };
      res.json({ success: true, data: metrics });
    }
  );

  // ========================================
  // MONITORING ET SANTÉ SYSTÈME
  // ========================================

  router.get('/monitoring/health',
    cacheMiddleware.conditionalCache(60),
    async (req, res) => {
      try {
        await models.sequelize.authenticate();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'operational',
            cache: 'operational',
            storage: 'operational'
          },
          metrics: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          }
        };

        res.json({ success: true, data: health });
      } catch (error) {
        res.status(503).json({
          success: false,
          error: 'Service unhealthy',
          details: error.message
        });
      }
    }
  );

  router.get('/monitoring/alerts',
    cacheMiddleware.conditionalCache(300),
    dashboardController.getAlerts
  );

  // ========================================
  // GESTION DU CACHE
  // ========================================

  router.post('/cache/clear',
    [
      body('type').optional().isIn(['all', 'users', 'content', 'metadata']).withMessage((value, { req }) => req.t('validation.invalidCacheType'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('CLEAR_CACHE'),
    (req, res) => {
      const type = req.body.type || 'all';
      
      // Implémenter la logique de vidage du cache selon votre système
      if (cacheMiddleware.clearCache) {
        cacheMiddleware.clearCache(type);
      }
      
      res.json({
        success: true,
        message: req.t('admin.cacheCleared')
      });
    }
  );

  router.get('/cache/status',
    cacheMiddleware.conditionalCache(60),
    (req, res) => {
      res.json({
        success: true,
        data: {
          size: 0,
          entries: 0,
          hit_rate: 0,
          by_type: {}
        }
      });
    }
  );

  // ========================================
  // NOTIFICATIONS
  // ========================================

  router.get('/notifications',
    cacheMiddleware.conditionalCache(300),
    dashboardController.getNotifications
  );

  router.post('/notifications/broadcast',
    [
      body('title').notEmpty().withMessage((value, { req }) => req.t('validation.titleRequired')),
      body('message').notEmpty().withMessage((value, { req }) => req.t('validation.messageRequired')),
      body('target').isIn(['all', 'professionals', 'visitors']).withMessage((value, { req }) => req.t('validation.invalidTarget')),
      body('type').optional().isString().withMessage((value, { req }) => req.t('validation.invalidType'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('BROADCAST_NOTIFICATION'),
    dashboardController.broadcastNotification
  );


  return router;
};

module.exports = initDashboardRoutes;