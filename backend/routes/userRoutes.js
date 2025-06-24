// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator'); // ✅ Import de param ajouté
const validationMiddleware = require('../middlewares/validationMiddleware');
const auditMiddleware = require('../middlewares/auditMiddleware');

// ✅ Constante pour les types d'utilisateurs (même que dans le contrôleur)
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
    body('id_type_user') // ✅ Changé de type_user à id_type_user
      .optional()
      .isInt({ min: 1, max: 13 })
      .withMessage('Type d\'utilisateur invalide')
      .toInt(), // Convertir en entier
    body('accepte_conditions')
      .custom(value => value === true || value === 'true')
      .withMessage('Vous devez accepter les conditions d\'utilisation'),
    body('photo_url') // ✅ NOUVEAU : Validation de photo_url optionnelle
      .optional()
      .matches(/^\/uploads\/images\//)
      .withMessage('URL de photo invalide')
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

  // ÉTAPE 1 : Inscription (avec photo optionnelle)
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
  // LOG DES ROUTES
  // ========================================================================
  const routeCount = router.stack.filter(layer => layer.route).length;
  console.log(`✅ Routes utilisateur initialisées: ${routeCount} routes`);

  return router;
};