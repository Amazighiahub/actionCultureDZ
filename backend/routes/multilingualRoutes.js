/**
 * Routes multilingues - Traductions et langues supportées
 */
const express = require('express');
const router = express.Router();
const MultilingualController = require('../controllers/multilingualController');
const createAuthMiddleware = require('../middlewares/authMiddleware');

const initMultilingualRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const controller = new MultilingualController();

  // GET /multilingual/supported - Langues supportées (public)
  router.get('/supported', controller.getSupportedLanguages.bind(controller));

  // GET /multilingual/translations/:model/:id/:field - Obtenir une traduction
  router.get(
    '/translations/:model/:id/:field',
    controller.getTranslations.bind(controller)
  );

  // PUT /multilingual/translations/:model/:id/:field - Mettre à jour (admin requis)
  router.put(
    '/translations/:model/:id/:field',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    controller.updateTranslations.bind(controller)
  );

  return router;
};

module.exports = initMultilingualRoutes;
