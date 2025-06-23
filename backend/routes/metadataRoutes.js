// routes/metadataRoutes.js - Routes pour les métadonnées (Version avec accès professionnel)
const express = require('express');
const MetadataController = require('../controllers/MetadataController');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body } = require('express-validator');

const initMetadataRoutes = (models, authMiddleware) => {
  const router = express.Router();
  
  // Vérification initiale des modèles
  console.log('📋 Initialisation des routes metadata...');
  console.log('   Modèles reçus:', Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize').length);
  
  // Vérifier les modèles essentiels
  const requiredModels = ['TypeOeuvre', 'Genre', 'Categorie', 'TypeOeuvreGenre', 'GenreCategorie'];
  const missingModels = requiredModels.filter(modelName => !models[modelName]);
  
  if (missingModels.length > 0) {
    console.error('❌ Modèles manquants pour les routes metadata:', missingModels.join(', '));
    console.error('   Cela peut causer des erreurs dans certaines routes');
  } else {
    console.log('✅ Tous les modèles requis sont disponibles');
  }
  
  // Créer le contrôleur (qui initialise automatiquement le HierarchieService)
  const metadataController = new MetadataController(models);

  // ===== MIDDLEWARE PERSONNALISÉ POUR ADMIN OU PROFESSIONNEL =====
  
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

      // Vérifier si l'utilisateur est admin (plusieurs façons de vérifier)
      if (req.user.role === 'Admin' || req.user.isAdmin || 
          (req.user.roleNames && req.user.roleNames.includes('Administrateur'))) {
        return next();
      }
      
      // Vérifier si l'utilisateur est un professionnel
      if (req.user.role === 'Professionnel' || req.user.isProfessionnel || 
          (req.user.roleNames && req.user.roleNames.includes('Professionnel'))) {
        
        // Vérifier le statut de validation
        if (req.user.statut_validation === 'valide') {
          return next();
        } else if (req.user.statut_validation === 'en_attente') {
          return res.status(403).json({
            success: false,
            error: 'Votre compte professionnel est en attente de validation',
            statut: req.user.statut_validation
          });
        } else if (req.user.statut_validation === 'rejete') {
          return res.status(403).json({
            success: false,
            error: 'Votre demande de validation professionnelle a été rejetée',
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

  // ===== RÉCUPÉRATION GLOBALE =====
  
  // Route pour récupérer toutes les métadonnées d'un coup
  router.get('/all', (req, res) => metadataController.getAllMetadata(req, res));

  // ===== HIÉRARCHIE TYPE → GENRE → CATÉGORIE =====
  
  // Obtenir tous les types d'œuvres
  router.get('/types-oeuvres', (req, res) => metadataController.getTypesOeuvres(req, res));
  
  // Obtenir les genres disponibles pour un type d'œuvre
  router.get('/types-oeuvres/:typeId/genres',
    validationMiddleware.validateId('typeId'),
    (req, res) => metadataController.getGenresParType(req, res)
  );

  // ===== TYPES D'UTILISATEURS =====

  // Récupérer tous les types d'utilisateurs
  router.get('/types-users', (req, res) => metadataController.getTypesUsers(req, res));

  // ===== ÉDITEURS (CRUD avec accès Admin + Professionnel) =====

  // Récupérer tous les éditeurs (accès public pour consultation)
  router.get('/editeurs', (req, res) => metadataController.getEditeurs(req, res));

  // Créer un nouvel éditeur (admin + professionnel validé)
  router.post('/editeurs',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessionalForContent,
    [
      body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
      body('type_editeur').optional().trim(),
      body('site_web').optional().isURL().withMessage('URL invalide'),
      body('actif').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.createEditeur(req, res)
  );

  // Modifier un éditeur (admin + professionnel validé)
  router.put('/editeurs/:id',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
      body('type_editeur').optional().trim(),
      body('site_web').optional().isURL().withMessage('URL invalide'),
      body('actif').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.updateEditeur(req, res)
  );

  // Supprimer/désactiver un éditeur (admin only - action critique)
  router.delete('/editeurs/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin, // Garde admin only pour la suppression
    validationMiddleware.validateId('id'),
    (req, res) => metadataController.deleteEditeur(req, res)
  );

  // Route alternative pour les catégories par genre (au cas où)
  router.get('/genres/:genreId/categories',
    validationMiddleware.validateId('genreId'),
    (req, res) => metadataController.getCategoriesParGenre(req, res)
  );
  router.get('/types-oeuvres/:id/categories',
  validationMiddleware.validateId('id'),
  (req, res) => metadataController.getCategoriesForType(req, res)
);
 router.get('/types-oeuvres/:typeId/has-categories',
    validationMiddleware.validateId('typeId'),
    (req, res) => metadataController.checkIfTypeHasCategories(req, res)
  );
  // Valider une sélection hiérarchique
  router.post('/validate-hierarchy',
    [
      body('id_type_oeuvre').isInt({ min: 1 }).withMessage('ID du type d\'œuvre invalide'),
      body('id_genre').isInt({ min: 1 }).withMessage('ID du genre invalide'),
      body('categories').optional().isArray().withMessage('Les catégories doivent être un tableau'),
      body('categories.*').optional().isInt({ min: 1 }).withMessage('ID de catégorie invalide')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.validerHierarchie(req, res)
  );

  // Obtenir la hiérarchie complète
  router.get('/hierarchy',
    (req, res) => metadataController.getHierarchieComplete(req, res)
  );

  // Statistiques d'utilisation de la hiérarchie (admin only)
  router.get('/hierarchy/statistics',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    (req, res) => metadataController.getHierarchieStatistics(req, res)
  );

  // Gestion admin de la hiérarchie
  router.post('/types/:typeId/genres',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('typeId'),
    [
      body('id_genre').isInt({ min: 1 }).withMessage('ID du genre requis'),
      body('ordre_affichage').optional().isInt({ min: 0 }).withMessage('Ordre d\'affichage invalide')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.ajouterGenreAuType(req, res)
  );

  router.post('/genres/:genreId/categories',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('genreId'),
    [
      body('id_categorie').isInt({ min: 1 }).withMessage('ID de la catégorie requis'),
      body('ordre_affichage').optional().isInt({ min: 0 }).withMessage('Ordre d\'affichage invalide')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.ajouterCategorieAuGenre(req, res)
  );

  router.put('/types/:typeId/genres/:genreId',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('typeId'),
    validationMiddleware.validateId('genreId'),
    [
      body('ordre_affichage').optional().isInt({ min: 0 }),
      body('actif').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.modifierGenreDansType(req, res)
  );

  router.delete('/types/:typeId/genres/:genreId',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('typeId'),
    validationMiddleware.validateId('genreId'),
    (req, res) => metadataController.desactiverGenrePourType(req, res)
  );

  // ===== MATÉRIAUX =====
  
  // Récupérer tous les matériaux
  router.get('/materiaux', (req, res) => metadataController.getMateriaux(req, res));

  // Créer un nouveau matériau (admin + professionnel validé)
  router.post('/materiaux',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    [
      body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
      body('description').optional().trim()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.createMateriau(req, res)
  );

  // Modifier un matériau (admin + professionnel validé)
  router.put('/materiaux/:id',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
      body('description').optional().trim()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.updateMateriau(req, res)
  );

  // Supprimer un matériau (admin only)
  router.delete('/materiaux/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    (req, res) => metadataController.deleteMateriau(req, res)
  );

  // ===== TECHNIQUES =====
  
  // Récupérer toutes les techniques
  router.get('/techniques', (req, res) => metadataController.getTechniques(req, res));

  // Créer une nouvelle technique (admin + professionnel validé)
  router.post('/techniques',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    [
      body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
      body('description').optional().trim()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.createTechnique(req, res)
  );

  // Modifier une technique (admin + professionnel validé)
  router.put('/techniques/:id',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
      body('description').optional().trim()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.updateTechnique(req, res)
  );

  // Supprimer une technique (admin only)
  router.delete('/techniques/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    (req, res) => metadataController.deleteTechnique(req, res)
  );

  // ===== LANGUES =====
  
  // Récupérer toutes les langues
  router.get('/langues', (req, res) => metadataController.getLangues(req, res));

  // ===== CATÉGORIES =====
  
  // Récupérer toutes les catégories
  router.get('/categories', (req, res) => metadataController.getCategories(req, res));

  // Rechercher des catégories
  router.get('/categories/search', (req, res) => metadataController.searchCategories(req, res));

  // ===== GENRES =====
  
  // Récupérer tous les genres
  router.get('/genres', (req, res) => metadataController.getGenres(req, res));

  // ===== TYPES D'ORGANISATIONS =====
  
  // Récupérer tous les types d'organisations
  router.get('/types-organisations', (req, res) => metadataController.getTypesOrganisations(req, res));

  // ===== GÉOGRAPHIE (WILAYAS, DAIRAS, COMMUNES, LOCALITÉS) =====
  
  // Récupérer toutes les wilayas (avec options pour inclure dairas et communes)
  router.get('/wilayas', (req, res) => metadataController.getWilayas(req, res));

  // Rechercher des wilayas
  router.get('/wilayas/search', (req, res) => metadataController.searchWilayas(req, res));

  // Récupérer les dairas d'une wilaya
  router.get('/wilayas/:id/dairas',
    validationMiddleware.validateId('id'),
    (req, res) => metadataController.getDairasByWilaya(req, res)
  );

  // Récupérer les communes d'une daira
  router.get('/dairas/:id/communes',
    validationMiddleware.validateId('id'),
    (req, res) => metadataController.getCommunesByDaira(req, res)
  );

  // Récupérer les localités d'une commune
  router.get('/communes/:id/localites',
    validationMiddleware.validateId('id'),
    (req, res) => metadataController.getLocalitesByCommune(req, res)
  );

  // ===== TAGS / MOTS-CLÉS =====
  
  // Récupérer les tags (avec recherche optionnelle)
  router.get('/tags', (req, res) => metadataController.getTags(req, res));

  // Créer un nouveau tag
  router.post('/tags',
    authMiddleware.authenticate,
    [
      body('nom').trim().notEmpty().withMessage('Le nom du tag est obligatoire')
        .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères')
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.createTag(req, res)
  );

  // ===== STATISTIQUES =====
  
  // Récupérer les statistiques d'utilisation des métadonnées (admin only)
  router.get('/statistics', 
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    (req, res) => metadataController.getUsageStatistics(req, res)
  );

  // ===== ROUTE DE DEBUG (développement uniquement) =====
  
  if (process.env.NODE_ENV !== 'production') {
    // Route de test pour vérifier l'état du service
    router.get('/debug/service-status', (req, res) => {
      const hierarchieService = require('../services/HierarchieService');
      
      res.json({
        success: true,
        debug: {
          environment: process.env.NODE_ENV,
          models_count: Object.keys(models).filter(k => k !== 'sequelize' && k !== 'Sequelize').length,
          required_models_present: requiredModels.every(m => !!models[m]),
          missing_models: missingModels,
          service_initialized: hierarchieService.isInitialized,
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  // ===== ROUTE RACINE =====
  
  // Documentation des routes metadata
  router.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'API Metadata - Gestion des métadonnées',
      version: '1.0.0',
      endpoints: {
        global: {
          all: 'GET /api/metadata/all - Récupérer toutes les métadonnées',
          statistics: 'GET /api/metadata/statistics - Statistiques d\'utilisation (admin)'
        },
        hierarchie: {
          types: 'GET /api/metadata/types-oeuvres - Liste des types d\'œuvres',
          genres_by_type: 'GET /api/metadata/types/:typeId/genres - Genres disponibles pour un type',
          categories_by_genre: 'GET /api/metadata/genres/:genreId/categories - Catégories disponibles pour un genre',
          validate: 'POST /api/metadata/validate-hierarchy - Valider une sélection hiérarchique',
          complete: 'GET /api/metadata/hierarchy - Hiérarchie complète',
          statistics: 'GET /api/metadata/hierarchy/statistics - Statistiques de la hiérarchie (admin)',
          admin: {
            add_genre_to_type: 'POST /api/metadata/types/:typeId/genres - Ajouter un genre à un type (admin)',
            add_category_to_genre: 'POST /api/metadata/genres/:genreId/categories - Ajouter une catégorie à un genre (admin)',
            update_relation: 'PUT /api/metadata/types/:typeId/genres/:genreId - Modifier une relation (admin)',
            disable_relation: 'DELETE /api/metadata/types/:typeId/genres/:genreId - Désactiver une relation (admin)'
          }
        },
        materiaux: {
          list: 'GET /api/metadata/materiaux',
          create: 'POST /api/metadata/materiaux (admin + professionnel)',
          update: 'PUT /api/metadata/materiaux/:id (admin + professionnel)',
          delete: 'DELETE /api/metadata/materiaux/:id (admin)'
        },
        techniques: {
          list: 'GET /api/metadata/techniques',
          create: 'POST /api/metadata/techniques (admin + professionnel)',
          update: 'PUT /api/metadata/techniques/:id (admin + professionnel)',
          delete: 'DELETE /api/metadata/techniques/:id (admin)'
        },
        langues: {
          list: 'GET /api/metadata/langues'
        },
        categories: {
          list: 'GET /api/metadata/categories',
          search: 'GET /api/metadata/categories/search?q=term'
        },
        genres: {
          list: 'GET /api/metadata/genres'
        },
        editeurs: {
          list: 'GET /api/metadata/editeurs',
          filtered: 'GET /api/metadata/editeurs?type_editeur=type',
          create: 'POST /api/metadata/editeurs (admin + professionnel validé)',
          update: 'PUT /api/metadata/editeurs/:id (admin + professionnel validé)',
          delete: 'DELETE /api/metadata/editeurs/:id (admin only)'
        },
        types_organisations: {
          list: 'GET /api/metadata/types-organisations'
        },
        geographie: {
          wilayas: 'GET /api/metadata/wilayas',
          wilayas_with_details: 'GET /api/metadata/wilayas?includeDairas=true&includeCommunes=true',
          search_wilayas: 'GET /api/metadata/wilayas/search?q=term',
          dairas_by_wilaya: 'GET /api/metadata/wilayas/:id/dairas',
          communes_by_daira: 'GET /api/metadata/dairas/:id/communes',
          localites_by_commune: 'GET /api/metadata/communes/:id/localites'
        },
        tags: {
          list: 'GET /api/metadata/tags',
          search: 'GET /api/metadata/tags?search=term&limit=50',
          create: 'POST /api/metadata/tags (auth required)'
        },
        permissions: {
          public: 'Les routes GET sont accessibles publiquement',
          authenticated: 'La création de tags nécessite une authentification',
          admin: 'Les routes de suppression et statistiques nécessitent le rôle Admin',
          professional: 'Les routes de création/modification des éditeurs, matériaux et techniques sont accessibles aux professionnels validés',
          combined: 'Éditeurs, matériaux et techniques : création/modification = Admin + Professionnel validé, suppression = Admin uniquement'
        }
      }
    });
  });

  console.log('✅ Routes metadata initialisées avec succès');
  
  return router;
};

module.exports = initMetadataRoutes;
const requireAdminOrProfessional = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }

    // Debug (à retirer en production)
    if (process.env.NODE_ENV === 'development') {
      console.log('User auth check:', {
        id: req.user.id_user,
        roleNames: req.user.roleNames,
        isProfessionnel: req.user.isProfessionnel,
        statut_validation: req.user.statut_validation
      });
    }

    // Vérifier si l'utilisateur est admin
    if (req.user.isAdmin) {
      return next();
    }
    
    // Vérifier si l'utilisateur est un professionnel validé
    if (req.user.isProfessionnel) {
      // Vérifier le statut de validation
      if (req.user.statut_validation === 'valide') {
        return next();
      } else if (req.user.statut_validation === 'en_attente') {
        return res.status(403).json({
          success: false,
          error: 'Votre compte professionnel est en attente de validation',
          statut: req.user.statut_validation
        });
      } else if (req.user.statut_validation === 'rejete') {
        return res.status(403).json({
          success: false,
          error: 'Votre demande de validation professionnelle a été rejetée',
          statut: req.user.statut_validation
        });
      }
    }
    
    // Si ni admin ni professionnel validé
    return res.status(403).json({
      success: false,
      error: 'Accès réservé aux administrateurs et professionnels validés',
      debug: process.env.NODE_ENV === 'development' ? {
        hasRoles: !!req.user.roleNames,
        roles: req.user.roleNames || [],
        isProfessionnel: req.user.isProfessionnel,
        statut: req.user.statut_validation
      } : undefined
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification des permissions'
    });
  }
};