// routes/emailVerificationRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const { FORMAT_JETON } = require('../models/misc/emailVerification');

module.exports = (models, authMiddleware) => {
  const controller = require('../controllers/emailVerificationController');

  // ========================================================================
  // VALIDATION RULES
  // ========================================================================
  
  const emailValidation = [
    // Pas de normalizeEmail : il retire les points des adresses Gmail, le compte n'était plus trouvé
    body('email')
      .isString()
      .withMessage((value, { req }) => req.t('validation.invalidEmail'))
      .bail()
      .trim()
      .isEmail()
      .withMessage((value, { req }) => req.t('validation.invalidEmail'))
      .toLowerCase()
  ];

  const passwordResetValidation = [
    // Un texte au format exact : un tableau ou un nombre serait comparé autrement par MySQL
    // et pourrait correspondre à un jeton que la personne ne connaît pas
    body('token')
      .custom((valeur) => FORMAT_JETON.test(typeof valeur === 'string' ? valeur : ''))
      .withMessage((value, { req }) => req.t('validation.invalidToken')),
    body('newPassword')
      .isLength({ min: 12 })
      .withMessage((value, { req }) => req.t('validation.passwordTooShort'))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
      .withMessage((value, { req }) => req.t('validation.passwordRequirements'))
  ];

  const tokenValidation = [
    param('token')
      .notEmpty()
      .isLength({ min: 32 })
      .withMessage((value, { req }) => req.t('validation.invalidToken'))
  ];

  const emailChangeValidation = [
    body('newEmail')
      .trim()
      .isEmail()
      .withMessage((value, { req }) => req.t('validation.invalidEmail'))
      .toLowerCase(),
    body('password')
      .notEmpty()
      .withMessage((value, { req }) => req.t('validation.passwordRequired'))
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // Vérifier un email avec token
  router.get('/verify/:token',
    tokenValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => controller.verifyEmail(req, res)
  );

  // Demander un reset de mot de passe (limite : app.js, endpointLimiters.forgotPassword — ici, elle
  // s'ajoutait aux limites de connexion et d'inscription, consommées sans rapport)
  router.post('/request-password-reset',
    emailValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => controller.requestPasswordReset(req, res)
  );

  // Reset le mot de passe avec token
  router.post('/reset-password',
    passwordResetValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => controller.resetPassword(req, res)
  );

  // Confirmer un changement d'email
  router.get('/confirm-email-change/:token',
    tokenValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => controller.confirmEmailChange(req, res)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES (AUTHENTIFICATION REQUISE)
  // ========================================================================

  // Renvoyer l'email de vérification
  router.post('/resend',
    authMiddleware.authenticate,
    rateLimitMiddleware.endpointLimiters.forgotPassword,
    (req, res) => controller.sendVerificationEmail(req, res)
  );

  // Demander un changement d'email
  router.post('/request-email-change',
    authMiddleware.authenticate,
    emailChangeValidation,
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.strictLimiter,
    (req, res) => controller.requestEmailChange(req, res)
  );

  // ========================================================================
  // ROUTES ADMIN
  // ========================================================================

  // Statistiques des vérifications
  router.get('/stats',
    authMiddleware.authenticate,
    authMiddleware.isAdmin,
    (req, res) => controller.getVerificationStats(req, res)
  );

  // Nettoyer les tokens expirés
  router.post('/cleanup',
    authMiddleware.authenticate,
    authMiddleware.isAdmin,
    (req, res) => controller.cleanupTokens(req, res)
  );

  return router;
};
