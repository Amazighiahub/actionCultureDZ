// routes/notificationRoutes.js - Routes pour la gestion des notifications
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, query } = require('express-validator');

const initNotificationRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const notificationController = new NotificationController(models);

  // ========================================================================
  // TOUTES LES ROUTES NÉCESSITENT UNE AUTHENTIFICATION
  // ========================================================================

  // Middleware d'authentification appliqué à toutes les routes
  router.use(authMiddleware.authenticate);

  // ========================================================================
  // CONSULTATION DES NOTIFICATIONS
  // ========================================================================

  // Récupérer mes notifications avec pagination
  router.get('/',
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
    query('nonLues').optional().isBoolean().withMessage('Paramètre nonLues invalide'),
    query('type').optional().isIn([
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
    ]).withMessage('Type de notification invalide'),
    validationMiddleware.handleValidationErrors,
    notificationController.getMyNotifications.bind(notificationController)
  );

  // Récupérer le résumé (badge/compteur)
  router.get('/summary',
    notificationController.getNotificationsSummary.bind(notificationController)
  );

  // ========================================================================
  // GESTION DES NOTIFICATIONS
  // ========================================================================

  // Marquer une notification comme lue
  router.patch('/:id/read',
    validationMiddleware.validateId('id'),
    notificationController.markAsRead.bind(notificationController)
  );

  // Marquer toutes les notifications comme lues
  router.patch('/read-all',
    notificationController.markAllAsRead.bind(notificationController)
  );

  // Marquer plusieurs notifications comme lues
  router.patch('/read-multiple',
    body('notificationIds')
      .isArray()
      .withMessage('Liste d\'IDs requise')
      .notEmpty()
      .withMessage('Liste vide'),
    body('notificationIds.*')
      .isInt()
      .withMessage('IDs invalides'),
    validationMiddleware.handleValidationErrors,
    notificationController.markMultipleAsRead.bind(notificationController)
  );

  // Supprimer une notification
  router.delete('/:id',
    validationMiddleware.validateId('id'),
    notificationController.deleteNotification.bind(notificationController)
  );

  // Supprimer toutes les notifications lues
  router.delete('/read/all',
    notificationController.deleteReadNotifications.bind(notificationController)
  );

  // ========================================================================
  // PRÉFÉRENCES
  // ========================================================================

  // Récupérer les préférences de notification
  router.get('/preferences',
    notificationController.getPreferences.bind(notificationController)
  );

  // Mettre à jour les préférences
  router.put('/preferences',
    body('global').optional().isObject().withMessage('Format invalide'),
    body('global.actives').optional().isBoolean().withMessage('Valeur invalide'),
    body('global.email').optional().isBoolean().withMessage('Valeur invalide'),
    body('global.sms').optional().isBoolean().withMessage('Valeur invalide'),
    body('types').optional().isObject().withMessage('Format invalide'),
    body('types.nouveauxEvenements').optional().isBoolean(),
    body('types.modificationsProgramme').optional().isBoolean(),
    body('types.rappels').optional().isBoolean(),
    validationMiddleware.handleValidationErrors,
    notificationController.updatePreferences.bind(notificationController)
  );

  // ========================================================================
  // DÉVELOPPEMENT/TEST
  // ========================================================================

  // Tester l'envoi d'email (dev/admin uniquement)
  router.post('/test-email',
    body('type')
      .optional()
      .isIn(['test', 'bienvenue'])
      .withMessage('Type de test invalide'),
    validationMiddleware.handleValidationErrors,
    notificationController.testEmail.bind(notificationController)
  );

  console.log('✅ Routes notifications initialisées');
  console.log('  📍 Consultation et gestion des notifications');
  console.log('  📍 Préférences utilisateur');
  console.log('  📍 Mode test disponible');

  return router;
};

module.exports = initNotificationRoutes;