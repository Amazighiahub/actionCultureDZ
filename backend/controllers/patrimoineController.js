/**
 * PatrimoineControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const container = require('../services/serviceContainer');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class PatrimoineControllerV2 {
  get patrimoineService() {
    return container.patrimoineService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 20, typePatrimoine, wilayaId } = req.query;
      const result = await this.patrimoineService.findAllSites({
        page: parseInt(page),
        limit: parseInt(limit),
        typePatrimoine,
        wilayaId: wilayaId ? parseInt(wilayaId) : null
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

  async popular(req, res) {
    try {
      const { limit = 6, typePatrimoine } = req.query;
      const sites = await this.patrimoineService.findPopular({
        limit: parseInt(limit),
        typePatrimoine
      });

      res.json({
        success: true,
        data: sites.map(s => s.toCardJSON(req.lang)),
        count: sites.length
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.patrimoineService.search(q, {
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
      const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: site.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMap(req, res) {
    try {
      const { typePatrimoine, wilayaId } = req.query;
      const sites = await this.patrimoineService.findForMap({
        typePatrimoine,
        wilayaId: wilayaId ? parseInt(wilayaId) : null
      });

      res.json({
        success: true,
        data: sites.map(s => s.toMapJSON(req.lang))
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  async create(req, res) {
    try {
      const site = await this.patrimoineService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Site patrimonial créé avec succès',
        data: site.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const site = await this.patrimoineService.update(parseInt(req.params.id), req.body);
      res.json({
        success: true,
        message: 'Site mis à jour',
        data: site.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.patrimoineService.delete(parseInt(req.params.id));
      res.json({ success: true, message: 'Site supprimé' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.patrimoineService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypes(req, res) {
    try {
      const models = container.models;
      const types = await models.Lieu.findAll({
        attributes: ['typeLieu', [require('sequelize').fn('COUNT', require('sequelize').col('id_lieu')), 'count']],
        group: ['typeLieu'], raw: true
      });
      res.json({ success: true, data: types.map(t => ({ value: t.typeLieu, label: t.typeLieu, count: parseInt(t.count) })) });
    } catch (error) { this._handleError(res, error); }
  }

  async getByType(req, res) {
    try {
      const result = await this.patrimoineService.findAllSites({ typePatrimoine: req.params.type, page: 1, limit: 50 });
      res.json({ success: true, data: result.data.map(s => s.toCardJSON(req.lang)), pagination: result.pagination });
    } catch (error) { this._handleError(res, error); }
  }

  async getGalerie(req, res) {
    try {
      const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
      const data = site.toDetailJSON(req.lang);
      res.json({ success: true, data: data.Medias || data.medias || [] });
    } catch (error) { this._handleError(res, error); }
  }

  async getCarteVisite(req, res) {
    try {
      const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
      const data = site.toDetailJSON(req.lang);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.json({ success: true, data: { site: data, qr_code: `${baseUrl}/patrimoine/${req.params.id}`, url_partage: `${baseUrl}/patrimoine/${req.params.id}` } });
    } catch (error) { this._handleError(res, error); }
  }

  async getQRCode(req, res) {
    res.status(501).json({ success: false, error: 'QR Code generation not implemented' });
  }

  async noter(req, res) {
    res.status(501).json({ success: false, error: 'Notation non implémentée' });
  }

  async ajouterFavoris(req, res) {
    res.status(501).json({ success: false, error: 'Utilisez /api/favoris' });
  }

  async retirerFavoris(req, res) {
    res.status(501).json({ success: false, error: 'Utilisez /api/favoris' });
  }

  async uploadMedias(req, res) {
    res.status(501).json({ success: false, error: 'Upload médias patrimoine non implémenté' });
  }

  async deleteMedia(req, res) {
    res.status(501).json({ success: false, error: 'Suppression média patrimoine non implémentée' });
  }

  async updateHoraires(req, res) {
    res.status(501).json({ success: false, error: 'Mise à jour horaires non implémentée' });
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

    const response = { success: false, error: error.message || 'Erreur serveur', code };
    if (error.errors) response.errors = error.errors;
    if (IS_DEV_MODE && statusCode === 500) response.stack = error.stack;

    res.status(statusCode).json(response);
  }
}

module.exports = new PatrimoineControllerV2();
