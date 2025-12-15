// routes/servicesRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const ServicesController = require('../controllers/ServicesController');
const { body, param, query } = require('express-validator');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initServiceRoutes = (models, authMiddleware) => {
  const servicesController = new ServicesController(models);
  
  const { 
    authenticate, 
    requireAdmin, 
    requireValidatedProfessional 
  } = authMiddleware;

  // Middleware de validation
  let validationMiddleware;
  try {
    validationMiddleware = require('../middlewares/validationMiddleware');
  } catch (e) {
    validationMiddleware = {
      handleValidationErrors: (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
      },
      validateId: (paramName) => (req, res, next) => {
        const id = req.params[paramName];
        if (!id || isNaN(id)) {
          return res.status(400).json({ success: false, error: `${paramName} invalide` });
        }
        next();
      }
    };
  }

  // Middleware de vérification de propriété
  const checkServiceOwnership = async (req, res, next) => {
    try {
      const { id } = req.params;
      const service = await models.Service.findByPk(id, {
        attributes: ['id', 'createdBy'],
        include: [{
          model: models.DetailLieu,
          attributes: ['id_detailLieu'],
          include: [{
            model: models.Lieu,
            attributes: ['id_lieu', 'createdBy']
          }]
        }]
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }

      if (req.user.isAdmin) {
        return next();
      }

      const isOwner = service.createdBy === req.user.id_user || 
                     (service.DetailLieu?.Lieu?.createdBy === req.user.id_user);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier ce service'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur vérification propriété:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };

  // ⚡ Validation acceptant string OU JSON
  const createServiceValidation = [
    body('nom')
      .custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      })
      .withMessage('Le nom est requis (min 2 caractères)'),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 2000;
        if (typeof value === 'object') return true;
        return true;
      }),
    body('type_service').notEmpty().withMessage('Type de service requis'),
    body('id_lieu').optional().isInt()
  ];

  // ========================================================================
  // ROUTES PUBLIQUES - VISITEURS
  // ========================================================================

  // Obtenir tous les services
  router.get('/services', 
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
      query('type').optional().isString(),
      query('lieu_id').optional().isInt()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => servicesController.getAllServices(req, res)
  );

  // Services par DetailLieu
  router.get('/services/detail-lieu/:detailLieuId', 
    validationMiddleware.validateId('detailLieuId'),
    (req, res) => servicesController.getServicesByDetailLieu(req, res)
  );

  // Services par Lieu
  router.get('/services/lieu/:lieuId', 
    validationMiddleware.validateId('lieuId'),
    (req, res) => servicesController.getServicesByLieu(req, res)
  );

  // Recherche par proximité
  router.get('/services/proximite', 
    [
      query('latitude').isFloat({ min: -90, max: 90 }),
      query('longitude').isFloat({ min: -180, max: 180 }),
      query('radius').optional().isFloat({ min: 0.1, max: 100 })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => servicesController.getServicesByProximity(req, res)
  );

  // Services groupés par lieu
  router.get('/services/grouped-by-lieu', 
    (req, res) => servicesController.getServicesGroupedByLieu(req, res)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'un service
  router.get('/services/:id/translations',
    authenticate,
    requireAdmin,
    validationMiddleware.validateId('id'),
    (req, res) => servicesController.getServiceTranslations(req, res)
  );

  // Mettre à jour une traduction spécifique
  router.patch('/services/:id/translation/:lang',
    authenticate,
    requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 2000 })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => servicesController.updateServiceTranslation(req, res)
  );

  // ========================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ========================================================================

  // Obtenir un service par ID
  router.get('/services/:id', 
    validationMiddleware.validateId('id'),
    (req, res) => servicesController.getServiceById(req, res)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES - PROFESSIONNELS VALIDÉS
  // ========================================================================

  // Créer un nouveau service
  router.post('/services', 
    authenticate, 
    requireValidatedProfessional,
    createServiceValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => servicesController.createService(req, res)
  );

  // Créer un service complet
  router.post('/services/complet', 
    authenticate, 
    requireValidatedProfessional,
    (req, res) => servicesController.createServiceComplet(req, res)
  );

  // Créer plusieurs services
  router.post('/services/bulk', 
    authenticate, 
    requireValidatedProfessional,
    (req, res) => servicesController.createMultipleServices(req, res)
  );

  // Mettre à jour un service
  router.put('/services/:id', 
    authenticate,
    checkServiceOwnership,
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return true;
        return false;
      }),
      body('description').optional().custom((value) => {
        if (typeof value === 'string') return value.length <= 2000;
        if (typeof value === 'object') return true;
        return true;
      })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => servicesController.updateService(req, res)
  );

  // Supprimer un service
  router.delete('/services/:id', 
    authenticate,
    checkServiceOwnership,
    validationMiddleware.validateId('id'),
    (req, res) => servicesController.deleteService(req, res)
  );

  // ========================================================================
  // ROUTES ADMIN SEULEMENT
  // ========================================================================

  // Statistiques
  router.get('/services/stats/overview',
    authenticate,
    requireAdmin,
    (req, res) => servicesController.getServicesStats(req, res)
  );

  // Export
  router.get('/services/export',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { format = 'json', wilayaId } = req.query;
        
        const include = [{
          model: models.DetailLieu,
          include: [{
            model: models.Lieu,
            where: wilayaId ? { wilayaId } : {},
            include: [models.Wilaya, models.Daira, models.Commune]
          }]
        }];

        const services = await models.Service.findAll({ include });

        res.json({
          success: true,
          count: services.length,
          format,
          data: services
        });
      } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'export'
        });
      }
    }
  );

  console.log('✅ Routes services i18n initialisées');
  console.log('  🌍 Routes traduction: GET /services/:id/translations, PATCH /services/:id/translation/:lang');

  return router;
};

module.exports = initServiceRoutes;
