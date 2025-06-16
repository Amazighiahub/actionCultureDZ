// routes/notificationRoutes.js - Routes API pour les notifications
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');

const initNotificationRoutes = (models) => {
  console.log('🔧 Initialisation des routes notifications...');

  // Créer le middleware d'authentification
  const authMiddleware = createAuthMiddleware(models);
  
  // Initialiser le controller
  const notificationController = new NotificationController(models);

  // Middleware de validation (si disponible)
  let validationMiddleware;
  try {
    validationMiddleware = require('../middlewares/validationMiddleware');
  } catch (error) {
    console.warn('⚠️ Middleware de validation non disponible pour notifications');
    validationMiddleware = {
      handleValidationErrors: (req, res, next) => next()
    };
  }

  // ========================================================================
  // ROUTE INFO / DOCUMENTATION
  // ========================================================================

  router.get('/', authMiddleware.authenticate, (req, res) => {
    res.json({
      message: 'API Notifications - Documentation',
      version: '1.0.0',
      endpoints: {
        list: {
          method: 'GET',
          path: '/api/notifications',
          description: 'Récupérer les notifications de l\'utilisateur',
          params: {
            page: 'Numéro de page (défaut: 1)',
            limit: 'Nombre d\'éléments par page (défaut: 20, max: 100)',
            nonLues: 'Filtrer les non lues uniquement (true/false)',
            type: 'Filtrer par type de notification'
          }
        },
        summary: {
          method: 'GET',
          path: '/api/notifications/summary',
          description: 'Résumé des notifications (compteurs)'
        },
        preferences: {
          get: {
            method: 'GET',
            path: '/api/notifications/preferences',
            description: 'Récupérer les préférences de notification'
          },
          update: {
            method: 'PUT',
            path: '/api/notifications/preferences',
            description: 'Mettre à jour les préférences'
          }
        },
        markAsRead: {
          single: {
            method: 'PUT',
            path: '/api/notifications/:id/read',
            description: 'Marquer une notification comme lue'
          },
          all: {
            method: 'PUT',
            path: '/api/notifications/read-all',
            description: 'Marquer toutes les notifications comme lues'
          },
          multiple: {
            method: 'PUT',
            path: '/api/notifications/read-multiple',
            description: 'Marquer plusieurs notifications comme lues'
          }
        },
        delete: {
          single: {
            method: 'DELETE',
            path: '/api/notifications/:id',
            description: 'Supprimer une notification'
          },
          allRead: {
            method: 'DELETE',
            path: '/api/notifications/read/all',
            description: 'Supprimer toutes les notifications lues'
          }
        },
        test: {
          method: 'POST',
          path: '/api/notifications/test-email',
          description: 'Tester l\'envoi d\'email (dev/admin)'
        }
      },
      types: [
        'validation_participation',
        'annulation_evenement', 
        'modification_programme',
        'nouvel_evenement',
        'nouvelle_oeuvre',
        'nouveau_commentaire',
        'bienvenue',
        'validation_compte',
        'message_admin',
        'rappel_evenement',
        'autre'
      ]
    });
  });

  // ========================================================================
  // ROUTES PUBLIQUES (authentification requise)
  // ========================================================================

  // Récupérer les notifications de l'utilisateur (après /summary pour éviter conflit)
  router.get('/list',
    authMiddleware.authenticate,
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page doit être un entier positif'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit doit être entre 1 et 100'),
      query('nonLues').optional().isBoolean().withMessage('nonLues doit être un booléen'),
      query('type').optional().isString().withMessage('Type doit être une chaîne')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.getMyNotifications(req, res)
  );

  // Récupérer le résumé des notifications
  router.get('/summary',
    authMiddleware.authenticate,
    (req, res) => notificationController.getNotificationsSummary(req, res)
  );

  // Récupérer les préférences de notification
  router.get('/preferences',
    authMiddleware.authenticate,
    (req, res) => notificationController.getPreferences(req, res)
  );

  // ========================================================================
  // ROUTES DE GESTION
  // ========================================================================

  // Marquer une notification comme lue
  router.put('/:id/read',
    authMiddleware.authenticate,
    [
      param('id').isInt({ min: 1 }).withMessage('ID notification invalide')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.markAsRead(req, res)
  );

  // Marquer toutes les notifications comme lues
  router.put('/read-all',
    authMiddleware.authenticate,
    (req, res) => notificationController.markAllAsRead(req, res)
  );

  // Marquer plusieurs notifications comme lues
  router.put('/read-multiple',
    authMiddleware.authenticate,
    [
      body('notificationIds').isArray().withMessage('notificationIds doit être un tableau'),
      body('notificationIds').notEmpty().withMessage('notificationIds ne peut pas être vide'),
      body('notificationIds.*').isInt({ min: 1 }).withMessage('Chaque ID doit être un entier positif')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.markMultipleAsRead(req, res)
  );

  // Mettre à jour les préférences
  router.put('/preferences',
    authMiddleware.authenticate,
    [
      body('global').optional().isObject().withMessage('global doit être un objet'),
      body('global.actives').optional().isBoolean().withMessage('actives doit être un booléen'),
      body('global.email').optional().isBoolean().withMessage('email doit être un booléen'),
      body('global.sms').optional().isBoolean().withMessage('sms doit être un booléen'),
      body('types').optional().isObject().withMessage('types doit être un objet'),
      body('types.nouveauxEvenements').optional().isBoolean(),
      body('types.modificationsProgramme').optional().isBoolean(),
      body('types.rappels').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.updatePreferences(req, res)
  );

  // ========================================================================
  // ROUTES DE SUPPRESSION
  // ========================================================================

  // Supprimer toutes les notifications lues (avant la route avec :id)
  router.delete('/read/all',
    authMiddleware.authenticate,
    (req, res) => notificationController.deleteReadNotifications(req, res)
  );

  // Supprimer une notification
  router.delete('/:id',
    authMiddleware.authenticate,
    [
      param('id').isInt({ min: 1 }).withMessage('ID notification invalide')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.deleteNotification(req, res)
  );

  // ========================================================================
  // ROUTES DE TEST (dev/admin)
  // ========================================================================

  // Tester l'envoi d'email
  router.post('/test-email',
    authMiddleware.authenticate,
    [
      body('type').optional().isIn(['test', 'bienvenue', 'notification']).withMessage('Type invalide')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => notificationController.testEmail(req, res)
  );

  // ========================================================================
  // WEBSOCKET - Endpoints pour la gestion temps réel
  // ========================================================================

  // Endpoint pour vérifier le statut WebSocket
  router.get('/ws/status',
    authMiddleware.authenticate,
    (req, res) => {
      try {
        const socketService = require('../services/socketService').default;
        const status = socketService.getStatus();
        
        res.json({
          success: true,
          websocket: status
        });
      } catch (error) {
        res.json({
          success: false,
          websocket: {
            connected: false,
            error: 'Service WebSocket non disponible'
          }
        });
      }
    }
  );

  // ========================================================================
  // GESTION DES ERREURS 404
  // ========================================================================

  router.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route notification non trouvée',
      message: `La route ${req.method} ${req.originalUrl} n'existe pas`,
      suggestion: 'Consultez GET /api/notifications/ pour la documentation'
    });
  });

  console.log('✅ Routes notifications initialisées');
  console.log('  📍 Liste et résumé: /list, /summary');
  console.log('  📍 Gestion: /read-all, /:id/read, /read-multiple');
  console.log('  📍 Préférences: /preferences');
  console.log('  📍 Suppression: /:id, /read/all');
  console.log('  📍 WebSocket: /ws/status');

  return router;
};

module.exports = initNotificationRoutes;