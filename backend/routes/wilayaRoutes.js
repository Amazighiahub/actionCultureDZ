/**
 * Page publique d'une wilaya : personnes, œuvres, événements, lieux et organisations.
 */
const express = require('express');
const { validateId } = require('../middlewares/validationMiddleware');
const { publicHttpCache } = require('../middlewares/cacheMiddleware');
const CacheManager = require('../utils/CacheManager');
const container = require('../services/serviceContainer');
const { vitrineWilaya } = require('../services/wilayaVitrine');
const logger = require('../utils/logger');

const cache = new CacheManager({ namespace: 'wilaya-vitrine', defaultTTL: 5 * 60 * 1000, maxSize: 58 });

const initWilayaRoutes = (models) => {
  const router = express.Router();

  router.get('/:id/vitrine', validateId(), publicHttpCache(180), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await cache.getOrSet(`v:${id}`, () => vitrineWilaya(models, id, container.organisationService));
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Page de wilaya :', { message: error.message });
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  });

  return router;
};

module.exports = initWilayaRoutes;
