// routes/metadataRoutes.js - Routes pour les métadonnées
const express = require('express');
const MetadataController = require('../controllers/MetadataController');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body } = require('express-validator');

const initMetadataRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const metadataController = new MetadataController(models);

  // ===== RÉCUPÉRATION GLOBALE =====
  
  // Route pour récupérer toutes les métadonnées d'un coup
  router.get('/all', (req, res) => metadataController.getAllMetadata(req, res));

  // ===== MATÉRIAUX =====
  
  // Récupérer tous les matériaux
  router.get('/materiaux', (req, res) => metadataController.getMateriaux(req, res));

  // Créer un nouveau matériau (admin only)
  router.post('/materiaux',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
      body('description').optional().trim()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.createMateriau(req, res)
  );

  // Modifier un matériau (admin only)
  router.put('/materiaux/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
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

  // Créer une nouvelle technique (admin only)
  router.post('/techniques',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
      body('description').optional().trim()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => metadataController.createTechnique(req, res)
  );

  // Modifier une technique (admin only)
  router.put('/techniques/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
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

  // ===== TYPES D'ŒUVRES =====
  
  // Récupérer tous les types d'œuvres
  router.get('/types-oeuvres', (req, res) => metadataController.getTypesOeuvres(req, res));

  // ===== GENRES =====
  
  // Récupérer tous les genres
  router.get('/genres', (req, res) => metadataController.getGenres(req, res));

  // ===== ÉDITEURS =====
  
  // Récupérer tous les éditeurs (avec filtre optionnel par type)
  router.get('/editeurs', (req, res) => metadataController.getEditeurs(req, res));

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

  // ===== ROUTE RACINE =====
  
  // Documentation des routes metadata
  router.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'API Metadata - Gestion des métadonnées',
      endpoints: {
        global: {
          all: 'GET /api/metadata/all - Récupérer toutes les métadonnées',
          statistics: 'GET /api/metadata/statistics - Statistiques d\'utilisation (admin)'
        },
        materiaux: {
          list: 'GET /api/metadata/materiaux',
          create: 'POST /api/metadata/materiaux (admin)',
          update: 'PUT /api/metadata/materiaux/:id (admin)',
          delete: 'DELETE /api/metadata/materiaux/:id (admin)'
        },
        techniques: {
          list: 'GET /api/metadata/techniques',
          create: 'POST /api/metadata/techniques (admin)',
          update: 'PUT /api/metadata/techniques/:id (admin)',
          delete: 'DELETE /api/metadata/techniques/:id (admin)'
        },
        langues: {
          list: 'GET /api/metadata/langues'
        },
        categories: {
          list: 'GET /api/metadata/categories',
          search: 'GET /api/metadata/categories/search?q=term'
        },
        types_oeuvres: {
          list: 'GET /api/metadata/types-oeuvres'
        },
        genres: {
          list: 'GET /api/metadata/genres'
        },
        editeurs: {
          list: 'GET /api/metadata/editeurs',
          filtered: 'GET /api/metadata/editeurs?type_editeur=type'
        },
        types_organisations: {
          list: 'GET /api/metadata/types-organisations'
        },
        geographie: {
          wilayas: 'GET /api/metadata/wilayas',
          wilayasWithDairas: 'GET /api/metadata/wilayas?includeDairas=true',
          wilayasWithAll: 'GET /api/metadata/wilayas?includeDairas=true&includeCommunes=true',
          searchWilayas: 'GET /api/metadata/wilayas/search?q=term',
          dairasByWilaya: 'GET /api/metadata/wilayas/:id/dairas',
          communesByDaira: 'GET /api/metadata/dairas/:id/communes',
          localitesByCommune: 'GET /api/metadata/communes/:id/localites'
        },
        tags: {
          list: 'GET /api/metadata/tags',
          search: 'GET /api/metadata/tags?search=term&limit=50',
          create: 'POST /api/metadata/tags (auth required)'
        },
        permissions: {
          public: 'Les routes GET sont accessibles publiquement',
          authenticated: 'La création de tags nécessite une authentification',
          admin: 'Les routes POST/PUT/DELETE pour matériaux et techniques nécessitent le rôle Admin',
          statistics: 'Les statistiques nécessitent le rôle Admin'
        }
      }
    });
  });

  console.log('✅ Routes metadata initialisées avec protections d\'authentification');
  
  return router;
};

module.exports = initMetadataRoutes;