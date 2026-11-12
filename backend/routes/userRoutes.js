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
const { validateLanguage } = require('../middlewares/language');
const { strictLimiter, endpointLimiters, accountRateLimiter, suiviLimiter } = require('../middlewares/rateLimitMiddleware');
const { handleValidationErrors, validateStringLengths, validateId } = require('../middlewares/validationMiddleware');
const { verifierTurnstile } = require('../middlewares/turnstile');
const { msg } = require('../utils/messageValidation');

const initUserRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, optionalAuth, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES (authController)
  // ============================================================================

  // Limites d'inscription et de connexion : posées dans app.js (ici, elles comptaient chaque essai deux fois)
  router.post('/register',
    validateStringLengths,
    [
      body('email').isString().withMessage(msg('auth.invalidEmail')).bail().isEmail().withMessage(msg('auth.invalidEmail')),
      body('password').isLength({ min: 12 }).withMessage(msg('validation.motDePasse12'))
        .matches(/[A-Z]/).withMessage(msg('validation.motDePasseMajuscule'))
        .matches(/[a-z]/).withMessage(msg('validation.motDePasseMinuscule'))
        .matches(/[0-9]/).withMessage(msg('auth.passwordNeedDigit'))
        .matches(/[^A-Za-z0-9]/).withMessage(msg('validation.motDePasseSpecial')),
      body('password_confirmation').custom((val, { req }) => {
        if (val !== req.body.password) throw new Error('Les mots de passe ne correspondent pas');
        return true;
      }),
      body('nom').notEmpty().withMessage(msg('validation.nomRequis')).isLength({ min: 2 }).withMessage(msg('validation.nom2')),
      body('prenom').notEmpty().withMessage(msg('validation.prenomRequis')).isLength({ min: 2 }).withMessage(msg('validation.prenom2')),
      body('sexe').optional().isIn(['M', 'F']).withMessage(msg('validation.genreInvalide')),
      body('date_naissance').optional().isISO8601().withMessage(msg('validation.naissanceInvalide')),
      body('wilaya_residence').optional({ nullable: true }).isInt({ min: 1 }).withMessage(msg('validation.invalidWilaya')),
      body('telephone').optional().matches(/^\+\d{7,15}$/).withMessage(msg('validation.telephoneInvalide')),
      body('portfolio').optional().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage(msg('validation.portfolioInvalide')),
      body('accepte_conditions').equals('true').withMessage(msg('validation.conditionsRequises')),
    ],
    handleValidationErrors,
    // Anti-robots après la validation : un formulaire mal rempli ne consomme pas la vérification
    verifierTurnstile('inscription'),
    asyncHandler((req, res) => authController.register(req, res)));

  router.post('/login',
    accountRateLimiter.checkAccountLock,
    [
      body('email').isString().withMessage(msg('auth.invalidEmail')).bail().isEmail().withMessage(msg('auth.invalidEmail')),
      body('password').notEmpty().withMessage(msg('validation.passwordRequired')),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => authController.login(req, res)));

  router.post('/refresh-token',
    endpointLimiters.refreshToken,
    asyncHandler((req, res) => authController.refreshToken(req, res)));

  // Réservé aux utilisateurs connectés : en public, elle permettait de tester si un email a un compte
  router.post('/check-email', authenticate, strictLimiter, asyncHandler((req, res) => authController.checkEmail(req, res)));
  router.post('/verify-email/:token', asyncHandler((req, res) => authController.verifyEmail(req, res)));
  router.get('/types', asyncHandler((req, res) => authController.getTypes(req, res)));
  router.get('/professionals', asyncHandler((req, res) => userProfileController.getProfessionals(req, res)));
  // Professionnels proches (suggestions de contributeurs, fiche lieu) — profils publics
  // Suivre un professionnel : ses abonnés sont prévenus de ses nouvelles publications
  const suivis = require('../services/suivisProfessionnels');
  const repondreErreur = (res, req, err) => res.status(err.statusCode || 500).json({
    success: false, error: err.statusCode ? err.message : req.t('common.serverError')
  });
  router.get('/mes-suivis', authenticate, asyncHandler(async (req, res) => {
    res.json({ success: true, data: await suivis.mesSuivis(models, req.user.id_user) });
  }));
  router.get('/professionals/:id/suivi', optionalAuth, validateId(), asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await suivis.etat(models, Number(req.params.id), req.user?.id_user) });
  }));
  router.post('/professionals/:id/suivi', authenticate, validateId(), suiviLimiter, asyncHandler(async (req, res) => {
    try {
      await suivis.suivre(models, req.user.id_user, Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      repondreErreur(res, req, err);
    }
  }));
  router.delete('/professionals/:id/suivi', authenticate, validateId(), suiviLimiter, asyncHandler(async (req, res) => {
    await suivis.nePlusSuivre(models, req.user.id_user, Number(req.params.id));
    res.json({ success: true });
  }));

  router.get('/professionals/:id/qrcode', validateId(), asyncHandler((req, res) => userProfileController.getPortfolioQRCode(req, res)));
  router.get('/professionals/:id/portfolio', optionalAuth, validateId(), asyncHandler((req, res) => userProfileController.getPortfolio(req, res)));
  router.get('/professionals/nearby', optionalAuth, asyncHandler((req, res) => userProfileController.getNearbyProfessionals(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  // Sans jeton d'accès valide aussi : la déconnexion doit couper la session et effacer les cookies
  router.post('/logout', optionalAuth, asyncHandler((req, res) => authController.logout(req, res)));
  router.post('/refresh-token/deconnexion', optionalAuth, asyncHandler((req, res) => authController.logout(req, res)));

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
      body('ancien_mot_de_passe').notEmpty().withMessage(msg('validation.ancienMotDePasseRequis')),
      body('nouveau_mot_de_passe').isLength({ min: 12 }).withMessage(msg('validation.nouveauMotDePasse12')),
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
  // Désinscription newsletter : lien signé dans chaque email (GET) et bouton « Se désabonner » des messageries (POST, RFC 8058)
  router.get('/newsletter/unsubscribe', asyncHandler((req, res) => gdprController.unsubscribeNewsletter(req, res)));
  router.post('/newsletter/unsubscribe', asyncHandler((req, res) => gdprController.unsubscribeNewsletter(req, res)));
  router.get('/annonces/unsubscribe', asyncHandler((req, res) => gdprController.unsubscribeAnnonces(req, res)));
  router.post('/annonces/unsubscribe', asyncHandler((req, res) => gdprController.unsubscribeAnnonces(req, res)));
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
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), validateId(), validateLanguage, asyncHandler((req, res) => userAdminController.updateUserTranslation(req, res)));

  return router;
};

module.exports = initUserRoutes;
