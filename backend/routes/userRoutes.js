/**
 * Routes pour les utilisateurs
 *
 * Controllers eclates par domaine (ex-userController) :
 *   - authController         : register, login, logout, refresh, verify-email,
 *                              check-email, types
 *   - userProfileController  : profile, preferences, privacy, photo,
 *                              change-password, professional submit/status,
 *                              listing public des pros
 *   - userAdminController    : CRUD admin, search, pending, stats,
 *                              moderation (validate/reject/suspend/reactivate),
 *                              traductions i18n
 *   - gdprController         : deleteMyAccount, exportMyData
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const userProfileController = require('../controllers/userProfileController');
const userAdminController = require('../controllers/userAdminController');
const gdprController = require('../controllers/gdprController');
const asyncHandler = require('../utils/asyncHandler');
const { strictLimiter, endpointLimiters, accountRateLimiter } = require('../middlewares/rateLimitMiddleware');
const { handleValidationErrors, validateStringLengths, validateId } = require('../middlewares/validationMiddleware');

const initUserRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES (authController)
  // ============================================================================

  router.post('/register',
    endpointLimiters.register,
    validateStringLengths,
    [
      body('email').isEmail().withMessage('Email invalide'),
      body('password').isLength({ min: 12 }).withMessage('Mot de passe minimum 12 caractères')
        .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
        .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
        .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
      body('password_confirmation').custom((val, { req }) => {
        if (val !== req.body.password) throw new Error('Les mots de passe ne correspondent pas');
        return true;
      }),
      body('nom').notEmpty().withMessage('Le nom est requis').isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
      body('prenom').notEmpty().withMessage('Le prénom est requis').isLength({ min: 2 }).withMessage('Le prénom doit contenir au moins 2 caractères'),
      body('sexe').optional().isIn(['M', 'F']).withMessage('Le sexe doit être M ou F'),
      body('date_naissance').optional().isISO8601().withMessage('Date de naissance invalide'),
      body('wilaya_residence').optional().isInt({ min: 1 }).withMessage('Wilaya invalide'),
      body('telephone').optional().matches(/^(0|\+213)[567]\d{8}$/).withMessage('Numéro de téléphone invalide'),
      body('portfolio').optional().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('URL de portfolio invalide'),
      body('accepte_conditions').equals('true').withMessage('Vous devez accepter les conditions'),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => authController.register(req, res)));

  router.post('/login',
    endpointLimiters.login,
    accountRateLimiter.checkAccountLock,
    [
      body('email').isEmail().withMessage('Email invalide'),
      body('password').notEmpty().withMessage('Mot de passe requis'),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => authController.login(req, res)));

  router.post('/refresh-token',
    endpointLimiters.refreshToken,
    asyncHandler((req, res) => authController.refreshToken(req, res)));

  router.post('/check-email', strictLimiter, asyncHandler((req, res) => authController.checkEmail(req, res)));
  router.post('/verify-email/:token', asyncHandler((req, res) => authController.verifyEmail(req, res)));
  router.get('/types', asyncHandler((req, res) => authController.getTypes(req, res)));
  router.get('/professionals', asyncHandler((req, res) => userProfileController.getProfessionals(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.post('/logout', authenticate, asyncHandler((req, res) => authController.logout(req, res)));

  // Profil (userProfileController)
  router.get('/profile', authenticate, asyncHandler((req, res) => userProfileController.getProfile(req, res)));
  router.put('/profile', authenticate,
    validateStringLengths,
    asyncHandler((req, res) => userProfileController.updateProfile(req, res)));
  router.patch('/profile/photo', authenticate, asyncHandler((req, res) => userProfileController.updateProfilePhoto(req, res)));
  router.delete('/profile/photo', authenticate, asyncHandler((req, res) => userProfileController.removeProfilePhoto(req, res)));
  router.post('/change-password', authenticate,
    strictLimiter,
    [
      body('ancien_mot_de_passe').notEmpty().withMessage('Ancien mot de passe requis'),
      body('nouveau_mot_de_passe').isLength({ min: 12 }).withMessage('Nouveau mot de passe minimum 12 caractères'),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => userProfileController.changePassword(req, res)));

  // Demande statut professionnel
  router.post('/professional/submit', authenticate, asyncHandler((req, res) => userProfileController.submitProfessional(req, res)));
  router.get('/professional/status', authenticate, asyncHandler((req, res) => userProfileController.getProfessionalStatus(req, res)));

  // Préférences et confidentialité
  router.put('/preferences', authenticate, asyncHandler((req, res) => userProfileController.updatePreferences(req, res)));
  router.put('/privacy', authenticate, asyncHandler((req, res) => userProfileController.updatePrivacy(req, res)));

  // RGPD (gdprController)
  router.delete('/profile', authenticate, strictLimiter, asyncHandler((req, res) => gdprController.deleteMyAccount(req, res)));
  router.get('/profile/export', authenticate, asyncHandler((req, res) => gdprController.exportMyData(req, res)));

  // Recherche utilisateurs (reservee aux connectes, userAdminController gere
  // le filtrage d'affichage si besoin)
  router.get('/search', authenticate, asyncHandler((req, res) => userAdminController.search(req, res)));

  // ============================================================================
  // ROUTES ADMIN (userAdminController)
  // ============================================================================

  router.get('/', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => userAdminController.list(req, res)));
  router.get('/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => userAdminController.getStats(req, res)));
  router.get('/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => userAdminController.getPending(req, res)));
  router.get('/:id', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => userAdminController.getById(req, res)));
  router.put('/:id', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userAdminController.update(req, res)));
  router.delete('/:id', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userAdminController.delete(req, res)));

  // Validation/Modération
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => userAdminController.validate(req, res)));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => userAdminController.reject(req, res)));
  router.post('/:id/suspend', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userAdminController.suspend(req, res)));
  router.post('/:id/reactivate', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userAdminController.reactivate(req, res)));

  // Traductions (admin i18n)
  router.get('/:id/translations', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userAdminController.getUserTranslations(req, res)));
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => userAdminController.updateUserTranslation(req, res)));

  return router;
};

module.exports = initUserRoutes;
