// routes/intervenantRoutes.js - Routes pour la gestion des intervenants
const express = require('express');
const IntervenantController = require('../controllers/IntervenantController');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, query } = require('express-validator');

const initIntervenantRoutes = (models, authMiddleware) => {
  const router = express.Router();
  
  console.log('📋 Initialisation des routes intervenants...');
  
  // Créer le contrôleur
  const intervenantController = new IntervenantController(models);

  // ===== MIDDLEWARE PERSONNALISÉ =====
  
  // Middleware qui permet l'accès aux administrateurs OU aux professionnels validés
  const requireAdminOrProfessional = async (req, res, next) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise'
        });
      }

      // Vérifier si l'utilisateur est admin
      if (req.user.role === 'Admin' || req.user.isAdmin) {
        return next();
      }
      
      // Vérifier si l'utilisateur est un professionnel validé
      if (req.user.role === 'Professionnel' || req.user.isProfessionnel) {
        // Vérifier le statut de validation
        if (req.user.statut_validation === 'valide') {
          return next();
        } else {
          return res.status(403).json({
            success: false,
            error: 'Votre compte professionnel doit être validé pour accéder à cette fonctionnalité',
            statut: req.user.statut_validation
          });
        }
      }
      
      // Si ni admin ni professionnel validé
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs et professionnels validés'
      });
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification des permissions'
      });
    }
  };

  // ===== ROUTES PUBLIQUES =====
  
  // IMPORTANT: Les routes spécifiques doivent être placées AVANT les routes avec paramètres

  // Route de documentation (la plus spécifique)
  router.get('/docs/api', (req, res) => {
    res.json({
      success: true,
      message: 'API Intervenants - Documentation',
      endpoints: {
        public: {
          list: 'GET /api/intervenants - Liste des intervenants avec filtres',
          search: 'GET /api/intervenants/search?q=terme - Recherche d\'intervenants',
          types: 'GET /api/intervenants/types - Types d\'intervenants disponibles',
          details: 'GET /api/intervenants/:id - Détails d\'un intervenant'
        },
        protected: {
          create: 'POST /api/intervenants - Créer un intervenant (Admin + Professionnel validé)',
          update: 'PUT /api/intervenants/:id - Modifier un intervenant (Admin + Professionnel validé)',
          delete: 'DELETE /api/intervenants/:id - Supprimer un intervenant (Admin uniquement)',
          stats: 'GET /api/intervenants/stats/overview - Statistiques (Admin uniquement)'
        },
        permissions: {
          public: 'Les routes GET sont accessibles publiquement',
          create_update: 'La création et modification nécessitent Admin OU Professionnel validé',
          delete: 'La suppression nécessite le rôle Admin',
          owner_rights: 'Les professionnels peuvent modifier uniquement leurs propres intervenants'
        },
        filters: {
          search: 'Recherche dans nom, prénom, biographie, spécialité',
          type_intervenant: 'Filtrer par type (artiste, conférencier, formateur...)',
          specialite: 'Filtrer par spécialité',
          wilaya_id: 'Filtrer par wilaya',
          disponible: 'Filtrer par disponibilité (true/false)',
          pagination: 'page et limit pour la pagination'
        }
      }
    });
  });

  // Recherche d'intervenants (autocomplétion) - AVANT la route /:id
  router.get('/search',
    [
      query('q').trim().isLength({ min: 2 }).withMessage('Minimum 2 caractères pour la recherche'),
      query('type_intervenant').optional().trim(),
      query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.searchIntervenants(req, res)
  );

  // Récupérer les types d'intervenants disponibles - AVANT la route /:id
  router.get('/types',
    (req, res) => intervenantController.getTypesIntervenants(req, res)
  );

  // Statistiques sur les intervenants (Admin seulement) - AVANT la route /:id
  router.get('/stats/overview',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    (req, res) => intervenantController.getStatistiques(req, res)
  );

  // Récupérer tous les intervenants (public - pour consultation)
  router.get('/',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
      query('type_intervenant').optional().trim(),
      query('specialite').optional().trim(),
      query('wilaya_id').optional().isInt({ min: 1 }),
      query('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.getIntervenants(req, res)
  );

  // Récupérer un intervenant par son ID - DOIT ÊTRE APRÈS toutes les routes spécifiques
  router.get('/:id',
    validationMiddleware.validateId('id'),
    (req, res) => intervenantController.getIntervenantById(req, res)
  );

  // ===== ROUTES PROTÉGÉES (Admin + Professionnel) =====

  // Créer un nouvel intervenant
  router.post('/',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    [
      body('nom').trim().notEmpty().withMessage('Le nom est obligatoire')
        .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
      body('prenom').trim().notEmpty().withMessage('Le prénom est obligatoire')
        .isLength({ max: 100 }).withMessage('Le prénom ne doit pas dépasser 100 caractères'),
      body('type_intervenant').trim().notEmpty().withMessage('Le type d\'intervenant est obligatoire'),
      body('specialite').optional().trim()
        .isLength({ max: 200 }).withMessage('La spécialité ne doit pas dépasser 200 caractères'),
      body('biographie').optional().trim()
        .isLength({ max: 2000 }).withMessage('La biographie ne doit pas dépasser 2000 caractères'),
      body('email').optional().trim().isEmail().withMessage('Email invalide'),
      body('telephone').optional().trim()
        .matches(/^[0-9+\-\s()]+$/).withMessage('Format de téléphone invalide'),
      body('site_web').optional().trim().isURL().withMessage('URL invalide'),
      body('photo_url').optional().trim().isURL().withMessage('URL de photo invalide'),
      body('wilaya_id').optional().isInt({ min: 1 }).withMessage('ID de wilaya invalide'),
      body('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.createIntervenant(req, res)
  );

  // Mettre à jour un intervenant
  router.put('/:id',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().trim().notEmpty()
        .isLength({ max: 100 }).withMessage('Le nom ne doit pas dépasser 100 caractères'),
      body('prenom').optional().trim().notEmpty()
        .isLength({ max: 100 }).withMessage('Le prénom ne doit pas dépasser 100 caractères'),
      body('type_intervenant').optional().trim().notEmpty(),
      body('specialite').optional().trim()
        .isLength({ max: 200 }).withMessage('La spécialité ne doit pas dépasser 200 caractères'),
      body('biographie').optional().trim()
        .isLength({ max: 2000 }).withMessage('La biographie ne doit pas dépasser 2000 caractères'),
      body('email').optional().trim().isEmail().withMessage('Email invalide'),
      body('telephone').optional().trim()
        .matches(/^[0-9+\-\s()]+$/).withMessage('Format de téléphone invalide'),
      body('site_web').optional().trim().isURL().withMessage('URL invalide'),
      body('photo_url').optional().trim().isURL().withMessage('URL de photo invalide'),
      body('wilaya_id').optional().isInt({ min: 1 }).withMessage('ID de wilaya invalide'),
      body('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.updateIntervenant(req, res)
  );

  // ===== ROUTES ADMIN UNIQUEMENT =====

  // Supprimer un intervenant (Admin seulement)
  router.delete('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    (req, res) => intervenantController.deleteIntervenant(req, res)
  );

  console.log('✅ Routes intervenants initialisées avec succès');
  
  return router;
};

module.exports = initIntervenantRoutes;