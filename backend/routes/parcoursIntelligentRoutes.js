const express = require('express');
const router = express.Router();
const ParcoursIntelligentController = require('../controllers/ParcoursIntelligentController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

const initParcoursIntelligentRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const parcoursController = new ParcoursIntelligentController(models);

  // Validation pour la génération de parcours
  const parcoursValidation = [
    query('rayon').optional().isFloat({ min: 1, max: 50 }).withMessage('Rayon invalide (1-50 km)'),
    query('maxSites').optional().isInt({ min: 1, max: 20 }).withMessage('Nombre de sites invalide'),
    query('dureeMaxParcours').optional().isInt({ min: 60, max: 720 }).withMessage('Durée invalide (1-12 heures)'),
    query('includeRestaurants').optional().isBoolean().withMessage('Paramètre restaurants invalide'),
    query('includeHotels').optional().isBoolean().withMessage('Paramètre hôtels invalide')
  ];

  // Routes publiques

  // Générer un parcours intelligent autour d'un événement
  router.get('/evenement/:evenementId', 
    param('evenementId').isInt().withMessage('ID événement invalide'),
    parcoursValidation,
    validationMiddleware.handleValidationErrors,
    parcoursController.generateParcoursForEvenement.bind(parcoursController)
  );

  // Récupérer les parcours populaires d'une wilaya
  router.get('/wilaya/:wilayaId/populaires', 
    param('wilayaId').isInt().withMessage('ID wilaya invalide'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limite invalide'),
    validationMiddleware.handleValidationErrors,
    parcoursController.getParcoursPopulaires.bind(parcoursController)
  );

  // Routes nécessitant une authentification

  // Générer un parcours personnalisé
  router.post('/personnalise', 
    authMiddleware.authenticate,
    [
      body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
      body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
      body('interests').optional().isArray().withMessage('Intérêts invalides'),
      body('interests.*').optional().isIn(['histoire', 'art', 'architecture', 'nature', 'religion', 'gastronomie']).withMessage('Intérêt non reconnu'),
      body('duration').optional().isInt({ min: 60, max: 720 }).withMessage('Durée invalide'),
      body('transport').optional().isIn(['marche', 'velo', 'voiture']).withMessage('Mode de transport invalide'),
      body('accessibility').optional().isBoolean().withMessage('Accessibilité invalide'),
      body('familyFriendly').optional().isBoolean().withMessage('Paramètre famille invalide')
    ],
    validationMiddleware.handleValidationErrors,
    parcoursController.generateParcoursPersonnalise.bind(parcoursController)
  );

  console.log('✅ Routes parcours intelligent initialisées');

  return router;
};

module.exports = initParcoursIntelligentRoutes;