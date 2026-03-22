/**
 * statsRoutes.js - Routes pour les statistiques publiques
 * Extrait de routes/index.js pour respecter la séparation des responsabilités.
 */
const express = require('express');
const router = express.Router();

const initStatsRoutes = (models, authMiddleware) => {
  const statsController = require('../controllers/statsController');

  // Charger le cache middleware avec fallback
  let cacheMiddleware;
  try {
    const cache = require('../middlewares/cacheMiddleware');
    cacheMiddleware = cache.cacheStrategy ? cache.cacheStrategy.medium : (req, res, next) => next();
  } catch (e) {
    cacheMiddleware = (req, res, next) => next();
  }

  // Statistiques publiques (page d'accueil / hero section)
  router.get('/public',
    cacheMiddleware,
    (req, res) => statsController.getPublicStats(req, res)
  );

  return router;
};

module.exports = initStatsRoutes;
