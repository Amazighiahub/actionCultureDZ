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
const router = express.Router();

// Import des routes v2
const userRoutes = require('./userRoutes');
const oeuvreRoutes = require('./oeuvreRoutes');

// Montage des routes
router.use('/users', userRoutes);
router.use('/oeuvres', oeuvreRoutes);

// Route d'information sur l'API v2
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

module.exports = router;
