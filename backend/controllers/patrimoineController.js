/**
 * PatrimoineController - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const { mergeTranslations } = require('../helpers/i18n');
const { nomsSimilaires, textesNom } = require('../utils/nomLieu');

// Champs qu'un créateur (professionnel) peut modifier sur son site
const CHAMPS_MODIFIABLES_CREATEUR = ['nom', 'adresse', 'typePatrimoine', 'latitude', 'longitude', 'description', 'histoire', 'horaires', 'referencesHistoriques', 'repere'];

class PatrimoineController extends BaseController {
  get patrimoineService() {
    return container.patrimoineService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { typePatrimoine, wilayaId } = req.query;
      const { page, limit } = this._paginate(req);
      const result = await this.patrimoineService.findAllSites({
        page,
        limit,
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
      const { typePatrimoine } = req.query;
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 6));
      const sites = await this.patrimoineService.findPopular({ limit, typePatrimoine });
      const data = sites.map(s => s.toCardJSON(req.lang));
      res.json({ success: true, data, count: sites.length });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q } = req.query;
      const { page, limit } = this._paginate(req);
      const result = await this.patrimoineService.search(q, { page, limit });
      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Site chargé par son id, ou null s'il n'est pas public (brouillon, archivé) et que le
   * visiteur n'en est ni le créateur ni modérateur : on répond alors 404, comme pour un
   * site inexistant (taper un numéro ne doit pas révéler un site non publié).
   */
  async _findVisibleSite(req) {
    const site = await this.patrimoineService.findWithFullDetails(parseInt(req.params.id));
    const raw = site?._raw || site;
    if (raw && raw.statut && raw.statut !== 'publie' && !this._canSeeUnpublished(req, raw.id_createur)) {
      return null;
    }
    return site;
  }

  _notFound(req, res) {
    return res.status(404).json({ success: false, error: req.t('common.notFound') });
  }

  async getById(req, res) {
    try {
      const site = await this._findVisibleSite(req);
      if (!site) return this._notFound(req, res);
      res.json({ success: true, data: site.toDetailJSON(req.lang) });
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
      res.json({ success: true, data: sites.map(s => s.toMapJSON(req.lang)) });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // Vérifier si un site existe déjà (nom + commune)
  async checkDuplicate(req, res) {
    try {
      const { nom, communeId } = req.query;
      if (!nom || !communeId) {
        return res.json({ success: true, data: { exists: false } });
      }

      // 🔒 Validation des paramètres : type, longueur, NaN
      if (typeof nom !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre "nom" doit être une chaîne de caractères',
          code: 'INVALID_PARAM'
        });
      }
      const search = String(nom).trim();
      if (search.length === 0 || search.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre "nom" doit faire entre 1 et 200 caractères',
          code: 'INVALID_PARAM'
        });
      }

      const communeIdInt = parseInt(communeId, 10);
      if (isNaN(communeIdInt) || communeIdInt <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre "communeId" doit être un entier positif',
          code: 'INVALID_PARAM'
        });
      }

      // Lieux principaux de la commune (colonne indexée), comparés ici : accents, casse et mots
      // génériques ignorés. LOWER(JSON_EXTRACT(...)) gardait les guillemets JSON et ne trouvait
      // jamais rien (« COMMUNE AIT SMAIL » a été créé à côté de « Aït Smaïl »).
      const Lieu = this.patrimoineService.models.Lieu;
      const lieux = await Lieu.findAll({
        where: { communeId: communeIdInt, id_lieu_parent: null },
        attributes: ['id_lieu', 'nom', 'typePatrimoine'],
        limit: 500
      });
      const existing = lieux
        .filter(l => textesNom(l.nom).some(texte => nomsSimilaires(texte, search)))
        .slice(0, 5);
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
    const site = await this.patrimoineService.create(req.body, { isModerator: req.user?.isAdmin === true || req.user?.isModerateur === true });
    res.status(201).json({
      success: true,
      message: req.t('patrimoine.created'),
      data: site.toDetailJSON ? site.toDetailJSON(req.lang) : site
    });
  }

  /** Modération (administrateur ou modérateur) */
  _estModeration(req) {
    return req.user?.isAdmin === true || req.user?.isModerateur === true;
  }

  /** 403 si le compte ne peut pas modifier ce site (ni modération, ni créateur) ; true si autorisé */
  async _verifierDroitModification(req, res) {
    const ok = await this.patrimoineService.peutModifier(parseInt(req.params.id), {
      userId: req.user?.id_user, isModerator: this._estModeration(req)
    });
    if (!ok) {
      res.status(403).json({
        success: false,
        error: req.t('patrimoine.editForbidden', 'Seuls le créateur du site et la modération peuvent le modifier.')
      });
    }
    return ok;
  }

  /** Nouvelle personnalité du site (fiche créée et rattachée) */
  async creerPersonnalite(req, res) {
    const lien = await this.patrimoineService.creerPersonnalite(parseInt(req.params.id, 10), req.body, { userId: req.user.id_user });
    res.status(201).json({ success: true, data: lien });
  }

  /** Retirer une personnalité du site (modération, contributeur ou créateur du site) */
  async retirerPersonnalite(req, res) {
    const resultat = await this.patrimoineService.retirerPersonnalite(
      parseInt(req.params.id, 10), parseInt(req.params.lieuIntervenantId, 10),
      { userId: req.user.id_user, isModerator: this._estModeration(req) }
    );
    if (resultat === 'introuvable') return res.status(404).json({ success: false, error: req.t('common.notFound') });
    if (resultat === 'interdit') {
      return res.status(403).json({ success: false, error: req.t('patrimoine.personnaliteForbidden', 'Seuls la personne qui l’a ajoutée, le créateur du site et la modération peuvent la retirer.') });
    }
    res.json({ success: true });
  }

  /** Pages détaillées du site (articles reliés à ses sections) */
  async pagesDetaillees(req, res) {
    const pages = await this.patrimoineService.pagesDetaillees(parseInt(req.params.id, 10), {
      userId: req.user?.id_user || null, isModerator: this._estModeration(req)
    });
    res.json({ success: true, data: pages });
  }

  /** Derniers articles publiés (« À lire » de la page d'accueil) : ?limit=4 */
  async aLire(req, res) {
    res.json({ success: true, data: await this.patrimoineService.aLire(parseInt(req.query.limit, 10) || 4) });
  }

  /** Plats de la page Gastronomie : ?wilaya=16&q=rechta */
  async plats(req, res) {
    const wilaya = parseInt(req.query.wilaya, 10) || null;
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
    res.json({ success: true, data: await this.patrimoineService.plats({ wilaya, q }) });
  }

  /** Lieux et personnalités auxquels un article est relié (fil de la page de l'article) */
  async contexteArticle(req, res) {
    const contexte = await this.patrimoineService.contexteArticle(parseInt(req.params.idOeuvre, 10));
    res.json({ success: true, data: contexte });
  }

  /** Relier un article (éditeur avancé) à une section du site */
  async lierPage(req, res) {
    const lien = await this.patrimoineService.lierPage(parseInt(req.params.id, 10), {
      id_oeuvre: parseInt(req.body.id_oeuvre, 10), section_patrimoine: req.body.section_patrimoine
    }, { userId: req.user.id_user, isModerator: this._estModeration(req) });
    res.status(201).json({ success: true, data: lien });
  }

  /** Retirer une page détaillée (modération, la personne qui l'a reliée ou le créateur du site) */
  async retirerPage(req, res) {
    const resultat = await this.patrimoineService.retirerPage(
      parseInt(req.params.id, 10), parseInt(req.params.lieuOeuvreId, 10),
      { userId: req.user.id_user, isModerator: this._estModeration(req) }
    );
    if (resultat === 'introuvable') return res.status(404).json({ success: false, error: req.t('common.notFound') });
    if (resultat === 'interdit') {
      return res.status(403).json({ success: false, error: req.t('patrimoine.pageForbidden', 'Seuls la personne qui l’a ajoutée, le créateur du site et la modération peuvent la retirer.') });
    }
    res.json({ success: true });
  }

  /** Sites et points de visite créés par le compte connecté (tous statuts) */
  async mesSites(req, res) {
    const { page, limit } = this._paginate(req);
    const result = await this.patrimoineService.findAllSites({ page, limit, createurId: req.user.id_user });
    res.json({ success: true, data: result.data.map(s => s.toCardJSON(req.lang)), pagination: result.pagination });
  }

  async update(req, res) {
    if (!(await this._verifierDroitModification(req, res))) return;
    // Le créateur modifie la fiche du site ; le rattachement, l'ordre de visite et les listes
    // (monuments, services, médias) restent à la modération
    let donnees = req.body;
    if (!this._estModeration(req)) {
      donnees = {};
      for (const champ of CHAMPS_MODIFIABLES_CREATEUR) {
        if (req.body[champ] !== undefined) donnees[champ] = req.body[champ];
      }
    }
    const site = await this.patrimoineService.update(parseInt(req.params.id), donnees);
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
    const site = await this._findVisibleSite(req);
    if (!site) return this._notFound(req, res);
    const data = site.toDetailJSON(req.lang);
    res.json({ success: true, data: data.Medias || data.medias || [] });
  }

  async getCarteVisite(req, res) {
    const site = await this._findVisibleSite(req);
    if (!site) return this._notFound(req, res);
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

      // Trouver ou créer le DetailLieu
      const models = container.patrimoineService.models;
      let detail = await models.DetailLieu.findOne({ where: { id_lieu: lieuId } });

      // Filtrer seulement les champs autorisés ; les langues sont fusionnées : une contribution
      // dans une langue ne doit pas effacer les autres traductions de la section
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = mergeTranslations(detail?.[field], req.body[field]);
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour' });
      }

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
        logger.error('Erreur notification contribution:', { message: notifErr.message });
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
    const data = await this.patrimoineService.noter(siteId, note, req.user.id_user);
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
    // langue : celle des enregistrements audio envoyés (champ texte du formulaire)
    const medias = await this.patrimoineService.uploadMedias(siteId, req.files, { langue: req.body?.langue || undefined });
    res.json({ success: true, data: medias });
  }

  async reordonnerPoints(req, res) {
    const points = await this.patrimoineService.reordonnerPoints(parseInt(req.params.id), req.body.ordre, {
      userId: req.user.id_user,
      isModerator: req.user?.isAdmin === true || req.user?.isModerateur === true
    });
    res.json({ success: true, data: points });
  }

  // Relevé Excel de points de visite (modèle Taladz), réservé à la modération
  async apercuReleve(req, res) {
    const parentId = req.body?.parentId ? parseInt(req.body.parentId, 10) : null;
    const apercu = await this.patrimoineService.apercuReleve(req.file.buffer, { parentId });
    res.json({ success: true, data: apercu });
  }

  async importerReleve(req, res) {
    const parentId = req.body?.parentId ? parseInt(req.body.parentId, 10) : null;
    const bilan = await this.patrimoineService.importerReleve(req.file.buffer, { parentId, userId: req.user.id_user });
    res.json({ success: true, data: bilan });
  }

  async deleteMedia(req, res) {
    if (!(await this._verifierDroitModification(req, res))) return;
    const { id, mediaId } = req.params;
    await this.patrimoineService.deleteMedia(id, mediaId);
    res.json({ success: true, message: req.t('common.deleted') });
  }

  async updateHoraires(req, res) {
    res.status(501).json({ success: false, error: req.t('common.notImplemented') });
  }

}

module.exports = new PatrimoineController();
