// routes/emailVerificationRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');

module.exports = (models, authMiddleware) => {
  const EmailVerificationController = require('../controllers/EmailVerificationController');
  const controller = new EmailVerificationController(models);

  // ========================================================================
  // VALIDATION RULES
  // ========================================================================
  
  const emailValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide')
  ];

  const passwordResetValidation = [
    body('token')
      .notEmpty()
      .withMessage('Token requis'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
  ];

  const tokenValidation = [
    param('token')
      .notEmpty()
      .isLength({ min: 32 })
      .withMessage('Token invalide')
  ];

  const emailChangeValidation = [
    body('newEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide'),
    body('password')
      .notEmpty()
      .withMessage('Mot de passe requis pour confirmer')
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
