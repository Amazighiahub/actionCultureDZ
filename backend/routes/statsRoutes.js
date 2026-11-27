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
    // Gardé 5 min sur le serveur, par langue : la page la plus vue relisait la base à chaque visiteur (analyse V12 P1)
    require('../middlewares/cacheMiddleware').conditionalCache(300),
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

  // « Ne pas mettre à l'accueil » : l'équipe écarte une photo de l'accueil, ou l'y remet.
  // Le contenu reste publié sur sa page. Administration et modération seulement.
  const equipe = [authMiddleware.authenticate, authMiddleware.requireRole('Administrateur', 'Moderateur')];
  const asyncHandler = require('../utils/asyncHandler');
  router.get('/a-la-une/exclusions', ...equipe, asyncHandler(async (req, res) => {
    const { exclusions } = require('../services/aLaUne');
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await exclusions(models, req.lang || 'fr') });
  }));
  router.patch('/a-la-une/exclusion', ...equipe, asyncHandler(async (req, res) => {
    const { exclure } = require('../services/aLaUne');
    const { type, id, exclu } = req.body || {};
    const ok = await exclure(models, String(type || ''), Number(id), exclu !== false);
    if (!ok) return res.status(404).json({ success: false, error: req.t('common.notFound') });
    res.json({ success: true });
  }));

  return router;
};

module.exports = initStatsRoutes;
