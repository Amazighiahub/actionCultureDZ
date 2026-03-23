// routes/programmeRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const ProgrammeController = require('../controllers/programmeController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initProgrammeRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const programmeController = ProgrammeController;

  // ========================================================================
  // VALIDATIONS - ⚡ Acceptant string OU JSON
  // ========================================================================

  const programmeValidation = [
    body('titre')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 3 && value.trim().length <= 255;
        }
        if (typeof value === 'object') {
          return Object.values(value).some(v => v && v.length >= 3);
        }
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidName')),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage((value, { req }) => req.t('validation.descriptionTooLong')),
    body('id_lieu').optional().isInt().withMessage((value, { req }) => req.t('validation.invalidId')),
    body('lieu_specifique').optional().isLength({ max: 255 }),
    body('heure_debut').optional().isISO8601().withMessage((value, { req }) => req.t('validation.invalidStartDate')),
    body('heure_fin')
      .optional()
      .isISO8601()
      .withMessage((value, { req }) => req.t('validation.invalidEndDate'))
      .custom((value, { req }) => {
        if (value && req.body.heure_debut && new Date(value) <= new Date(req.body.heure_debut)) {
          throw new Error(req.t ? req.t('validation.endAfterStart') : 'End time must be after start time');
        }
        return true;
      }),
    body('type_activite')
      .optional()
      .isIn(['conference', 'atelier', 'spectacle', 'exposition', 'visite', 'degustation', 'projection', 'concert', 'lecture', 'debat', 'formation', 'ceremonie', 'autre']),
    body('duree_estimee').optional().isInt({ min: 1 }),
    body('nb_participants_max').optional().isInt({ min: 1 }),
    body('materiel_requis').optional().isLength({ max: 1000 }),
    body('notes_organisateur').optional().isLength({ max: 2000 }),
    body('intervenants').optional().isArray()
  ];

  const reorderValidation = [
    body('programmes').isArray().withMessage((value, { req }) => req.t('validation.invalidData')),
    body('programmes.*.id').isInt().withMessage((value, { req }) => req.t('validation.invalidId')),
    body('programmes.*.ordre').isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidOrder'))
  ];

  const statutValidation = [
    body('statut')
      .isIn(['planifie', 'en_cours', 'termine', 'annule', 'reporte'])
      .withMessage((value, { req }) => req.t('validation.invalidStatus'))
  ];

  // ========================================================================
  // ROUTES PUBLIQUES - Consultation
  // ========================================================================

  // Export du programme d'un événement
  router.get('/evenement/:evenementId/export', 
    param('evenementId').isInt().withMessage((value, { req }) => req.t('validation.invalidEventId')),
    query('format').optional().isIn(['json', 'csv', 'pdf']),
    validationMiddleware.handleValidationErrors,
    programmeController.exportProgramme.bind(programmeController)
  );

  // Liste des programmes d'un événement
  router.get('/evenement/:evenementId', 
    param('evenementId').isInt().withMessage((value, { req }) => req.t('validation.invalidEventId')),
    query('date').optional().isISO8601(),
    query('type_activite').optional().isString(),
    validationMiddleware.handleValidationErrors,
    programmeController.getProgrammesByEvenement.bind(programmeController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'un programme
  router.get('/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    programmeController.getProgrammeTranslations.bind(programmeController)
  );

  // Mettre à jour une traduction spécifique
  router.patch('/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('titre').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 })
    ],
    validationMiddleware.handleValidationErrors,
    programmeController.updateProgrammeTranslation.bind(programmeController)
  );

  // ========================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ========================================================================

  // Détails d'un programme
  router.get('/:id', 
    validationMiddleware.validateId('id'),
    programmeController.getProgrammeById.bind(programmeController)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES - Gestion
  // ========================================================================

  // Réorganiser l'ordre des programmes
  router.put('/evenement/:evenementId/reorder',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    authMiddleware.requireValidatedProfessional,
    param('evenementId').isInt().withMessage((value, { req }) => req.t('validation.invalidEventId')),
    reorderValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.reorderProgrammes.bind(programmeController)
  );

  // Créer un programme
  router.post('/evenement/:evenementId',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    authMiddleware.requireValidatedProfessional,
    param('evenementId').isInt().withMessage((value, { req }) => req.t('validation.invalidEventId')),
    programmeValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.createProgramme.bind(programmeController)
  );

  // Dupliquer un programme
  router.post('/:id/duplicate',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    validationMiddleware.handleValidationErrors,
    programmeController.duplicateProgramme.bind(programmeController)
  );

  // Mettre à jour le statut
  router.patch('/:id/statut',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    statutValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.updateStatut.bind(programmeController)
  );

  // Mettre à jour un programme
  router.put('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    programmeValidation,
    validationMiddleware.handleValidationErrors,
    programmeController.updateProgramme.bind(programmeController)
  );

  // Supprimer un programme
  router.delete('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    programmeController.deleteProgramme.bind(programmeController)
  );

  // Mettre à jour le statut d'un intervenant (confirmer/décliner)
  router.patch('/:id/intervenant/:userId/statut',
    authMiddleware.authenticate,
    authMiddleware.requireVerifiedEmail,
    validationMiddleware.validateId('id'),
    validationMiddleware.validateId('userId'),
    [body('statut').isIn(['en_attente', 'confirme', 'decline', 'annule']).withMessage((value, { req }) => req.t('validation.invalidStatus'))],
    validationMiddleware.handleValidationErrors,
    programmeController.updateIntervenantStatus.bind(programmeController)
  );


  return router;
};

module.exports = initProgrammeRoutes;
