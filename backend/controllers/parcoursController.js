/**
 * ParcoursControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const container = require('../services/serviceContainer');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class ParcoursControllerV2 {
  get parcoursService() {
    return container.parcoursService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 20, theme, difficulte } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };

      let result;
      if (theme) {
        result = await this.parcoursService.findByTheme(theme, options);
      } else if (difficulte) {
        result = await this.parcoursService.findByDifficulte(difficulte, options);
      } else {
        result = await this.parcoursService.findActive(options);
      }

      res.json({
        success: true,
        data: result.data.map(p => p.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.parcoursService.search(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(p => p.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const parcours = await this.parcoursService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMap(req, res) {
    try {
      const parcours = await this.parcoursService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: parcours.toMapJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyParcours(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.parcoursService.findByCreateur(req.user.id_user, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(p => p.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const parcours = await this.parcoursService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: req.t('parcours.created'),
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const parcours = await this.parcoursService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('parcours.updated'),
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.parcoursService.delete(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, message: req.t('parcours.deleted') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // GESTION DES ÉTAPES
  // ============================================================================

  async addEtape(req, res) {
    try {
      const parcours = await this.parcoursService.addEtape(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.status(201).json({
        success: true,
        message: req.t('parcours.stepAdded'),
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async removeEtape(req, res) {
    try {
      const parcours = await this.parcoursService.removeEtape(
        parseInt(req.params.id),
        parseInt(req.params.etapeId),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('parcours.stepRemoved'),
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reorderEtapes(req, res) {
    try {
      const { orderedIds } = req.body;
      const parcours = await this.parcoursService.reorderEtapes(
        parseInt(req.params.id),
        orderedIds,
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('parcours.stepsReordered'),
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async listAll(req, res) {
    try {
      const { page = 1, limit = 20, statut } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };
      if (statut) options.where = { statut };

      const result = await this.parcoursService.findAll(options);
      res.json({
        success: true,
        data: result.data.map(p => p.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async activate(req, res) {
    try {
      const parcours = await this.parcoursService.activate(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('parcours.activated'),
        data: parcours.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async deactivate(req, res) {
    try {
      const parcours = await this.parcoursService.deactivate(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('parcours.deactivated'),
        data: parcours.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.parcoursService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PARCOURS PERSONNALISÉ (avec services)
  // ============================================================================

  async personnalise(req, res) {
    try {
      const {
        latitude, longitude, interests = [], duration = 240,
        transport = 'voiture', maxSites = 5,
        includeRestaurants = false, includeHotels = false
      } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, error: req.t('parcours.gpsRequired') });
      }

      const data = await this.parcoursService.generatePersonnalise({
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        interests,
        duration: parseInt(duration),
        transport,
        maxSites: parseInt(maxSites),
        includeRestaurants: !!includeRestaurants,
        includeHotels: !!includeHotels
      });

      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _handleError(res, error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    if (IS_DEV_MODE) {
      console.error(`❌ Error [${code}]:`, error.message);
      if (statusCode === 500) console.error(error.stack);
    }

    const response = { success: false, error: error.message || 'Internal server error', code };
    if (error.errors) response.errors = error.errors;
    if (IS_DEV_MODE && statusCode === 500) response.stack = error.stack;

    res.status(statusCode).json(response);
  }
}

module.exports = new ParcoursControllerV2();
