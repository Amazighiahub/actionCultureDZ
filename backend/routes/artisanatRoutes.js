const express = require('express');
const router = express.Router();
const ArtisanatController = require('../controllers/ArtisanatController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body } = require('express-validator');

const initArtisanatRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const artisanatController = new ArtisanatController(models);

  // Validation pour la création d'artisanat
  const createArtisanatValidation = [
    body('titre').trim().isLength({ min: 3, max: 255 }).withMessage('Le titre doit contenir entre 3 et 255 caractères'),
    body('description').optional().isLength({ max: 5000 }).withMessage('Description trop longue'),
    body('id_langue').isInt().withMessage('Langue invalide'),
    body('id_materiau').optional().isInt().withMessage('Matériau invalide'),
    body('id_technique').optional().isInt().withMessage('Technique invalide'),
    body('prix').optional().isFloat({ min: 0 }).withMessage('Prix invalide'),
    body('dimensions').optional().isLength({ max: 255 }).withMessage('Dimensions trop longues'),
    body('poids').optional().isFloat({ min: 0 }).withMessage('Poids invalide')
  ];

  // Routes publiques (consultation)
  // CORRECTION: getAllArtisanat → getAllArtisanats (comme dans le contrôleur)
  router.get('/', artisanatController.getAllArtisanats.bind(artisanatController));
  
  // CORRECTION: searchArtisanat → searchArtisanats (comme dans le contrôleur)
  router.get('/search', artisanatController.searchArtisanats.bind(artisanatController));
  
  // CORRECTION: getStatistics → getStatistiques (comme dans le contrôleur)
  router.get('/statistics', artisanatController.getStatistiques.bind(artisanatController));
  
  router.get('/:id', 
    validationMiddleware.validateId('id'),
    artisanatController.getArtisanatById.bind(artisanatController)
  );

  // AJOUT: Route pour récupérer les artisans par région
  router.get('/region/:wilayaId/artisans', 
    validationMiddleware.validateId('wilayaId'),
    artisanatController.getArtisansByRegion.bind(artisanatController)
  );

  // Routes pour professionnels validés uniquement
  router.post('/', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    createArtisanatValidation,
    validationMiddleware.handleValidationErrors,
    artisanatController.createArtisanat.bind(artisanatController)
  );

  // AJOUT: Route pour upload de médias
  router.post('/:id/medias', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    async (req, res, next) => {
      try {
        // Vérifier que l'artisanat appartient à l'utilisateur
        const artisanat = await models.Artisanat.findByPk(req.params.id, {
          include: [{ model: models.Oeuvre }]
        });
        
        if (!artisanat) {
          return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
        }
        
        if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        
        req.artisanat = artisanat;
        next();
      } catch (error) {
        next(error);
      }
    },
    artisanatController.upload.array('medias', 10), // Max 10 fichiers
    artisanatController.uploadMedias.bind(artisanatController)
  );

  router.put('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    async (req, res, next) => {
      try {
        // Vérifier que l'artisanat appartient à l'utilisateur
        const artisanat = await models.Artisanat.findByPk(req.params.id, {
          include: [{ model: models.Oeuvre }]
        });
        
        if (!artisanat) {
          return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
        }
        
        if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        
        req.artisanat = artisanat;
        next();
      } catch (error) {
        next(error);
      }
    },
    artisanatController.updateArtisanat.bind(artisanatController)
  );

  router.delete('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    async (req, res, next) => {
      try {
        const artisanat = await models.Artisanat.findByPk(req.params.id, {
          include: [{ model: models.Oeuvre }]
        });
        
        if (!artisanat) {
          return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
        }
        
        if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        
        req.artisanat = artisanat;
        next();
      } catch (error) {
        next(error);
      }
    },
    artisanatController.deleteArtisanat.bind(artisanatController)
  );

  console.log('✅ Routes artisanat initialisées');

  return router;
};

module.exports = initArtisanatRoutes;