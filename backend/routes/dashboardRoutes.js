// ========================================
// routes/dashboardRoutes.js - Routes pour le dashboard administrateur (MISE À JOUR)
// ========================================

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

  // Toutes les routes nécessitent l'authentification admin
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // ========================================
  // DASHBOARD PRINCIPAL
  // ========================================

  /**
   * @route GET /admin/dashboard/overview
   * @desc Vue d'ensemble du dashboard administrateur
   * @access Private (Admin)
   */
  router.get('/overview',
    cacheMiddleware.conditionalCache(300), // 5 minutes de cache
    dashboardController.getOverview.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/stats
   * @desc Statistiques détaillées
   * @access Private (Admin)
   */
  router.get('/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600), // 10 minutes de cache
    dashboardController.getDetailedStats.bind(dashboardController)
  );

  // ========================================
  // DASHBOARD PATRIMOINE
  // ========================================

  /**
   * @route GET /admin/dashboard/patrimoine
   * @desc Dashboard spécialisé patrimoine
   * @access Private (Admin Patrimoine)
   */
  router.get('/patrimoine',
    authMiddleware.checkPermission('patrimoine', 'manage'),
    cacheMiddleware.conditionalCache(600),
    auditMiddleware.logAction('VIEW_PATRIMOINE_DASHBOARD'),
    dashboardController.getPatrimoineDashboard.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/patrimoine/qr-stats
   * @desc Statistiques des QR codes
   * @access Private (Admin Patrimoine)
   */
  router.get('/patrimoine/qr-stats',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide (1-365 jours)')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('patrimoine', 'view_qr_stats'),
    cacheMiddleware.conditionalCache(900), // 15 minutes de cache
    dashboardController.getQRStats.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/patrimoine/parcours
   * @desc Statistiques des parcours
   * @access Private (Admin Patrimoine)
   */
  router.get('/patrimoine/parcours',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide'),
      query('statut').optional().isIn(['actif', 'inactif', 'maintenance']).withMessage('Statut invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('patrimoine', 'manage'),
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

  /**
   * @route GET /admin/dashboard/users/pending
   * @desc Utilisateurs professionnels en attente de validation
   * @access Private (Admin User)
   */
  router.get('/users/pending',
    validationMiddleware.validatePagination,
    authMiddleware.checkPermission('user', 'validate_professional'),
    cacheMiddleware.conditionalCache(180), // 3 minutes de cache
    dashboardController.getPendingUsers.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/users/stats
   * @desc Statistiques des utilisateurs
   * @access Private (Admin)
   */
  router.get('/users/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Période invalide'),
      query('type').optional().isIn(['visiteur', 'artisan', 'guide', 'expert']).withMessage('Type utilisateur invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/users/geographic
   * @desc Répartition géographique des utilisateurs
   * @access Private (Admin)
   */
  router.get('/users/geographic',
    cacheMiddleware.conditionalCache(1800), // 30 minutes de cache
    dashboardController.getDetailedStats.bind(dashboardController)
  );

  // ========================================
  // GESTION DU CONTENU
  // ========================================

  /**
   * @route GET /admin/dashboard/content/pending-oeuvres
   * @desc Œuvres en attente de validation
   * @access Private (Admin Content)
   */
  router.get('/content/pending-oeuvres',
    validationMiddleware.validatePagination,
    authMiddleware.checkPermission('oeuvre', 'validate'),
    cacheMiddleware.conditionalCache(180),
    dashboardController.getPendingOeuvres.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/content/stats
   * @desc Statistiques du contenu
   * @access Private (Admin)
   */
  router.get('/content/stats',
    [
      query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Période invalide'),
      query('type').optional().isIn(['oeuvre', 'evenement', 'artisanat']).withMessage('Type contenu invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/content/top-contributors
   * @desc Top contributeurs de contenu
   * @access Private (Admin)
   */
  router.get('/content/top-contributors',
    [
      query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide'),
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    dashboardController.getDetailedStats.bind(dashboardController)
  );

  // ========================================
  // MODÉRATION
  // ========================================

  /**
   * @route GET /admin/dashboard/moderation/queue
   * @desc File d'attente de modération
   * @access Private (Moderator)
   */
  router.get('/moderation/queue',
    authMiddleware.checkPermission('moderation', 'view_queue'),
    cacheMiddleware.conditionalCache(60), // 1 minute de cache
    auditMiddleware.logAction('VIEW_MODERATION_QUEUE'),
    dashboardController.getModerationQueue.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/moderation/signalements
   * @desc Signalements à traiter
   * @access Private (Moderator)
   */
  router.get('/moderation/signalements',
    validationMiddleware.validatePagination,
    [
      query('type').optional().isIn(['commentaire', 'oeuvre', 'evenement', 'user']).withMessage('Type invalide'),
      query('priorite').optional().isIn(['basse', 'normale', 'haute', 'urgente']).withMessage('Priorité invalide'),
      query('statut').optional().isIn(['en_attente', 'en_cours', 'traite']).withMessage('Statut invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('moderation', 'view_signalements'),
    cacheMiddleware.conditionalCache(120), // 2 minutes de cache
    dashboardController.getReportedContent.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/moderation/stats
   * @desc Statistiques de modération
   * @access Private (Moderator)
   */
  router.get('/moderation/stats',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('moderation', 'view_stats'),
    cacheMiddleware.conditionalCache(600),
    dashboardController.getDetailedStats.bind(dashboardController)
  );

  // ========================================
  // ACTIONS ADMINISTRATIVES
  // ========================================

  /**
   * @route POST /admin/dashboard/actions
   * @desc Exécuter une action administrative
   * @access Private (Admin selon action)
   */
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
    dashboardController.performAdminAction.bind(dashboardController)
  );

  /**
   * @route POST /admin/dashboard/actions/bulk
   * @desc Actions en lot
   * @access Private (Admin selon action)
   */
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

  // ========================================
  // ACTIONS RAPIDES SPÉCIALISÉES
  // ========================================

  /**
   * @route PATCH /admin/dashboard/users/:id/validate
   * @desc Validation rapide d'un professionnel
   * @access Private (Admin User)
   */
  router.patch('/users/:id/validate',
    validationMiddleware.validateId('id'),
    [
      body('valide').isBoolean().withMessage('Valeur de validation invalide'),
      body('raison').optional().isString().withMessage('Raison invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('user', 'validate_professional'),
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

  /**
   * @route PATCH /admin/dashboard/oeuvres/:id/validate
   * @desc Validation rapide d'une œuvre
   * @access Private (Admin Content)
   */
  router.patch('/oeuvres/:id/validate',
    validationMiddleware.validateId('id'),
    [
      body('valide').isBoolean().withMessage('Valeur de validation invalide'),
      body('raison_rejet').optional().isString().withMessage('Raison de rejet invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('oeuvre', 'validate'),
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

  /**
   * @route PATCH /admin/dashboard/signalements/:id/moderate
   * @desc Modération rapide d'un signalement
   * @access Private (Moderator)
   */
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
    authMiddleware.checkPermission('moderation', 'moderate_signalement'),
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

  /**
   * @route PATCH /admin/dashboard/users/:id/suspend
   * @desc Suspension rapide d'un utilisateur
   * @access Private (Admin User)
   */
  router.patch('/users/:id/suspend',
    validationMiddleware.validateId('id'),
    [
      body('raison').notEmpty().withMessage('Raison de suspension requise'),
      body('duree').optional().isInt({ min: 1 }).withMessage('Durée invalide (jours)')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('user', 'suspend'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('SUSPEND_USER'),
    async (req, res) => {
      req.body = {
        action: 'suspend_user',
        entityType: 'user',
        entityId: req.params.id,
        data: {
          raison: req.body.raison,
          duree: req.body.duree
        }
      };
      return dashboardController.performAdminAction(req, res);
    }
  );

  // ========================================
  // ANALYTICS AVANCÉES
  // ========================================

  /**
   * @route GET /admin/dashboard/analytics/advanced
   * @desc Analytics avancées (rétention, funnel, etc.)
   * @access Private (Admin)
   */
  router.get('/analytics/advanced',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('analytics', 'view_advanced'),
    cacheMiddleware.conditionalCache(1800), // 30 minutes de cache
    dashboardController.getAdvancedAnalytics.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/analytics/retention
   * @desc Métriques de rétention utilisateurs
   * @access Private (Admin)
   */
  router.get('/analytics/retention',
    [
      query('period').optional().isInt({ min: 7, max: 365 }).withMessage('Période invalide'),
      query('cohort').optional().isString().withMessage('Cohorte invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('analytics', 'view_retention'),
    cacheMiddleware.conditionalCache(3600), // 1 heure de cache
    dashboardController.getAdvancedAnalytics.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/analytics/funnel
   * @desc Funnel de conversion
   * @access Private (Admin)
   */
  router.get('/analytics/funnel',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('analytics', 'view_funnel'),
    cacheMiddleware.conditionalCache(1800),
    dashboardController.getAdvancedAnalytics.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/analytics/engagement
   * @desc Métriques d'engagement
   * @access Private (Admin)
   */
  router.get('/analytics/engagement',
    [
      query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Période invalide'),
      query('metric').optional().isIn(['session_duration', 'pages_per_session', 'bounce_rate']).withMessage('Métrique invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('analytics', 'view_engagement'),
    cacheMiddleware.conditionalCache(900),
    dashboardController.getAdvancedAnalytics.bind(dashboardController)
  );

  // ========================================
  // AUDIT ET LOGS
  // ========================================

  /**
   * @route GET /admin/dashboard/audit/logs
   * @desc Logs d'audit des actions admin
   * @access Private (Super Admin)
   */
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
    dashboardController.getAuditLogs.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/audit/user/:userId
   * @desc Historique d'audit d'un utilisateur spécifique
   * @access Private (Super Admin)
   */
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

  /**
   * @route GET /admin/dashboard/reports/activity
   * @desc Rapport d'activité
   * @access Private (Admin)
   */
  router.get('/reports/activity',
    [
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
      query('format').optional().isIn(['json', 'excel']).withMessage('Format invalide')
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_ACTIVITY_REPORT'),
    dashboardController.generateActivityReport.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/reports/moderation
   * @desc Rapport de modération
   * @access Private (Moderator)
   */
  router.get('/reports/moderation',
    [
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
      query('format').optional().isIn(['json', 'excel']).withMessage('Format invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('moderation', 'generate_reports'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('GENERATE_MODERATION_REPORT'),
    dashboardController.generateActivityReport.bind(dashboardController)
  );

  /**
   * @route GET /admin/dashboard/reports/patrimoine
   * @desc Rapport patrimoine
   * @access Private (Admin Patrimoine)
   */
  router.get('/reports/patrimoine',
    [
      query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
      query('format').optional().isIn(['json', 'excel']).withMessage('Format invalide')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.checkPermission('patrimoine', 'generate_reports'),
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
  // CONFIGURATION ET PARAMÈTRES
  // ========================================

  /**
   * @route GET /admin/dashboard/config/permissions
   * @desc Configuration des permissions par rôle
   * @access Private (Super Admin)
   */
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

  /**
   * @route GET /admin/dashboard/config/metrics
   * @desc Configuration des métriques disponibles
   * @access Private (Admin)
   */
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
  // NOTIFICATIONS ET ALERTES
  // ========================================

  /**
   * @route GET /admin/dashboard/notifications
   * @desc Notifications pour les administrateurs
   * @access Private (Admin)
   */
  router.get('/notifications',
    [
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Offset invalide'),
      query('type').optional().isString().withMessage('Type invalide'),
      query('priority').optional().isIn(['basse', 'normale', 'haute', 'urgente']).withMessage('Priorité invalide')
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(60),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Système de notifications admin à implémenter'
      });
    }
  );

  /**
   * @route POST /admin/dashboard/notifications/broadcast
   * @desc Diffuser une notification à tous les utilisateurs
   * @access Private (Super Admin)
   */
  router.post('/notifications/broadcast',
    [
      body('title').notEmpty().isLength({ max: 200 }).withMessage('Titre requis (max 200 caractères)'),
      body('message').notEmpty().isLength({ max: 2000 }).withMessage('Message requis (max 2000 caractères)'),
      body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Type invalide'),
      body('target_users').optional().isArray().withMessage('Utilisateurs cibles doivent être un tableau')
    ],
    validationMiddleware.handleValidationErrors,
    authMiddleware.requireRole(['Super Admin']),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('BROADCAST_NOTIFICATION'),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Diffusion de notifications à implémenter'
      });
    }
  );

  // ========================================
  // MONITORING ET SANTÉ SYSTÈME
  // ========================================

  /**
   * @route GET /admin/dashboard/monitoring/health
   * @desc État de santé du système
   * @access Private (Admin)
   */
  router.get('/monitoring/health',
    cacheMiddleware.conditionalCache(60),
    async (req, res) => {
      try {
        // Vérifier la santé de la base de données
        await models.sequelize.authenticate();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'operational',
            cache: 'operational', // À implémenter selon votre cache
            storage: 'operational' // À implémenter selon votre stockage
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

  /**
   * @route GET /admin/dashboard/monitoring/alerts
   * @desc Alertes système actives
   * @access Private (Admin)
   */
  router.get('/monitoring/alerts',
    cacheMiddleware.conditionalCache(60),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Système d\'alertes à implémenter'
      });
    }
  );

  // ========================================
  // GESTION DU CACHE
  // ========================================

  /**
   * @route DELETE /admin/dashboard/cache/clear
   * @desc Vider le cache des statistiques
   * @access Private (Super Admin)
   */
  router.delete('/cache/clear',
    authMiddleware.requireRole(['Super Admin']),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('CLEAR_CACHE'),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Fonctionnalité de vidage de cache à implémenter'
      });
    }
  );

  /**
   * @route GET /admin/dashboard/cache/status
   * @desc Statut du cache
   * @access Private (Admin)
   */
  router.get('/cache/status',
    cacheMiddleware.conditionalCache(60),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: 'Statut de cache à implémenter'
      });
    }
  );

  console.log('✅ Routes dashboard administrateur initialisées avec tous les middlewares');

  return router;
};

module.exports = initDashboardRoutes;