/**
 * ServiceControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const container = require('../services/serviceContainer');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class ServiceControllerV2 {
  get serviceService() {
    return container.serviceService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 20, type, lieu } = req.query;
      const result = await this.serviceService.findValidated({
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        lieuId: lieu
      });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.serviceService.search(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const service = await this.serviceService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: service.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getByLieu(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.serviceService.findByLieu(parseInt(req.params.lieuId), {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyServices(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.serviceService.findByProfessionnel(req.user.id_user, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const service = await this.serviceService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: req.t('service.created'),
        data: service.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const service = await this.serviceService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('service.updated'),
        data: service.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.serviceService.delete(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, message: req.t('service.deleted') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async getPending(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.serviceService.findPending({
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(s => s.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validate(req, res) {
    try {
      const service = await this.serviceService.validate(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('service.validated'),
        data: service.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reject(req, res) {
    try {
      const { motif } = req.body;
      const service = await this.serviceService.reject(
        parseInt(req.params.id),
        req.user.id_user,
        motif
      );
      res.json({
        success: true,
        message: req.t('service.rejected'),
        data: service.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.serviceService.getStats();
      res.json({ success: true, data: stats });
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

module.exports = new ServiceControllerV2();
