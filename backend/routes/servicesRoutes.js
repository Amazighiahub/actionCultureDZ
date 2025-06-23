// routes/servicesRoutes.js
const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');

// Factory function qui reçoit les modèles et middlewares
const initServiceRoutes = (models, authMiddleware) => {
  const { 
    authenticate, 
    requireAdmin, 
    requireValidatedProfessional,
    isAuthenticated 
  } = authMiddleware;

  // Middleware pour vérifier la propriété d'un service
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

      // Admin peut tout faire
      if (req.user.isAdmin) {
        return next();
      }

      // Vérifier si l'utilisateur est le créateur
      // Adapter selon votre modèle de données
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

  // ========================================================================
  // ROUTES PUBLIQUES - VISITEURS
  // ========================================================================

  // Obtenir tous les services
  router.get('/services', servicesController.getAllServices);

  // Obtenir un service par ID
  router.get('/services/:id', servicesController.getServiceById);

  // Obtenir les services par DetailLieu
  router.get('/services/detail-lieu/:detailLieuId', servicesController.getServicesByDetailLieu);

  // Obtenir les services par Lieu
  router.get('/services/lieu/:lieuId', servicesController.getServicesByLieu);

  // Rechercher des services par proximité géographique
  router.get('/services/proximite', servicesController.getServicesByProximity);

  // Obtenir les services groupés par lieu dans une zone
  router.get('/services/grouped-by-lieu', servicesController.getServicesGroupedByLieu);

  // ========================================================================
  // ROUTES PROTÉGÉES - PROFESSIONNELS VALIDÉS
  // ========================================================================

  // Créer un nouveau service simple (DetailLieu doit exister)
  router.post('/services', 
    authenticate, 
    requireValidatedProfessional, 
    servicesController.createService
  );

  // Créer un service complet (avec création de Lieu, DetailLieu et LieuMedia si nécessaire)
  router.post('/services/complet', 
    authenticate, 
    requireValidatedProfessional, 
    servicesController.createServiceComplet
  );

  // Créer plusieurs services
  router.post('/services/bulk', 
    authenticate, 
    requireValidatedProfessional, 
    servicesController.createMultipleServices
  );

  // Mettre à jour un service - PROPRIÉTAIRE OU ADMIN
  router.put('/services/:id', 
    authenticate,
    checkServiceOwnership,
    servicesController.updateService
  );

  // Supprimer un service - PROPRIÉTAIRE OU ADMIN
  router.delete('/services/:id', 
    authenticate,
    checkServiceOwnership,
    servicesController.deleteService
  );

  // ========================================================================
  // ROUTES ADMIN SEULEMENT
  // ========================================================================

  // Statistiques des services
  router.get('/services/stats/overview',
    authenticate,
    requireAdmin,
    servicesController.getServicesStats
  );

  // Export des services
  router.get('/services/export',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { format = 'json', wilayaId } = req.query;
        
        const where = {};
        const include = [{
          model: models.DetailLieu,
          include: [{
            model: models.Lieu,
            where: wilayaId ? { wilayaId } : {},
            include: [models.Wilaya, models.Daira, models.Commune]
          }]
        }];

        const services = await models.Service.findAll({
          where,
          include
        });

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

  return router;
};

module.exports = initServiceRoutes;