/**
 * Routes API v2 - Point d'entrée
 *
 * Architecture: Controller → Service → Repository
 *
 * Ces routes utilisent le nouveau pattern avec:
 * - DTOs pour la transformation des données
 * - Services pour la logique métier
 * - Repositories pour l'accès aux données
 */

const express = require('express');

// Import des routes v2
const initUserRoutesV2 = require('./userRoutes');
const initOeuvreRoutesV2 = require('./oeuvreRoutes');

const initRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  router.use('/users', initUserRoutesV2(models, authMiddleware));
  router.use('/oeuvres', initOeuvreRoutesV2(models, authMiddleware));

// Montage des routes
  router.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'API EventCulture v2',
      version: '2.0.0',
      architecture: 'Controller → Service → Repository → Database',
      features: [
        'DTOs pour transformation robuste des données',
        'Services pour logique métier',
        'Repositories pour accès données optimisé',
        'Support multilingue complet (fr, ar, en, tz-ltn, tz-tfng)'
      ],
      endpoints: {
        users: '/api/v2/users',
        oeuvres: '/api/v2/oeuvres'
      }
    });
  });

  return router;
};

module.exports = initRoutesV2;
