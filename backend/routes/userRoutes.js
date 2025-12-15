// routes/userRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const validationMiddleware = require('../middlewares/validationMiddleware');
const auditMiddleware = require('../middlewares/auditMiddleware');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');
const { SUPPORTED_LANGUAGES } = require('../helpers/i18n');

// ✅ Constante pour les types d'utilisateurs
const TYPE_USER_IDS = {
  VISITEUR: 1,
  ECRIVAIN: 2,
  JOURNALISTE: 3,
  SCIENTIFIQUE: 4,
  ACTEUR: 5,
  ARTISTE: 6,
  ARTISAN: 7,
  REALISATEUR: 8,
  MUSICIEN: 9,
  PHOTOGRAPHE: 10,
  DANSEUR: 11,
  SCULPTEUR: 12,
  AUTRE: 13
};

module.exports = (models, authMiddleware) => {
  const UserController = require('../controllers/UserController');
  const userController = new UserController(models);

  console.log('🔧 Initialisation des routes utilisateur...');

  // ========================================================================
  // VALIDATION RULES
  // ========================================================================

  const registerValidation = [
    // ⚡ Nom peut être string ou objet JSON multilingue
    body('nom')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 2 && value.trim().length <= 50;
        }
        if (typeof value === 'object' && value !== null) {
          // Vérifier qu'au moins une langue est remplie
          const hasValue = Object.values(value).some(v => v && v.trim().length >= 2);
          return hasValue;
        }
        return false;
      })
      .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    
    // ⚡ Prénom peut être string ou objet JSON multilingue
    body('prenom')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 2 && value.trim().length <= 50;
        }
        if (typeof value === 'object' && value !== null) {
          const hasValue = Object.values(value).some(v => v && v.trim().length >= 2);
          return hasValue;
        }
        return false;
      })
      .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
    body('id_type_user')
      .optional()
      .isInt({ min: 1, max: 13 })
      .withMessage('Type d\'utilisateur invalide')
      .toInt(),
    body('accepte_conditions')
      .custom(value => value === true || value === 'true')
      .withMessage('Vous devez accepter les conditions d\'utilisation'),
    body('photo_url')
      .optional()
      .matches(/^\/uploads\/images\//)
      .withMessage('URL de photo invalide'),
    // ⚡ Biographie optionnelle (string ou JSON)
    body('biographie')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return true;
        if (typeof value === 'object' && value !== null) return true;
        return false;
      })
      .withMessage('Biographie invalide')
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

  // ⚡ Validation pour mise à jour de traduction
  const updateTranslationValidation = [
    param('id').isInt().withMessage('ID utilisateur invalide'),
    param('lang')
      .isIn(SUPPORTED_LANGUAGES)
      .withMessage(`Langue invalide. Langues supportées: ${SUPPORTED_LANGUAGES.join(', ')}`),
    body('nom')
      .optional()
      .isString()
      .isLength({ min: 2, max: 50 })
      .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('prenom')
      .optional()
      .isString()
      .isLength({ min: 2, max: 50 })
      .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    body('biographie')
      .optional()
      .isString()
      .withMessage('Biographie invalide')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // Inscription (avec photo optionnelle)
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
    authMiddleware.authenticate,
    auditMiddleware.logAction('user_logout', { entityType: 'user' }),
    (req, res) => userController.logoutUser(req, res)
  );

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

  // Récupérer les types d'utilisateurs disponibles
  router.get('/types', (req, res) => {
    const types = Object.entries(TYPE_USER_IDS).map(([key, value]) => ({
      id: value,
      key: key.toLowerCase(),
      label: key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')
    }));

    res.json({
      success: true,
      data: types
    });
  });

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

  // Mise à jour photo de profil
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

  // Route pour vérifier l'email avec un jeton transmis dans l'URL
  router.post(
    '/verify-email/:token', 
    userController.verifyEmail.bind(userController) 
  );

  // ========================================================================
  // ⚡ ROUTES i18n - LISTE ET DÉTAIL UTILISATEURS
  // ========================================================================

  // Liste des utilisateurs (avec recherche multilingue)
  // GET /api/users?search=ahmed&page=1&limit=20&lang=ar
  router.get('/',
    authMiddleware.authenticate,
    authMiddleware.isAdmin,
    (req, res) => userController.listUsers(req, res)
  );

  // Détail d'un utilisateur par ID (traduit selon req.lang)
  // GET /api/users/5?lang=ar
  router.get('/:id',
    authMiddleware.authenticate,
    param('id').isInt().withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    (req, res) => userController.getUserById(req, res)
  );

  // ========================================================================
  // ⚡ ROUTES i18n - GESTION DES TRADUCTIONS (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'un utilisateur (données brutes JSON)
  // GET /api/users/5/translations
  router.get('/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.isAdmin,
    param('id').isInt().withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    (req, res) => userController.getUserTranslations(req, res)
  );

  // Mettre à jour une traduction spécifique
  // PATCH /api/users/5/translation/ar
  // Body: { "nom": "بن علي", "prenom": "أحمد", "biographie": "..." }
  router.patch('/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.isAdmin,
    updateTranslationValidation,
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('user_translation_update', { entityType: 'user' }),
    (req, res) => userController.updateUserTranslation(req, res)
  );

  // ========================================================================
  // LOG DES ROUTES
  // ========================================================================

  const routeCount = router.stack.filter(layer => layer.route).length;
  console.log(`✅ Routes utilisateur initialisées: ${routeCount} routes`);
  console.log(`🌍 Routes i18n ajoutées: GET /, GET /:id, GET /:id/translations, PATCH /:id/translation/:lang`);

  return router;
};