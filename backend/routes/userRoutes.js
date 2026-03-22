/**
 * Routes pour les utilisateurs
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const asyncHandler = require('../utils/asyncHandler');
const { strictLimiter, endpointLimiters, accountRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { handleValidationErrors, validateStringLengths, validateId } = require('../middlewares/validationMiddleware');

const initUserRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.post('/register',
    endpointLimiters.register,
    validateStringLengths,
    [
      body('email').isEmail().withMessage('Email invalide'),
      body('password').isLength({ min: 12 }).withMessage('Mot de passe minimum 12 caractères'),
      body('password_confirmation').custom((val, { req }) => {
        if (val !== req.body.password) throw new Error('Les mots de passe ne correspondent pas');
        return true;
      }),
      body('nom').notEmpty().withMessage('Le nom est requis'),
      body('prenom').notEmpty().withMessage('Le prénom est requis'),
      body('sexe').optional().isIn(['M', 'F']).withMessage('Le sexe doit être M ou F'),
      body('date_naissance').optional().isISO8601().withMessage('Date de naissance invalide'),
      body('portfolio').optional().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('URL de portfolio invalide'),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => userController.register(req, res)));
  router.post('/login',
    endpointLimiters.login,
    accountRateLimiter.checkAccountLock,
    [
      body('email').isEmail().withMessage('Email invalide'),
      body('password').notEmpty().withMessage('Mot de passe requis'),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => userController.login(req, res)));
  router.post('/refresh-token', asyncHandler((req, res) => userController.refreshToken(req, res)));
  router.post('/check-email', strictLimiter, asyncHandler((req, res) => userController.checkEmail(req, res)));
  router.post('/verify-email/:token', asyncHandler((req, res) => userController.verifyEmail(req, res)));
  router.get('/types', asyncHandler((req, res) => userController.getTypes(req, res)));
  router.get('/professionals', asyncHandler((req, res) => userController.getProfessionals(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.post('/logout', authenticate, asyncHandler((req, res) => userController.logout(req, res)));
  router.get('/profile', authenticate, asyncHandler((req, res) => userController.getProfile(req, res)));
  router.put('/profile', authenticate,
    validateStringLengths,
    asyncHandler((req, res) => userController.updateProfile(req, res)));
  router.patch('/profile/photo', authenticate, asyncHandler((req, res) => userController.updateProfilePhoto(req, res)));
  router.delete('/profile/photo', authenticate, asyncHandler((req, res) => userController.removeProfilePhoto(req, res)));
  router.post('/change-password', authenticate,
    strictLimiter,
    [
      body('ancien_mot_de_passe').notEmpty().withMessage('Ancien mot de passe requis'),
      body('nouveau_mot_de_passe').isLength({ min: 12 }).withMessage('Nouveau mot de passe minimum 12 caractères'),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => userController.changePassword(req, res)));
  router.get('/search', authenticate, asyncHandler((req, res) => userController.search(req, res)));

  // Demande statut professionnel
  router.post('/professional/submit', authenticate, asyncHandler((req, res) => userController.submitProfessional(req, res)));
  router.get('/professional/status', authenticate, asyncHandler((req, res) => userController.getProfessionalStatus(req, res)));

  // Préférences et confidentialité
  router.put('/preferences', authenticate, asyncHandler((req, res) => userController.updatePreferences(req, res)));
  router.put('/privacy', authenticate, asyncHandler((req, res) => userController.updatePrivacy(req, res)));

  // RGPD — Droit à l'effacement et portabilité des données
  router.delete('/profile', authenticate, strictLimiter, asyncHandler((req, res) => userController.deleteMyAccount(req, res)));
  router.get('/profile/export', authenticate, asyncHandler((req, res) => userController.exportMyData(req, res)));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => userController.list(req, res)));
  router.get('/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => userController.getStats(req, res)));
  router.get('/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => userController.getPending(req, res)));
  router.get('/:id', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => userController.getById(req, res)));
  router.put('/:id', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userController.update(req, res)));
  router.delete('/:id', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userController.delete(req, res)));

  // Validation/Modération
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => userController.validate(req, res)));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => userController.reject(req, res)));
  router.post('/:id/suspend', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userController.suspend(req, res)));
  router.post('/:id/reactivate', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userController.reactivate(req, res)));

  // Traductions (admin i18n)
  router.get('/:id/translations', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userController.getUserTranslations(req, res)));
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userController.updateUserTranslation(req, res)));

  return router;
};

module.exports = initUserRoutes;
