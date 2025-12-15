// routes/notificationRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');

const initNotificationRoutes = (models) => {
  console.log('🔔 Initialisation des routes notifications i18n...');

  const authMiddleware = createAuthMiddleware(models);
  const notificationController = new NotificationController(models);

  // Middleware de validation
  let validationMiddleware;
  try {
    validationMiddleware = require('../middlewares/validationMiddleware');
  } catch (error) {
    validationMiddleware = {
      handleValidationErrors: (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
      }
    };
  }

  // ========================================================================
  // ROUTE INFO / DOCUMENTATION
  // ========================================================================

  router.get('/', authMiddleware.authenticate, (req, res) => {
    res.json({
      message: 'API Notifications i18n - Documentation',
      version: '2.0.0',
      i18n: {
        note: 'Les relations (Evenement, Programme, Oeuvre) sont automatiquement traduites selon la langue active',
        detection: 'Via ?lang=, Cookie language, Header X-Language, Accept-Language',
        languages: ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng']
      },
      endpoints: {
        list: 'GET /api/notifications/list',
        summary: 'GET /api/notifications/summary',
        preferences: 'GET/PUT /api/notifications/preferences',
        markAsRead: 'PUT /api/notifications/:id/read',
        markAllAsRead: 'PUT /api/notifications/read-all',
        delete: 'DELETE /api/notifications/:id'
      }
    });
  });

  // ========================================================================
  // ROUTES PUBLIQUES (authentification requise)
  // ========================================================================

  // Récupérer les notifications
  router.get('/list',
    authMiddleware.authenticate,
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('nonLues').optional().isBoolean(),
      query('type').optional().isString()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.getMyNotifications(req, res)
  );

  // Résumé des notifications
  router.get('/summary',
    authMiddleware.authenticate,
    (req, res) => notificationController.getNotificationsSummary(req, res)
  );

  // Préférences
  router.get('/preferences',
    authMiddleware.authenticate,
    (req, res) => notificationController.getPreferences(req, res)
  );

  // ========================================================================
  // ROUTES DE GESTION
  // ========================================================================

  // Marquer comme lue
  router.put('/:id/read',
    authMiddleware.authenticate,
    param('id').isInt({ min: 1 }).withMessage('ID notification invalide'),
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.markAsRead(req, res)
  );

  // Marquer toutes comme lues
  router.put('/read-all',
    authMiddleware.authenticate,
    (req, res) => notificationController.markAllAsRead(req, res)
  );

  // Marquer plusieurs comme lues
  router.put('/read-multiple',
    authMiddleware.authenticate,
    [
      body('notificationIds').isArray().withMessage('notificationIds doit être un tableau'),
      body('notificationIds').notEmpty().withMessage('notificationIds ne peut pas être vide'),
      body('notificationIds.*').isInt({ min: 1 })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.markMultipleAsRead(req, res)
  );

  // Mettre à jour les préférences
  router.put('/preferences',
    authMiddleware.authenticate,
    [
      body('global').optional().isObject(),
      body('global.actives').optional().isBoolean(),
      body('global.email').optional().isBoolean(),
      body('global.sms').optional().isBoolean(),
      body('types').optional().isObject()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.updatePreferences(req, res)
  );

  // ========================================================================
  // ROUTES DE SUPPRESSION
  // ========================================================================

  // Supprimer toutes les notifications lues
  router.delete('/read/all',
    authMiddleware.authenticate,
    (req, res) => notificationController.deleteReadNotifications(req, res)
  );

  // Supprimer une notification
  router.delete('/:id',
    authMiddleware.authenticate,
    param('id').isInt({ min: 1 }).withMessage('ID notification invalide'),
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.deleteNotification(req, res)
  );

  // ========================================================================
  // ROUTES DE TEST (dev/admin)
  // ========================================================================

  router.post('/test-email',
    authMiddleware.authenticate,
    [
      body('type').optional().isIn(['test', 'bienvenue', 'notification'])
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.testEmail(req, res)
  );

  // WebSocket status
  router.get('/ws/status',
    authMiddleware.authenticate,
    (req, res) => {
      try {
        const socketService = require('../services/socketService').default;
        const status = socketService.getStatus();
        res.json({ success: true, websocket: status });
      } catch (error) {
        res.json({ success: false, websocket: { connected: false, error: 'Service non disponible' } });
      }
    }
  );

  // 404
  router.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route notification non trouvée',
      message: `La route ${req.method} ${req.originalUrl} n'existe pas`
    });
  });

  console.log('✅ Routes notifications i18n initialisées');
  console.log('  🌍 Relations (Evenement, Programme, Oeuvre) automatiquement traduites');

  return router;
};

module.exports = initNotificationRoutes;
