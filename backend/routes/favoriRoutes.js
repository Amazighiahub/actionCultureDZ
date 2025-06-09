const express = require('express');
const router = express.Router();
const FavoriController = require('../controllers/FavoriController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body } = require('express-validator');

const initFavoriRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const favoriController = new FavoriController(models);

  // Validation pour l'ajout de favoris
  const addFavoriValidation = [
    body('type_entite')
      .isIn(['oeuvre', 'evenement', 'lieu', 'artisanat'])
      .withMessage('Type d\'entité invalide'),
    body('id_entite')
      .isInt({ min: 1 })
      .withMessage('ID d\'entité invalide')
  ];

  // Toutes les routes nécessitent une authentification
  router.use(authMiddleware.authenticate);

  // Récupérer les favoris de l'utilisateur connecté
  router.get('/', 
    validationMiddleware.validatePagination,
    favoriController.getUserFavoris.bind(favoriController)
  );

  // Statistiques des favoris de l'utilisateur
  router.get('/stats', 
    favoriController.getUserFavorisStats.bind(favoriController)
  );

  // Favoris populaires (publics)
  router.get('/popular', 
    favoriController.getPopularFavorites.bind(favoriController)
  );

  // Vérifier si une entité est dans les favoris
  router.get('/check/:type/:id', 
    favoriController.checkFavori.bind(favoriController)
  );

  // Ajouter un favori
  router.post('/', 
    addFavoriValidation,
    validationMiddleware.handleValidationErrors,
    favoriController.addFavori.bind(favoriController)
  );

  // Supprimer un favori par ID
  router.delete('/:id', 
    validationMiddleware.validateId('id'),
    favoriController.removeFavori.bind(favoriController)
  );

  // Supprimer un favori par type et ID d'entité
  router.delete('/:type/:id', 
    favoriController.removeFavoriByEntity.bind(favoriController)
  );

  console.log('✅ Routes favoris initialisées');

  return router;
};

module.exports = initFavoriRoutes;