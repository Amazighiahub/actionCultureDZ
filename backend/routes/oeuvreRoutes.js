// routes/oeuvreRoutes.js - Routes complètes pour les œuvres
const express = require('express');
const router = express.Router();
const OeuvreController = require('../controllers/OeuvreController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { body } = require('express-validator');

const initOeuvreRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const oeuvreController = new OeuvreController(models);

  // ========================================================================
  // VALIDATIONS
  // ========================================================================

  // Validation pour la création d'œuvre
  const createOeuvreValidation = [
    body('titre')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Le titre est obligatoire (max 255 caractères)'),
    body('id_type_oeuvre')
      .isInt()
      .withMessage('Type d\'œuvre invalide')
      .custom(async (value) => {
        // Vérifier que ce n'est pas l'artisanat
        const type = await models.TypeOeuvre.findByPk(value);
        if (type && type.nom_type.toLowerCase().includes('artisanat')) {
          throw new Error('L\'artisanat doit être créé via le module dédié');
        }
        return true;
      }),
    body('id_langue')
      .isInt()
      .withMessage('Langue invalide'),
    body('annee_creation')
      .optional()
      .isInt({ min: -3000, max: new Date().getFullYear() })
      .withMessage('Année de création invalide'),
    body('description')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description trop longue (max 5000 caractères)'),
    body('id_oeuvre_originale')
      .optional()
      .isInt()
      .withMessage('ID œuvre originale invalide'),
    body('categories')
      .optional()
      .isArray()
      .withMessage('Les catégories doivent être un tableau'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Les tags doivent être un tableau'),
    body('editeurs')
      .optional()
      .isArray()
      .withMessage('Les éditeurs doivent être un tableau'),
    body('editeurs.*.id_editeur')
      .optional()
      .isInt()
      .withMessage('ID éditeur invalide')
  ];

  // Validation pour la mise à jour
  const updateOeuvreValidation = [
    body('titre')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Le titre doit contenir entre 1 et 255 caractères'),
    body('annee_creation')
      .optional()
      .isInt({ min: -3000, max: new Date().getFullYear() })
      .withMessage('Année de création invalide'),
    body('description')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description trop longue (max 5000 caractères)')
  ];

  // Validation pour la modération
  const validateOeuvreValidation = [
    body('statut')
      .isIn(['publie', 'rejete'])
      .withMessage('Statut invalide'),
    body('raison_rejet')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Raison de rejet trop longue')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES (Consultation)
  // ========================================================================

  // Liste des œuvres avec pagination et filtres
  router.get('/', 
    cacheMiddleware.conditionalCache(300), // Cache 5 minutes
    validationMiddleware.validatePagination,
    oeuvreController.getAllOeuvres.bind(oeuvreController)
  );
  
  // Œuvres récentes
  router.get('/recent', 
    cacheMiddleware.conditionalCache(300),
    async (req, res) => {
      req.query.limit = req.query.limit || 6;
      req.query.sort = 'recent';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  // Œuvres populaires (par note)
  router.get('/popular',
    cacheMiddleware.conditionalCache(300),
    async (req, res) => {
      req.query.limit = req.query.limit || 6;
      req.query.sort = 'rating';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );
  
  // Statistiques générales
  router.get('/statistics', 
    cacheMiddleware.conditionalCache(3600), // Cache 1 heure
    async (req, res) => {
      try {
        const sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
        
        if (!sequelize) {
          return res.status(500).json({ success: false, error: 'Erreur de configuration' });
        }

        const [
          totalOeuvres,
          parType,
          parLangue,
          noteMoyenneGlobale
        ] = await Promise.all([
          // Total des œuvres publiées
          models.Oeuvre.count({ where: { statut: 'publie' } }),
          
          // Par type
          models.Oeuvre.findAll({
            attributes: [
              [sequelize.fn('COUNT', sequelize.col('Oeuvre.id_oeuvre')), 'total'],
              [sequelize.col('TypeOeuvre.nom_type'), 'type']
            ],
            include: [{
              model: models.TypeOeuvre,
              attributes: []
            }],
            where: { statut: 'publie' },
            group: ['TypeOeuvre.id_type_oeuvre', 'TypeOeuvre.nom_type']
          }),
          
          // Par langue
          models.Oeuvre.findAll({
            attributes: [
              [sequelize.fn('COUNT', sequelize.col('Oeuvre.id_oeuvre')), 'total'],
              [sequelize.col('Langue.nom'), 'langue']
            ],
            include: [{
              model: models.Langue,
              attributes: []
            }],
            where: { statut: 'publie' },
            group: ['Langue.id_langue', 'Langue.nom']
          }),
          
          // Note moyenne globale
          models.CritiqueEvaluation.findOne({
            attributes: [[sequelize.fn('AVG', sequelize.col('note')), 'moyenne']]
          })
        ]);

        res.json({
          success: true,
          data: {
            total: totalOeuvres,
            parType: parType.map(item => ({
              type: item.dataValues.type,
              count: parseInt(item.dataValues.total)
            })),
            parLangue: parLangue.map(item => ({
              langue: item.dataValues.langue,
              count: parseInt(item.dataValues.total)
            })),
            noteMoyenneGlobale: noteMoyenneGlobale?.dataValues?.moyenne || 0
          }
        });
      } catch (error) {
        console.error('Erreur statistiques œuvres:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );
  
  // Recherche avancée
  router.get('/search', 
    rateLimitMiddleware.general,
    oeuvreController.searchOeuvres.bind(oeuvreController)
  );

  // Détails d'une œuvre
  router.get('/:id',
    validationMiddleware.validateId('id'),
    oeuvreController.getOeuvreById.bind(oeuvreController)
  );

  // Liens de partage social
  router.get('/:id/share-links',
    validationMiddleware.validateId('id'),
    oeuvreController.getShareLinks.bind(oeuvreController)
  );

  // Médias d'une œuvre (public)
  router.get('/:id/medias',
    validationMiddleware.validateId('id'),
    oeuvreController.getMedias.bind(oeuvreController)
  );

  // ========================================================================
  // ROUTES AUTHENTIFIÉES (Professionnels validés)
  // ========================================================================

  // Créer une œuvre
  router.post('/', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    rateLimitMiddleware.creation,
    createOeuvreValidation,
    validationMiddleware.handleValidationErrors,
    validationMiddleware.validateWorkSubmission,
    oeuvreController.createOeuvre.bind(oeuvreController)
  );

  // Mettre à jour une œuvre
  router.put('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    authMiddleware.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validationMiddleware.validateId('id'),
    updateOeuvreValidation,
    validationMiddleware.handleValidationErrors,
    oeuvreController.updateOeuvre.bind(oeuvreController)
  );

  // Supprimer une œuvre
  router.delete('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    authMiddleware.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validationMiddleware.validateId('id'),
    rateLimitMiddleware.sensitiveActions,
    oeuvreController.deleteOeuvre.bind(oeuvreController)
  );

  // ========================================================================
  // GESTION DES MÉDIAS
  // ========================================================================

  // Upload de médias
  router.post('/:id/medias/upload',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    rateLimitMiddleware.creation,
    oeuvreController.upload.array('files', 10), // Max 10 fichiers
    oeuvreController.uploadMedia.bind(oeuvreController)
  );

  // Supprimer un média
  router.delete('/:id/medias/:mediaId',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    validationMiddleware.validateId('mediaId'),
    oeuvreController.deleteMedia.bind(oeuvreController)
  );

  // ========================================================================
  // ROUTES ADMIN (Modération)
  // ========================================================================

  // Valider/rejeter une œuvre
  router.patch('/:id/validate', 
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateOeuvreValidation,
    validationMiddleware.handleValidationErrors,
    oeuvreController.validateOeuvre.bind(oeuvreController)
  );

  // Récupérer les œuvres en attente de validation
  router.get('/admin/pending',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    async (req, res) => {
      req.query.statut = 'brouillon';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  // Récupérer les œuvres rejetées
  router.get('/admin/rejected',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    async (req, res) => {
      req.query.statut = 'rejete';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  // ========================================================================
  // ROUTES UTILISATEUR CONNECTÉ
  // ========================================================================

  // Mes œuvres
  router.get('/user/my-works',
    authMiddleware.authenticate,
    async (req, res) => {
      try {
        const { page = 1, limit = 10, statut } = req.query;
        const offset = (page - 1) * limit;

        const where = { saisi_par: req.user.id_user };
        if (statut) where.statut = statut;

        const oeuvres = await models.Oeuvre.findAndCountAll({
          where,
          include: [
            { model: models.TypeOeuvre },
            { model: models.Langue },
            { model: models.Media, attributes: ['url'], limit: 1 }
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['date_creation', 'DESC']]
        });

        res.json({
          success: true,
          data: {
            oeuvres: oeuvres.rows,
            pagination: {
              total: oeuvres.count,
              page: parseInt(page),
              pages: Math.ceil(oeuvres.count / limit),
              limit: parseInt(limit)
            }
          }
        });
      } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // Statistiques de mes œuvres
  router.get('/user/my-statistics',
    authMiddleware.authenticate,
    async (req, res) => {
      try {
        const userId = req.user.id_user;

        const [
          totalOeuvres,
          parStatut,
          totalVues,
          totalCritiques
        ] = await Promise.all([
          models.Oeuvre.count({ where: { saisi_par: userId } }),
          
          models.Oeuvre.findAll({
            where: { saisi_par: userId },
            attributes: [
              'statut',
              [models.sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['statut']
          }),
          
          // Total des vues (si vous avez un système de tracking)
          0, // À implémenter selon votre système
          
          models.CritiqueEvaluation.count({
            include: [{
              model: models.Oeuvre,
              where: { saisi_par: userId },
              attributes: []
            }]
          })
        ]);

        res.json({
          success: true,
          data: {
            total: totalOeuvres,
            parStatut: parStatut.reduce((acc, item) => {
              acc[item.statut] = parseInt(item.dataValues.count);
              return acc;
            }, {}),
            totalVues,
            totalCritiques
          }
        });
      } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // ========================================================================
  // DOCUMENTATION API
  // ========================================================================

  router.get('/api/documentation', (req, res) => {
    res.json({
      success: true,
      message: 'API Œuvres - Documentation',
      endpoints: {
        public: {
          list: 'GET /api/oeuvres',
          recent: 'GET /api/oeuvres/recent',
          popular: 'GET /api/oeuvres/popular',
          details: 'GET /api/oeuvres/:id',
          search: 'GET /api/oeuvres/search',
          statistics: 'GET /api/oeuvres/statistics',
          shareLinks: 'GET /api/oeuvres/:id/share-links',
          medias: 'GET /api/oeuvres/:id/medias'
        },
        authenticated: {
          create: 'POST /api/oeuvres',
          update: 'PUT /api/oeuvres/:id',
          delete: 'DELETE /api/oeuvres/:id',
          myWorks: 'GET /api/oeuvres/user/my-works',
          myStats: 'GET /api/oeuvres/user/my-statistics',
          uploadMedia: 'POST /api/oeuvres/:id/medias/upload',
          deleteMedia: 'DELETE /api/oeuvres/:id/medias/:mediaId'
        },
        admin: {
          validate: 'PATCH /api/oeuvres/:id/validate',
          pending: 'GET /api/oeuvres/admin/pending',
          rejected: 'GET /api/oeuvres/admin/rejected'
        },
        filters: {
          pagination: '?page=1&limit=10',
          type: '?type=1',
          langue: '?langue=1',
          statut: '?statut=publie',
          annee: '?annee_min=2000&annee_max=2024',
          search: '?search=terme',
          sort: '?sort=recent|title|year|rating',
          withCritiques: '?with_critiques=true',
          editeur: '?editeur_id=1'
        },
        notes: {
          artisanat: 'L\'artisanat est géré via un module séparé',
          medias: 'Types acceptés: jpeg, jpg, png, gif, pdf, mp4, mp3, doc, docx',
          maxFileSize: '50MB par fichier',
          maxFiles: '10 fichiers par upload'
        }
      }
    });
  });

  console.log('✅ Routes œuvres complètes initialisées');
  
  return router;
};

module.exports = initOeuvreRoutes;