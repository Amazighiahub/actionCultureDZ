/**
 * SearchController - Controller pour la recherche globale
 * Extrait de app.js pour respecter la séparation des responsabilités.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class SearchController extends BaseController {
  constructor() {
    super();
    this._searchService = null;
  }

  _getSearchService() {
    if (!this._searchService) {
      const SearchService = require('../services/searchService');
      const models = container._models || require('../models');
      this._searchService = new SearchService(models);
    }
    return this._searchService;
  }

  /**
   * Recherche globale multi-entités
   */
  async globalSearch(req, res) {
    try {
      const { q, types, limit, page } = req.query;
      const config = require('../config/envAdapter').getConfig();
      const minLength = config.limits?.minSearchLength || 2;

      if (!q || q.trim().length < minLength) {
        return res.status(400).json({
          success: false,
          error: req.t('search.minLength', { min: minLength })
        });
      }

      const searchService = this._getSearchService();

      const results = await searchService.globalSearch(q.trim(), {
        types: types ? types.split(',') : undefined,
        limit: limit ? parseInt(limit) : config.limits?.defaultPageSize || 20,
        page: page ? parseInt(page) : 1,
        userId: req.user?.id_user,
        lang: req.lang
      });

      res.json(results);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Suggestions de recherche (autocomplétion)
   */
  async suggestions(req, res) {
    try {
      const { q, limit } = req.query;

      if (!q || q.trim().length < 1) {
        return res.json({ success: true, suggestions: [] });
      }

      const searchService = this._getSearchService();

      const results = await searchService.getSuggestions(
        q.trim(),
        limit ? parseInt(limit) : 5,
        req.lang
      );

      res.json(results);
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new SearchController();
