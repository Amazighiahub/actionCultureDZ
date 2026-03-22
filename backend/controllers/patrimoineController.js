/**
 * PatrimoineController - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class PatrimoineController extends BaseController {
  get patrimoineService() {
    return container.patrimoineService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
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
  }

  async popular(req, res) {
    const { limit = 6, typePatrimoine } = req.query;
    console.log('[DEBUG popular] START', { limit, typePatrimoine });
    const t0 = Date.now();
    const sites = await this.patrimoineService.findPopular({
      limit: parseInt(limit),
      typePatrimoine
    });
    console.log('[DEBUG popular] service done in', Date.now() - t0, 'ms, sites:', sites.length);
    const data = sites.map(s => s.toCardJSON(req.lang));
    console.log('[DEBUG popular] toCardJSON done in', Date.now() - t0, 'ms');

    res.json({
      success: true,
      data,
      count: sites.length
    });
    console.log('[DEBUG popular] response sent in', Date.now() - t0, 'ms');
  }

  async search(req, res) {
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
  }

  async getById(req, res) {
    const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
    res.json({
      success: true,
      data: site.toDetailJSON(req.lang)
    });
  }

  async getMap(req, res) {
    const { typePatrimoine, wilayaId } = req.query;
    const sites = await this.patrimoineService.findForMap({
      typePatrimoine,
      wilayaId: wilayaId ? parseInt(wilayaId) : null
    });

    res.json({
      success: true,
      data: sites.map(s => s.toMapJSON(req.lang))
    });
  }

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  async create(req, res) {
    const site = await this.patrimoineService.create(req.body);
    res.status(201).json({
      success: true,
      message: req.t('patrimoine.created'),
      data: site.toDetailJSON(req.lang)
    });
  }

  async update(req, res) {
    const site = await this.patrimoineService.update(parseInt(req.params.id), req.body);
    res.json({
      success: true,
      message: req.t('patrimoine.updated'),
      data: site.toDetailJSON(req.lang)
    });
  }

  async delete(req, res) {
    await this.patrimoineService.delete(parseInt(req.params.id));
    res.json({ success: true, message: req.t('patrimoine.deleted') });
  }

  async getStats(req, res) {
    const stats = await this.patrimoineService.getStats();
    res.json({ success: true, data: stats });
  }

  async getTypes(req, res) {
    const types = await this.patrimoineService.getTypes();
    res.json({ success: true, data: types });
  }

  async getByType(req, res) {
    const result = await this.patrimoineService.findAllSites({ typePatrimoine: req.params.type, page: 1, limit: 50 });
    res.json({ success: true, data: result.data.map(s => s.toCardJSON(req.lang)), pagination: result.pagination });
  }

  async getGalerie(req, res) {
    const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
    const data = site.toDetailJSON(req.lang);
    res.json({ success: true, data: data.Medias || data.medias || [] });
  }

  async getCarteVisite(req, res) {
    const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
    const data = site.toDetailJSON(req.lang);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({ success: true, data: { site: data, qr_code: `${baseUrl}/patrimoine/${req.params.id}`, url_partage: `${baseUrl}/patrimoine/${req.params.id}` } });
  }

  async getQRCode(req, res) {
    const siteId = req.params.id;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrUrl = `${baseUrl}/patrimoine/${siteId}`;
    res.json({ success: true, data: { url: qrUrl, qr_data: qrUrl } });
  }

  // ============================================================================
  // ROUTES MOBILE
  // ============================================================================

  async getMobileNearby(req, res) {
    const { latitude, longitude, rayon = 20 } = req.query;
    const AppError = require('../utils/appError');
    if (!latitude || !longitude) {
      throw AppError.badRequest('latitude et longitude requis');
    }
    const sites = await this.patrimoineService.findForMap({});
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(rayon) || 20;
    const filtered = sites.filter(s => {
      const d = this._haversine(lat, lon, s.latitude || 0, s.longitude || 0);
      return d <= radiusKm;
    }).slice(0, 20);
    res.json({
      success: true,
      data: {
        sites: filtered.map(s => s.toCardJSON ? s.toCardJSON(req.lang) : s),
        parcours_suggeres: []
      }
    });
  }

  async scanQRCode(req, res) {
    const AppError = require('../utils/appError');
    const { code } = req.body;
    if (!code) {
      throw AppError.badRequest('code requis');
    }
    const id = parseInt(code, 10);
    if (isNaN(id)) {
      throw AppError.notFound('Site patrimoine');
    }
    const site = await this.patrimoineService.findWithFullDetails(id);
    res.json({ success: true, data: site.toDetailJSON(req.lang) });
  }

  async getMobileOffline(req, res) {
    const AppError = require('../utils/appError');
    const wilayaId = parseInt(req.params.wilayaId, 10);
    if (isNaN(wilayaId)) {
      throw AppError.badRequest('wilayaId invalide');
    }
    const result = await this.patrimoineService.findAllSites({
      wilayaId,
      page: 1,
      limit: 500
    });
    res.json({
      success: true,
      data: {
        sites: result.data.map(s => s.toCardJSON ? s.toCardJSON(req.lang) : s),
        parcours: [],
        wilaya_id: wilayaId,
        last_update: new Date().toISOString(),
        version: '1.0'
      }
    });
  }

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async noter(req, res) {
    const { note } = req.body;
    const siteId = parseInt(req.params.id);
    const data = await this.patrimoineService.noter(siteId, note);
    res.json({ success: true, data });
  }

  async ajouterFavoris(req, res) {
    const siteId = parseInt(req.params.id);
    const userId = req.user.id_user;
    const result = await this.patrimoineService.ajouterFavoris(siteId, userId);
    res.json({ success: true, data: result.favori, message: result.created ? req.t('favori.added') : req.t('favori.alreadyExists') });
  }

  async retirerFavoris(req, res) {
    const siteId = parseInt(req.params.id);
    const userId = req.user.id_user;
    const result = await this.patrimoineService.retirerFavoris(siteId, userId);
    res.json({ success: true, message: result.deleted ? req.t('favori.removed') : req.t('common.notFound') });
  }

  async uploadMedias(req, res) {
    const siteId = parseInt(req.params.id);
    const medias = await this.patrimoineService.uploadMedias(siteId, req.files);
    res.json({ success: true, data: medias });
  }

  async deleteMedia(req, res) {
    const { mediaId } = req.params;
    await this.patrimoineService.deleteMedia(mediaId);
    res.json({ success: true, message: req.t('common.deleted') });
  }

  async updateHoraires(req, res) {
    res.status(501).json({ success: false, error: req.t('common.notImplemented') });
  }

}

module.exports = new PatrimoineController();
