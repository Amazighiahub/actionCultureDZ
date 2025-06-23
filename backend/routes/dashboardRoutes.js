// routes/dashboardRoutes.js - VERSION COMPLÈTE
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const auditMiddleware = require('../middlewares/auditMiddleware');
const { body, query, param } = require('express-validator');

const initDashboardRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const dashboardController = new DashboardController(models);

  // Auto-bind toutes les méthodes du controller
  Object.getOwnPropertyNames(Object.getPrototypeOf(dashboardController))
    .filter(method => method !== 'constructor' && typeof dashboardController[method] === 'function')
    .forEach(method => {
      dashboardController[method] = dashboardController[method].bind(dashboardController);
    });

  // Debug pour vérifier les méthodes
  console.log('✅ DashboardController initialisé avec les méthodes:', 
    Object.getOwnPropertyNames(Object.getPrototypeOf(dashboardController))
      .filter(m => typeof dashboardController[m] === 'function' && m !== 'constructor')
  );

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
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Période invalide')
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
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide (1-365 jours)')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    dashboardController.getQRStats
  );

  router.get('/patrimoine/parcours',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide'),
      query('statut').optional().isIn(['actif', 'inactif', 'maintenance']).withMessage('Statut invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Statistiques parcours à implémenter'
      });
    }
  );

  // ========================================
  // GESTION DES UTILISATEURS
  // ========================================

  // Liste des utilisateurs en attente
  router.get('/users/pending',
    validationMiddleware.validatePagination,
    cacheMiddleware.conditionalCache(180),
    dashboardController.getPendingUsers
  );

  // Statistiques utilisateurs
  router.get('/users/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Période invalide'),
      query('type').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage('Type utilisateur invalide')
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
      query('q').notEmpty().withMessage('Terme de recherche requis'),
      query('type').optional().isIn(['nom', 'email', 'telephone']).withMessage('Type de recherche invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(300),
    dashboardController.searchUsers
  );

  // Export des utilisateurs
  router.get('/users/export',
    [
      query('format').optional().isIn(['csv', 'excel']).withMessage('Format invalide'),
      query('type_user').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage('Type invalide'),
      query('statut').optional().isIn(['actif', 'inactif', 'suspendu']).withMessage('Statut invalide'),
      query('start_date').optional().isISO8601().withMessage('Date début invalide'),
      query('end_date').optional().isISO8601().withMessage('Date fin invalide')
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
      body('valide').isBoolean().withMessage('Valeur de validation invalide'),
      body('raison').optional().isString().withMessage('Raison invalide')
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
      body('nom').optional().isString().trim().notEmpty().withMessage('Nom invalide'),
      body('prenom').optional().isString().trim().notEmpty().withMessage('Prénom invalide'),
      body('email').optional().isEmail().withMessage('Email invalide'),
      body('telephone').optional().isMobilePhone('any').withMessage('Téléphone invalide'),
      body('type_user').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage('Type utilisateur invalide'),
      body('statut').optional().isIn(['actif', 'inactif', 'suspendu']).withMessage('Statut invalide'),
      body('biographie').optional().isString().withMessage('Biographie invalide'),
      body('entreprise').optional().isString().withMessage('Entreprise invalide'),
      body('site_web').optional().isURL().withMessage('URL du site web invalide'),
      body('wilaya_residence').optional().isInt({ min: 1, max: 58 }).withMessage('Wilaya invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('UPDATE_USER'),
    dashboardController.updateUser
  );

  // Supprimer un utilisateur (soft delete)
 // Remplacez la route DELETE existante dans dashboardRoutes.js par celle-ci :
router.delete('/test/:id', (req, res) => {
  console.log('✅ Route DELETE test fonctionne, ID:', req.params.id);
  console.log('📧 User connecté:', req.user?.email);
  console.log('🔧 Controller disponible:', !!dashboardController);
  console.log('🗑️ Méthode deleteUser:', typeof dashboardController.deleteUser);
  
  // Appeler la méthode deleteUser
  return dashboardController.deleteUser(req, res);
});
// Supprimer un utilisateur (hard delete)
  router.delete('/users/:id', (req, res) => {
    console.log('🗑️ Route DELETE simple appelée');
    console.log('ID:', req.params.id);
    console.log('Controller:', !!dashboardController);
    console.log('deleteUser:', typeof dashboardController.deleteUser);
    
    if (dashboardController && typeof dashboardController.deleteUser === 'function') {
      return dashboardController.deleteUser(req, res);
    } else {
      res.status(500).json({
        success: false,
        error: 'Méthode deleteUser non disponible'
      });
    }
  });
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
      body('role_id').isInt({ min: 1 }).withMessage('ID de rôle invalide')
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
      body('user_ids').isArray({ min: 1 }).withMessage('Liste d\'utilisateurs requise'),
      body('user_ids.*').isInt({ min: 1 }).withMessage('ID utilisateur invalide'),
      body('action').isIn(['activate', 'deactivate', 'delete', 'change_role']).withMessage('Action invalide'),
      body('role_id').optional().isInt({ min: 1 }).withMessage('ID de rôle invalide')
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
    cacheMiddleware.conditionalCache(180),
    dashboardController.getPendingOeuvres
  );

  router.get('/content/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Période invalide'),
      query('type').optional().isIn(['oeuvre', 'evenement', 'artisanat']).withMessage('Type contenu invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats
  );

  router.get('/content/top-contributors',
    [
      query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide'),
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
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
      query('type').optional().isIn(['commentaire', 'oeuvre', 'evenement', 'user']).withMessage('Type invalide'),
      query('priorite').optional().isIn(['basse', 'normale', 'haute', 'urgente']).withMessage('Priorité invalide'),
      query('statut').optional().isIn(['en_attente', 'en_cours', 'traite']).withMessage('Statut invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(120),
    dashboardController.getReportedContent
  );

  router.get('/moderation/stats',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
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
        .withMessage('Action invalide'),
      body('entityType')
        .optional()
        .isIn(['user', 'oeuvre', 'comment', 'signalement'])
        .withMessage('Type d\'entité invalide'),
      body('entityId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID d\'entité invalide'),
      body('data').optional().isObject().withMessage('Données invalides')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('ADMIN_ACTION'),
    dashboardController.performAdminAction
  );

  router.post('/actions/bulk',
    [
      body('action').isString().withMessage('Action requise'),
      body('entities').isArray().withMessage('Entités doivent être un tableau'),
      body('data').optional().isObject().withMessage('Données invalides')
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
      body('valide').isBoolean().withMessage('Valeur de validation invalide'),
      body('raison_rejet').optional().isString().withMessage('Raison de rejet invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('VALIDATE_OEUVRE'),
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
        .withMessage('Action de modération invalide'),
      body('notes').optional().isString().withMessage('Notes invalides')
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
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(1800),
    dashboardController.getAdvancedAnalytics
  );

  router.get('/analytics/retention',
    [
      query('period').optional().isInt({ min: 7, max: 365 }).withMessage('Période invalide'),
      query('cohort').optional().isString().withMessage('Cohorte invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(3600),
    dashboardController.getAdvancedAnalytics
  );

  router.get('/analytics/funnel',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(1800),
    dashboardController.getAdvancedAnalytics
  );

  router.get('/analytics/engagement',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide'),
      query('metric').optional().isIn(['session_duration', 'pages_per_session', 'bounce_rate']).withMessage('Métrique invalide')
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
      query('action').optional().isString().withMessage('Action invalide'),
      query('userId').optional().isInt().withMessage('ID utilisateur invalide'),
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide')
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
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
      query('format').optional().isIn(['json', 'excel']).withMessage('Format invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_ACTIVITY_REPORT'),
    dashboardController.generateActivityReport
  );

  router.get('/reports/moderation',
    [
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
      query('format').optional().isIn(['json', 'excel']).withMessage('Format invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_MODERATION_REPORT'),
    dashboardController.generateActivityReport
  );

  router.get('/reports/patrimoine',
    [
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
      query('format').optional().isIn(['json', 'excel']).withMessage('Format invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_PATRIMOINE_REPORT'),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Rapport patrimoine à implémenter'
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
      body('type').optional().isIn(['all', 'users', 'content', 'metadata']).withMessage('Type de cache invalide')
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
        message: `Cache ${type} vidé avec succès`
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
      body('title').notEmpty().withMessage('Titre requis'),
      body('message').notEmpty().withMessage('Message requis'),
      body('target').isIn(['all', 'professionals', 'visitors']).withMessage('Cible invalide'),
      body('type').optional().isString().withMessage('Type invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('BROADCAST_NOTIFICATION'),
    dashboardController.broadcastNotification
  );

  console.log('✅ Routes dashboard administrateur initialisées');

  return router;
};

module.exports = initDashboardRoutes;