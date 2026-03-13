/**
 * ArtisanatControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const container = require('../services/serviceContainer');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class ArtisanatControllerV2 {
  get artisanatService() {
    return container.artisanatService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 12, materiau, technique, prix_min, prix_max, sort } = req.query;
      const result = await this.artisanatService.findPublished({
        page: parseInt(page),
        limit: parseInt(limit),
        materiau: materiau ? parseInt(materiau) : null,
        technique: technique ? parseInt(technique) : null,
        prixMin: prix_min,
        prixMax: prix_max,
        sort
      });

      res.json({
        success: true,
        data: result.data.map(a => a.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.artisanatService.search(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(a => a.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const artisanat = await this.artisanatService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: artisanat.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyArtisanats(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.artisanatService.findByArtisan(req.user.id_user, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(a => a.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const artisanat = await this.artisanatService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: req.t('artisanat.created'),
        data: artisanat.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const artisanat = await this.artisanatService.update(parseInt(req.params.id), req.body);
      res.json({
        success: true,
        message: req.t('artisanat.updated'),
        data: artisanat.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.artisanatService.delete(parseInt(req.params.id));
      res.json({ success: true, message: req.t('artisanat.deleted') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // STATISTIQUES & ARTISANS PAR RÉGION
  // ============================================================================

  async getStatistics(req, res) {
    try {
      const stats = await this.artisanatService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getArtisansByRegion(req, res) {
    try {
      const { wilayaId } = req.params;
      const models = container.models;

      const artisans = await models.User.findAll({
        where: {
          wilaya_residence: parseInt(wilayaId),
          id_type_user: { [require('sequelize').Op.in]: [2, 3, 4, 5, 6, 7, 8] }
        },
        attributes: { exclude: ['password'] },
        include: [
          { model: models.TypeUser, attributes: ['nom_type'], required: false },
          { model: models.Wilaya, required: false }
        ]
      });

      res.json({ success: true, data: artisans });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async uploadMedias(req, res) {
    res.status(501).json({
      success: false,
      error: req.t('upload.multerRequired')
    });
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async getStats(req, res) {
    try {
      const stats = await this.artisanatService.getStats();
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

module.exports = new ArtisanatControllerV2();
