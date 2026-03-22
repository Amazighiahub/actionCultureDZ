/**
 * searchRoutes.js - Routes pour la recherche globale
 * Extrait de app.js pour respecter la séparation des responsabilités.
 */
const express = require('express');
const router = express.Router();

const initSearchRoutes = (models, authMiddleware) => {
  const searchController = require('../controllers/searchController');

  // Recherche globale
  router.get('/',
    authMiddleware.isAuthenticated,
    (req, res) => searchController.globalSearch(req, res)
  );

  // Suggestions de recherche
  router.get('/suggestions',
    authMiddleware.isAuthenticated,
    (req, res) => searchController.suggestions(req, res)
  );

  return router;
};

module.exports = initSearchRoutes;
