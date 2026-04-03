/**
 * PatrimoineController - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const QRCode = require('qrcode');

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

  // Vérifier si un site existe déjà (nom + commune)
  async checkDuplicate(req, res) {
    try {
      const { nom, communeId } = req.query;
      if (!nom || !communeId) {
        return res.json({ success: true, data: { exists: false } });
      }
      const { Sequelize } = require('sequelize');
      const Lieu = this.patrimoineService.models.Lieu;
      const search = String(nom).trim();
      const existing = await Lieu.findAll({
        where: {
          communeId: parseInt(communeId),
          [Sequelize.Op.or]: [
            Sequelize.where(Sequelize.fn('LOWER', Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom'), Sequelize.literal("'$.fr'"))), search.toLowerCase()),
            Sequelize.where(Sequelize.fn('LOWER', Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom'), Sequelize.literal("'$.ar'"))), search.toLowerCase()),
          ]
        },
        attributes: ['id_lieu', 'nom', 'typePatrimoine'],
        limit: 5
      });
      res.json({
        success: true,
        data: {
          exists: existing.length > 0,
          sites: existing.map(s => ({ id_lieu: s.id_lieu, nom: s.nom, typePatrimoine: s.typePatrimoine }))
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES CREATION / MODIFICATION
  // ============================================================================

  async create(req, res) {
    // Ajouter l'id du créateur
    req.body.id_createur = req.user?.id_user;
    const site = await this.patrimoineService.create(req.body);
    res.status(201).json({
      success: true,
      message: req.t('patrimoine.created'),
      data: site.toDetailJSON ? site.toDetailJSON(req.lang) : site
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
    try {
      const siteId = parseInt(req.params.id);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const siteUrl = `${baseUrl}/patrimoine/${siteId}`;

      const { format = 'dataurl', size = 300 } = req.query;
      const qrSize = Math.min(Math.max(parseInt(size) || 300, 100), 1000);

      if (format === 'svg') {
        const svg = await QRCode.toString(siteUrl, { type: 'svg', width: qrSize, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(svg);
      }

      if (format === 'png') {
        const buffer = await QRCode.toBuffer(siteUrl, { width: qrSize, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('Content-Disposition', `inline; filename="patrimoine-${siteId}-qr.png"`);
        return res.send(buffer);
      }

      // Default: data URL
      const dataUrl = await QRCode.toDataURL(siteUrl, { width: qrSize, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      res.set('Cache-Control', 'public, max-age=86400');
      res.json({ success: true, data: { qr_data_url: dataUrl, site_url: siteUrl, site_id: siteId } });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ENRICHISSEMENT COLLABORATIF
  // ============================================================================

  async enrichDetail(req, res) {
    try {
      const lieuId = parseInt(req.params.id);
      const userId = req.user?.id_user;
      const allowedFields = ['histoire', 'gastronomie', 'traditions', 'artisanat_local', 'personnalites', 'architecture', 'infos_pratiques', 'referencesHistoriques', 'description', 'horaires'];

      // Filtrer seulement les champs autorisés
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour' });
      }

      // Trouver ou créer le DetailLieu
      const models = container.patrimoineService.models;
      let detail = await models.DetailLieu.findOne({ where: { id_lieu: lieuId } });

      if (!detail) {
        detail = await models.DetailLieu.create({ id_lieu: lieuId, ...updates, id_dernier_contributeur: userId, date_derniere_contribution: new Date(), nb_contributions: 1 });
      } else {
        await detail.update({ ...updates, id_dernier_contributeur: userId, date_derniere_contribution: new Date(), nb_contributions: (detail.nb_contributions || 0) + 1 });
      }

      // Notifier le créateur du lieu
      try {
        const lieu = await models.Lieu.findByPk(lieuId, { attributes: ['id_createur', 'nom'] });
        if (lieu?.id_createur && lieu.id_createur !== userId && models.Notification) {
          const nomLieu = typeof lieu.nom === 'object' ? (lieu.nom.fr || lieu.nom.ar || '') : lieu.nom;
          await models.Notification.create({
            id_user: lieu.id_createur,
            type_notification: 'autre',
            titre: 'Nouvelle contribution',
            message: `Un utilisateur a enrichi la section de "${nomLieu}"`,
            url_action: `/patrimoine/${lieuId}`,
            lu: false,
          });
        }
      } catch (notifErr) {
        console.error('Erreur notification contribution:', notifErr.message);
      }

      res.json({ success: true, data: detail, message: 'Contribution enregistrée' });
    } catch (error) {
      this._handleError(res, error);
    }
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
