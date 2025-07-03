// routes/programmeRoutes.js - Routes complètes pour la gestion des programmes
const express = require('express');
const router = express.Router();
const ProgrammeController = require('../controllers/ProgrammeController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

const initProgrammeRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const programmeController = new ProgrammeController(models);

  // ========================================================================
  // VALIDATIONS
  // ========================================================================

  const programmeValidation = [
    body('titre')
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Le titre doit contenir entre 3 et 255 caractères'),
    body('description')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description trop longue'),
    body('id_lieu')
      .optional()
      .isInt()
      .withMessage('Lieu invalide'),
    body('lieu_specifique')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Lieu spécifique trop long'),
    body('heure_debut')
      .optional()
      .isISO8601()
      .withMessage('Heure de début invalide'),
    body('heure_fin')
      .optional()
      .isISO8601()
      .withMessage('Heure de fin invalide')
      .custom((value, { req }) => {
        if (value && req.body.heure_debut && new Date(value) <= new Date(req.body.heure_debut)) {
          throw new Error('L\'heure de fin doit être après l\'heure de début');
        }
        return true;
      }),
    body('type_activite')
      .optional()
      .isIn(['conference', 'atelier', 'spectacle', 'exposition', 'visite', 'degustation', 'projection', 'concert', 'lecture', 'debat', 'formation', 'ceremonie', 'autre'])
      .withMessage('Type d\'activité invalide'),
    body('duree_estimee')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Durée estimée invalide (en minutes)'),
    body('nb_participants_max')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Nombre de participants invalide'),
    body('materiel_requis')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description du matériel trop longue'),
    body('notes_organisateur')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Notes trop longues'),
    body('intervenants')
      .optional()
      .isArray()
      .withMessage('Liste d\'intervenants invalide'),
    body('intervenants.*.id_user')
      .optional()
      .isInt()
      .withMessage('ID intervenant invalide')
  ];

  const reorderValidation = [
    body('programmes')
      .isArray()
      .withMessage('Liste des programmes requise'),
    body('programmes.*.id')
      .isInt()
      .withMessage('ID programme invalide'),
    body('programmes.*.ordre')
      .isInt({ min: 1 })
      .withMessage('Ordre invalide')
  ];

  const duplicateValidation = [
    body('heure_debut')
      .optional()
      .isISO8601()
      .withMessage('Heure de début invalide'),
    body('heure_fin')
      .optional()
      .isISO8601()
      .withMessage('Heure de fin invalide')
      .custom((value, { req }) => {
        if (value && req.body.heure_debut && new Date(value) <= new Date(req.body.heure_debut)) {
          throw new Error('L\'heure de fin doit être après l\'heure de début');
        }
        return true;
      })
  ];

  const statutValidation = [
    body('statut')
      .isIn(['planifie', 'en_cours', 'termine', 'annule', 'reporte'])
      .withMessage('Statut invalide')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES - Consultation
  // ========================================================================
  // IMPORTANT: L'ordre est crucial - routes spécifiques AVANT routes génériques

  // 1. Export du programme d'un événement (route la plus spécifique)
  router.get('/evenement/:evenementId/export', 
    param('evenementId').isInt().withMessage('ID événement invalide'),
    query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format invalide'),
    validationMiddleware.handleValidationErrors,
    programmeController.exportProgramme.bind(programmeController)
  );

  // 2. Liste des programmes d'un événement
  router.get('/evenement/:evenementId', 
    param('evenementId').isInt().withMessage('ID événement invalide'),
    query('date').optional().isISO8601().withMessage('Format de date invalide'),
    query('type_activite').optional().isIn(['conference', 'atelier', 'spectacle', 'exposition', 'visite', 'degustation', 'projection', 'concert', 'lecture', 'debat', 'formation', 'ceremonie', 'autre']),
    validationMiddleware.handleValidationErrors,
    programmeController.getProgrammesByEvenement.bind(programmeController)
  );

  // 3. Détails d'un programme (route générique - EN DERNIER pour les GET)
  router.get('/:id', 
    validationMiddleware.validateId('id'),
    programmeController.getProgrammeById.bind(programmeController)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES - Gestion (créateur de l'événement)
  // ========================================================================

  // 4. Réorganiser l'ordre des programmes (route spécifique AVANT les routes avec :id)
  router.put('/evenement/:evenementId/reorder', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    param('evenementId').isInt().withMessage('ID événement invalide'),
    reorderValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.reorderProgrammes.bind(programmeController)
  );

  // 5. Créer un programme
  router.post('/evenement/:evenementId', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    param('evenementId').isInt().withMessage('ID événement invalide'),
    programmeValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.createProgramme.bind(programmeController)
  );

  // 6. Dupliquer un programme (route spécifique avec action)
  router.post('/:id/duplicate', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    duplicateValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.duplicateProgramme.bind(programmeController)
  );

  // 7. Mettre à jour le statut d'un programme (route spécifique avec action)
  router.patch('/:id/statut', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    statutValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.updateStatut.bind(programmeController)
  );

  // 8. Mettre à jour un programme (route générique PUT)
  router.put('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    programmeValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.updateProgramme.bind(programmeController)
  );

  // 9. Supprimer un programme (route générique DELETE)
  router.delete('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    programmeController.deleteProgramme.bind(programmeController)
  );

  // ========================================================================
  // LOGS DE CONFIRMATION
  // ========================================================================
  
  console.log('✅ Routes programmes initialisées avec succès');
  console.log('  📍 Ordre des routes respecté : spécifiques → génériques');
  console.log('  📍 Routes publiques:');
  console.log('     - GET /evenement/:evenementId/export');
  console.log('     - GET /evenement/:evenementId');
  console.log('     - GET /:id');
  console.log('  📍 Routes protégées:');
  console.log('     - PUT /evenement/:evenementId/reorder');
  console.log('     - POST /evenement/:evenementId');
  console.log('     - POST /:id/duplicate');
  console.log('     - PATCH /:id/statut');
  console.log('     - PUT /:id');
  console.log('     - DELETE /:id');

  return router;
};

module.exports = initProgrammeRoutes;