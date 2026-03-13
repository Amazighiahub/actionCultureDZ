/**
 * ArtisanatController - Controller refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class ArtisanatController extends BaseController {
  get artisanatService() {
    return container.artisanatService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page, limit } = this._paginate(req, { limit: 12 });
      const { materiau, technique, prix_min, prix_max, sort } = req.query;

      const result = await this.artisanatService.findPublished({
        page,
        limit,
        materiau: materiau ? parseInt(materiau) : null,
        technique: technique ? parseInt(technique) : null,
        prixMin: prix_min,
        prixMax: prix_max,
        sort
      });

      this._sendPaginated(res, result.data.map(a => a.toCardJSON(req.lang)), result.pagination);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const { q } = req.query;

      const result = await this.artisanatService.search(q, { page, limit });
      this._sendPaginated(res, result.data.map(a => a.toCardJSON(req.lang)), result.pagination);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const artisanat = await this.artisanatService.findWithFullDetails(parseInt(req.params.id));
      this._sendSuccess(res, artisanat.toDetailJSON(req.lang));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyArtisanats(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.artisanatService.findByArtisan(req.user.id_user, { page, limit });
      this._sendPaginated(res, result.data.map(a => a.toCardJSON(req.lang)), result.pagination);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const artisanat = await this.artisanatService.create(req.body, req.user.id_user);
      this._sendCreated(res, artisanat.toDetailJSON(req.lang), req.t('artisanat.created'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const artisanat = await this.artisanatService.update(parseInt(req.params.id), req.body);
      this._sendSuccess(res, artisanat.toDetailJSON(req.lang));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.artisanatService.delete(parseInt(req.params.id));
      this._sendMessage(res, req.t('artisanat.deleted'));
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
      this._sendSuccess(res, stats);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getArtisansByRegion(req, res) {
    try {
      const artisans = await this.artisanatService.getArtisansByRegion(parseInt(req.params.wilayaId));
      this._sendSuccess(res, artisans);
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
      this._sendSuccess(res, stats);
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new ArtisanatController();
