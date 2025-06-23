// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');
const auditMiddleware = require('../middlewares/auditMiddleware');

module.exports = (models, authMiddleware) => {
  const UserController = require('../controllers/UserController');
  const userController = new UserController(models);

  console.log('🔧 Initialisation des routes utilisateur...');

  // ========================================================================
  // VALIDATION RULES
  // ========================================================================

  const registerValidation = [
    body('nom')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('prenom')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
    body('type_user')
      .optional()
      .isIn(['visiteur', 'ecrivain', 'journaliste', 'scientifique', 'acteur', 
             'artiste', 'artisan', 'realisateur', 'musicien', 'photographe', 
             'danseur', 'sculpteur', 'autre'])
      .withMessage('Type d\'utilisateur invalide'),
    body('accepte_conditions')
      .custom(value => value === true || value === 'true')
      .withMessage('Vous devez accepter les conditions d\'utilisation')
  ];

  const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
  ];

  const updatePhotoValidation = [
    body('photo_url')
      .notEmpty()
      .withMessage('URL de la photo requise')
      .matches(/^\/uploads\/images\//)
      .withMessage('URL de photo invalide')
  ];

  const changePasswordValidation = [
    body('current_password').notEmpty().withMessage('Mot de passe actuel requis'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // ÉTAPE 1 : Inscription
  router.post('/register', 
    registerValidation,
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('user_register', { entityType: 'user' }),
    (req, res) => userController.createUser(req, res)
  );

  // Connexion
  router.post('/login', 
    loginValidation,
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('user_login', { entityType: 'user' }),
    (req, res) => userController.loginUser(req, res)
  );

  // Déconnexion
  router.post('/logout',
    authMiddleware.isAuthenticated, // Optionnel
    auditMiddleware.logAction('user_logout', { entityType: 'user' }),
    (req, res) => userController.logoutUser(req, res)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES
  // ========================================================================

  // Profil utilisateur
  router.get('/profile', 
    authMiddleware.authenticate,
    (req, res) => userController.getProfile(req, res)
  );

  router.put('/profile', 
    authMiddleware.authenticate,
    auditMiddleware.logAction('profile_update', { entityType: 'user' }),
    (req, res) => userController.updateProfile(req, res)
  );

  // ÉTAPE 2 : Mise à jour photo de profil
  router.patch('/profile/photo', 
    authMiddleware.authenticate,
    updatePhotoValidation,
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('profile_photo_update', { entityType: 'user' }),
    (req, res) => userController.updateProfilePhoto(req, res)
  );

  // Supprimer photo de profil
  router.delete('/profile/photo', 
    authMiddleware.authenticate,
    auditMiddleware.logAction('profile_photo_delete', { entityType: 'user' }),
    (req, res) => userController.removeProfilePhoto(req, res)
  );

  // Changer mot de passe
  router.patch('/change-password', 
    authMiddleware.authenticate,
    changePasswordValidation,
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('password_change', { entityType: 'user' }),
    (req, res) => userController.changePassword(req, res)
  );

  // ========================================================================
  // ROUTES ADDITIONNELLES (compatibles avec votre système)
  // ========================================================================

  // Récupérer les types d'utilisateurs disponibles
  router.get('/types', (req, res) => {
    const types = [
      { value: 'visiteur', label: 'Visiteur' },
      { value: 'ecrivain', label: 'Écrivain' },
      { value: 'journaliste', label: 'Journaliste' },
      { value: 'scientifique', label: 'Scientifique' },
      { value: 'acteur', label: 'Acteur' },
      { value: 'artiste', label: 'Artiste' },
      { value: 'artisan', label: 'Artisan' },
      { value: 'realisateur', label: 'Réalisateur' },
      { value: 'musicien', label: 'Musicien' },
      { value: 'photographe', label: 'Photographe' },
      { value: 'danseur', label: 'Danseur' },
      { value: 'sculpteur', label: 'Sculpteur' },
      { value: 'autre', label: 'Autre' }
    ];

    res.json({
      success: true,
      data: types
    });
  });

  // Vérifier si un email existe déjà
  router.post('/check-email',
    body('email').isEmail().normalizeEmail(),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const { email } = req.body;
        const exists = await models.User.findOne({
          where: { email },
          attributes: ['id_user']
        });

        res.json({
          success: true,
          exists: !!exists
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  // ========================================================================
  // LOG DES ROUTES
  // ========================================================================

  const routeCount = router.stack.filter(layer => layer.route).length;
  console.log(`✅ Routes utilisateur initialisées: ${routeCount} routes`);

  return router;
};