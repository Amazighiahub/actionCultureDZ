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
    // Page sans paramètres : la clé de cache les ignore (adresses inventées ≠ nouvelles entrées)
    cacheMiddleware = cache.conditionalCache ? cache.conditionalCache(300, { sansParametres: true }) : (req, res, next) => next();
  } catch (e) {
    cacheMiddleware = (req, res, next) => next();
  }

  // Statistiques publiques (page d'accueil / hero section)
  router.get('/public',
    cacheMiddleware,
    (req, res) => statsController.getPublicStats(req, res)
  );

  // « À la une » de l'accueil : photos des contributeurs (lieux, œuvres, articles, événement à venir).
  // La langue est dans l'adresse (?lang=) : un cache public par langue, 10 minutes.
  router.get('/a-la-une',
    require('../middlewares/cacheMiddleware').publicHttpCache(600),
    async (req, res) => {
      try {
        const { aLaUne } = require('../services/aLaUne');
        const lang = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'].includes(req.query.lang) ? req.query.lang : 'fr';
        res.json({ success: true, data: await aLaUne(models, lang) });
      } catch (e) {
        // L'accueil garde ses paysages : jamais d'erreur visible pour cette vitrine
        require('../utils/logger').warn(`À la une indisponible : ${e.message}`);
        res.json({ success: true, data: [] });
      }
    });

  return router;
};

module.exports = initStatsRoutes;
