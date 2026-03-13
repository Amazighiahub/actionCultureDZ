/**
 * PatrimoineControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class PatrimoineControllerV2 extends BaseController {
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
        message: req.t('patrimoine.created'),
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
        message: req.t('patrimoine.updated'),
        data: site.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.patrimoineService.delete(parseInt(req.params.id));
      res.json({ success: true, message: req.t('patrimoine.deleted') });
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
    try {
      const siteId = req.params.id;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const qrUrl = `${baseUrl}/patrimoine/${siteId}`;
      res.json({ success: true, data: { url: qrUrl, qr_data: qrUrl } });
    } catch (error) { this._handleError(res, error); }
  }

  // ============================================================================
  // ROUTES MOBILE
  // ============================================================================

  async getMobileNearby(req, res) {
    try {
      const { latitude, longitude, rayon = 20 } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidData') : 'latitude et longitude requis'
        });
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
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async scanQRCode(req, res) {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidData') : 'code requis'
        });
      }
      const id = parseInt(code, 10);
      if (isNaN(id)) {
        return res.status(404).json({ success: false, error: req.t ? req.t('patrimoine.notFound') : 'Code QR invalide' });
      }
      const site = await this.patrimoineService.findWithFullDetails(id);
      res.json({ success: true, data: site.toDetailJSON(req.lang) });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMobileOffline(req, res) {
    try {
      const wilayaId = parseInt(req.params.wilayaId, 10);
      if (isNaN(wilayaId)) {
        return res.status(400).json({ success: false, error: req.t ? req.t('validation.invalidData') : 'wilayaId invalide' });
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
    } catch (error) {
      this._handleError(res, error);
    }
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
    try {
      const { note } = req.body;
      const siteId = parseInt(req.params.id);
      if (!note || note < 1 || note > 5) {
        return res.status(400).json({ success: false, error: req.t('validation.invalidData') });
      }
      const models = this.patrimoineService.models;
      const detailLieu = await models.DetailLieu.findOne({ where: { id_lieu: siteId } });
      if (!detailLieu) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      const currentNote = detailLieu.noteMoyenne || 0;
      const newNote = currentNote === 0 ? note : (currentNote + note) / 2;
      await detailLieu.update({ noteMoyenne: Math.round(newNote * 10) / 10 });
      res.json({ success: true, data: { noteMoyenne: detailLieu.noteMoyenne } });
    } catch (error) { this._handleError(res, error); }
  }

  async ajouterFavoris(req, res) {
    try {
      const siteId = parseInt(req.params.id);
      const userId = req.user.id_user;
      const models = this.patrimoineService.models;
      const [favori, created] = await models.Favori.findOrCreate({
        where: { id_user: userId, type_entite: 'patrimoine', id_entite: siteId },
        defaults: { id_user: userId, type_entite: 'patrimoine', id_entite: siteId }
      });
      res.json({ success: true, data: favori, message: created ? req.t('favori.added') : req.t('favori.alreadyExists') });
    } catch (error) { this._handleError(res, error); }
  }

  async retirerFavoris(req, res) {
    try {
      const siteId = parseInt(req.params.id);
      const userId = req.user.id_user;
      const models = this.patrimoineService.models;
      const deleted = await models.Favori.destroy({
        where: { id_user: userId, type_entite: 'patrimoine', id_entite: siteId }
      });
      res.json({ success: true, message: deleted ? req.t('favori.removed') : req.t('common.notFound') });
    } catch (error) { this._handleError(res, error); }
  }

  async uploadMedias(req, res) {
    try {
      const siteId = parseInt(req.params.id);
      const models = this.patrimoineService.models;
      const lieu = await models.Lieu.findByPk(siteId);
      if (!lieu) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: req.t('upload.noFile') });
      }
      const medias = await Promise.all(req.files.map(async (file) => {
        return models.LieuMedia.create({
          id_lieu: siteId,
          type: file.mimetype.startsWith('image') ? 'image' : 'document',
          url: `/uploads/${file.filename}`,
          description: {}
        });
      }));
      res.json({ success: true, data: medias });
    } catch (error) { this._handleError(res, error); }
  }

  async deleteMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const models = this.patrimoineService.models;
      const media = await models.LieuMedia.findByPk(parseInt(mediaId));
      if (!media) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      await media.destroy();
      res.json({ success: true, message: req.t('common.deleted') });
    } catch (error) { this._handleError(res, error); }
  }

  async updateHoraires(req, res) {
    res.status(501).json({ success: false, error: req.t('common.notImplemented') });
  }

}

module.exports = new PatrimoineControllerV2();
