// routes/userRoutes.js - VERSION COMPLÈTE

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');

module.exports = (models, authMiddleware) => {
  const UserController = require('../controllers/UserController');
  const userController = new UserController(models);

  // Validation pour l'inscription
  const registerValidation = [
    body('nom').trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('prenom').trim().isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères'),
    body('accepte_conditions').equals('true').withMessage('Vous devez accepter les conditions d\'utilisation')
  ];

  // Validation pour la connexion
  const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // Authentification
  router.post('/register', 
    registerValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => userController.createUser(req, res)
  );

  router.post('/login', 
    loginValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => userController.loginUser(req, res)
  );

  router.post('/logout', (req, res) => userController.logoutUser(req, res));

  // Récupération de mot de passe
  router.post('/password/forgot', (req, res) => userController.requestPasswordReset(req, res));
  router.post('/password/reset', (req, res) => userController.resetPassword(req, res));

  // Vérification email
  router.get('/verify-email/:token', (req, res) => userController.verifyEmail(req, res));

  // Types utilisateurs
router.get('/types-utilisateurs', (req, res) => userController.getTypesUtilisateurs(req, res));

  // ========================================================================
  // ROUTES PROTÉGÉES (utilisateur authentifié)
  // ========================================================================

  if (authMiddleware && authMiddleware.authenticate) {
    // Profil utilisateur
    router.get('/profile', 
      authMiddleware.authenticate, 
      (req, res) => userController.getProfile(req, res)
    );

    router.put('/profile', 
      authMiddleware.authenticate, 
      (req, res) => userController.updateProfile(req, res)
    );

    router.patch('/profile/photo', 
      authMiddleware.authenticate, 
      (req, res) => userController.updateProfilePhoto(req, res)
    );

    router.delete('/profile/photo', 
      authMiddleware.authenticate, 
      (req, res) => userController.removeProfilePhoto(req, res)
    );

    // Paramètres utilisateur
    router.put('/preferences', 
      authMiddleware.authenticate, 
      (req, res) => userController.updatePreferences(req, res)
    );

    router.put('/privacy', 
      authMiddleware.authenticate, 
      (req, res) => userController.updatePrivacy(req, res)
    );

    // Sécurité
    router.patch('/change-password', 
      authMiddleware.authenticate,
      [
        body('current_password').notEmpty().withMessage('Mot de passe actuel requis'),
        body('new_password').isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères'),
        body('confirm_password').custom((value, { req }) => {
          if (value !== req.body.new_password) {
            throw new Error('Les mots de passe ne correspondent pas');
          }
          return true;
        })
      ],
      validationMiddleware.handleValidationErrors,
      (req, res) => userController.changePassword(req, res)
    );

    // Vérifications
    router.post('/send-verification-email', 
      authMiddleware.authenticate, 
      (req, res) => userController.sendVerificationEmail(req, res)
    );

    // Validation professionnelle
    router.post('/professional/submit', 
      authMiddleware.authenticate, 
      (req, res) => userController.submitProfessionalValidation(req, res)
    );

    router.get('/professional/status', 
      authMiddleware.authenticate, 
      (req, res) => userController.getValidationStatus(req, res)
    );

    // Statistiques utilisateur
    router.get('/statistics', 
      authMiddleware.authenticate, 
      (req, res) => userController.getUserStatistics(req, res)
    );

    // ========================================================================
    // ROUTES ADMIN
    // ========================================================================

    if (authMiddleware.requireAdmin) {
      // Gestion des utilisateurs
      router.get('/admin/users',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validatePagination,
        (req, res) => userController.getAllUsers(req, res)
      );

      router.get('/admin/users/:id',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validateId('id'),
        (req, res) => userController.getUserById(req, res)
      );

      // Validation des professionnels
      router.get('/admin/professionals/pending',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validatePagination,
        (req, res) => userController.getPendingProfessionals(req, res)
      );

      router.patch('/admin/users/:id/validate',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validateId('id'),
        [
          body('valide').isBoolean().withMessage('Le champ valide doit être un booléen'),
          body('raison').optional().isLength({ max: 500 }).withMessage('La raison ne peut pas dépasser 500 caractères')
        ],
        validationMiddleware.handleValidationErrors,
        (req, res) => userController.validateProfessional(req, res)
      );

      // Gestion des statuts et rôles
      router.patch('/admin/users/:id/status',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validateId('id'),
        [
          body('statut').isIn(['actif', 'inactif', 'suspendu', 'banni']).withMessage('Statut invalide')
        ],
        validationMiddleware.handleValidationErrors,
        (req, res) => userController.updateUserStatus(req, res)
      );

      router.post('/admin/users/:id/roles',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validateId('id'),
        [
          body('role').isIn(['Admin', 'Professionnel', 'Visiteur']).withMessage('Rôle invalide')
        ],
        validationMiddleware.handleValidationErrors,
        (req, res) => userController.assignRole(req, res)
      );

      router.delete('/admin/users/:id/roles',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        validationMiddleware.validateId('id'),
        [
          body('role').isIn(['Admin', 'Professionnel', 'Visiteur']).withMessage('Rôle invalide')
        ],
        validationMiddleware.handleValidationErrors,
        (req, res) => userController.removeRole(req, res)
      );

      // Statistiques globales
      router.get('/admin/statistics',
        authMiddleware.authenticate,
        authMiddleware.requireAdmin,
        (req, res) => userController.getGlobalStatistics(req, res)
      );
    }
  }

  // ========================================================================
  // VÉRIFICATION ET MESSAGE DE SUCCÈS
  // ========================================================================

  let routeCount = 0;
  let protectedRouteCount = 0;
  let adminRouteCount = 0;

  // Compter les routes ajoutées
  router.stack.forEach(layer => {
    routeCount++;
    if (layer.route && layer.route.path.includes('admin')) {
      adminRouteCount++;
    } else if (layer.route && (layer.route.path.includes('profile') || layer.route.path.includes('preferences'))) {
      protectedRouteCount++;
    }
  });

  // Déterminer le mode selon les middlewares disponibles
  let mode = 'basique';
  if (authMiddleware && authMiddleware.authenticate) {
    if (authMiddleware.requireAdmin) {
      mode = 'complet';
    } else {
      mode = 'standard';
    }
  }

  console.log(`✅ Routes utilisateur initialisées (${mode})`);
  console.log(`   📊 ${routeCount} routes au total`);
  console.log(`   🔒 ${protectedRouteCount} routes protégées`);
  console.log(`   👨‍💼 ${adminRouteCount} routes admin`);

  return router;
};