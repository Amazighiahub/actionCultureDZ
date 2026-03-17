// routes/emailVerificationRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');

module.exports = (models, authMiddleware) => {
  const EmailVerificationController = require('../controllers/emailVerificationController');
  const controller = new EmailVerificationController();

  // ========================================================================
  // VALIDATION RULES
  // ========================================================================
  
  const emailValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage((value, { req }) => req.t('validation.invalidEmail'))
  ];

  const passwordResetValidation = [
    body('token')
      .notEmpty()
      .withMessage((value, { req }) => req.t('validation.tokenRequired')),
    body('newPassword')
      .isLength({ min: 12 })
      .withMessage((value, { req }) => req.t('validation.passwordTooShort'))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
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
      .isEmail()
      .normalizeEmail()
      .withMessage((value, { req }) => req.t('validation.invalidEmail')),
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
    rateLimitMiddleware.general[0],
    (req, res) => controller.verifyEmail(req, res)
  );

  // Demander un reset de mot de passe
  router.post('/request-password-reset',
    emailValidation,
    validationMiddleware.handleValidationErrors,
    ...rateLimitMiddleware.auth,
    (req, res) => controller.requestPasswordReset(req, res)
  );

  // Reset le mot de passe avec token
  router.post('/reset-password',
    passwordResetValidation,
    validationMiddleware.handleValidationErrors,
    ...rateLimitMiddleware.auth,
    (req, res) => controller.resetPassword(req, res)
  );

  // Confirmer un changement d'email
  router.get('/confirm-email-change/:token',
    tokenValidation,
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.general[0],
    (req, res) => controller.confirmEmailChange(req, res)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES (AUTHENTIFICATION REQUISE)
  // ========================================================================

  // Renvoyer l'email de vérification
  router.post('/resend',
    authMiddleware.authenticate,
    ...rateLimitMiddleware.auth,
    (req, res) => controller.sendVerificationEmail(req, res)
  );

  // Demander un changement d'email
  router.post('/request-email-change',
    authMiddleware.authenticate,
    emailChangeValidation,
    validationMiddleware.handleValidationErrors,
    ...rateLimitMiddleware.sensitiveActions,
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
