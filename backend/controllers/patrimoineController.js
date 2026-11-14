/**
 * PatrimoineController - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const { estProValide } = require('../utils/droits');
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const QRCode = require('qrcode');
const LRUCache = require('../utils/LRUCache');
const { texteLisible } = require('../helpers/i18n');
const { nomsSimilaires, textesNom } = require('../utils/nomLieu');
const historique = require('../services/patrimoine/historiqueLieu');
const elements = require('../services/patrimoine/elementsLieu');
const propositions = require('../services/patrimoine/propositionsLieu');

// Champs qu'un créateur (professionnel) peut modifier sur son site
const CHAMPS_MODIFIABLES_CREATEUR = ['nom', 'adresse', 'typePatrimoine', 'latitude', 'longitude', 'description', 'histoire', 'horaires', 'referencesHistoriques', 'repere'];

const qrEnMemoire = new LRUCache(500);

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
      const { q, typePatrimoine } = req.query;
      const { page, limit } = this._paginate(req);
      const result = await this.patrimoineService.search(q, { page, limit, typePatrimoine });
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
  async _findVisibleSite(req, id = parseInt(req.params.id)) {
    const site = await this.patrimoineService.findWithFullDetails(id);
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
    const equipeOuPro = this._estModeration(req) || estProValide(req.user);
    if (!equipeOuPro) {
      // Un membre ajoute un lieu : en attente, relu par l'équipe (pas de point de visite d'un autre site)
      if (req.body.id_lieu_parent) {
        return res.status(403).json({ success: false, error: 'Seuls les professionnels peuvent ajouter un point de visite à un site.', code: 'ENRICHIR_PRO' });
      }
      if (await propositions.plafondAtteint(this._models, req.user.id_user)) {
        return res.status(409).json({ success: false, code: 'TROP_DE_PROPOSITIONS', error: 'Vous avez déjà beaucoup de propositions en attente : l’équipe doit d’abord les relire.' });
      }
      const site = await this.patrimoineService.create({ ...req.body, statut: undefined }, { isModerator: false, enAttente: true });
      await propositions.proposer(this._models, container.notificationService, {
        idLieu: site.id_lieu, user: req.user, action: 'creation', donnees: {}
      });
      return res.status(202).json({
        success: true, proposition: true, data: { id_lieu: site.id_lieu },
        message: 'Merci ! Le lieu sera publié après vérification par l’équipe.'
      });
    }
    const site = await this.patrimoineService.create(req.body, { isModerator: this._estModeration(req) });
    res.status(201).json({
      success: true,
      message: req.t('patrimoine.created'),
      data: site.toDetailJSON ? site.toDetailJSON(req.lang) : site
    });
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

  /**
   * Toute contribution à un lieu prévient son créateur et l'administration (sauf l'auteur) :
   * « Karim Bensaid a ajouté des photos à « Tkout » ». Une notification manquée n'annule rien.
   */
  _signalerContribution(req, action) {
    return historique.notifierModification(container.patrimoineService.models, container.notificationService, {
      idLieu: parseInt(req.params.id, 10), idUser: req.user?.id_user, action
    });
  }

  get _models() {
    return this.patrimoineService.models;
  }

  /**
   * Hors équipe et créateur du site, la modification devient une proposition à relire (202) ;
   * true si c'est le cas (la réponse est envoyée).
   */
  async _proposer(req, res, action, extra = {}) {
    const idLieu = parseInt(req.params.id, 10);
    // Enrichir un lieu : équipe et professionnels validés ; les autres écrivent à l'équipe (page Contact)
    if (!this._estModeration(req) && !estProValide(req.user)) {
      res.status(403).json({
        success: false, code: 'ENRICHIR_PRO',
        error: 'Seuls les professionnels peuvent enrichir un lieu. Envoyez votre information à l’équipe Tala DZ depuis la page Contact.'
      });
      return true;
    }
    if (!(await propositions.doitProposer(this._models, req.user, idLieu))) return false;
    await propositions.proposer(this._models, container.notificationService, {
      idLieu, user: req.user, action, donnees: { ...extra, corps: req.body }
    });
    res.status(202).json({
      success: true, proposition: true,
      message: 'Merci ! Votre proposition sera publiée après relecture par l’équipe.'
    });
    return true;
  }

  /** Propositions en attente (modération) */
  async propositionsEnAttente(req, res) {
    res.json({ success: true, data: await propositions.enAttente(this._models) });
  }

  /** Accepter ou refuser une proposition (modération) */
  async deciderProposition(req, res) {
    const data = await propositions.decider(this._models, container.notificationService,
      parseInt(req.params.idProposition, 10), req.body.decision, req.body.motif, req.user.id_user);
    res.json({ success: true, data });
  }

  /** Personnalités liées au site */
  async personnalites(req, res) {
    res.json({ success: true, data: await elements.personnalites(this._models, parseInt(req.params.id, 10)) });
  }

  /** Rattacher une personnalité existante au site */
  async rattacherPersonnalite(req, res) {
    if (await this._proposer(req, res, 'personnalite')) return;
    const lien = await elements.rattacherPersonnalite(this._models, parseInt(req.params.id, 10), req.body, req.user?.id_user);
    await this._signalerContribution(req, 'a rattaché une personnalité à');
    res.status(201).json({ success: true, data: lien });
  }

  // Monuments et vestiges (req.genreElement posé par la route)
  async ajouterElement(req, res) {
    const genre = req.genreElement;
    if (await this._proposer(req, res, 'element_ajout', { genre })) return;
    const element = await elements.ajouterElement(this._models, genre, parseInt(req.params.id, 10), req.body, req.user?.id_user);
    await this._signalerContribution(req, `a ajouté le ${genre} « ${texteLisible(element.nom)} » à`);
    res.status(201).json({ success: true, data: element });
  }

  async modifierElement(req, res) {
    const genre = req.genreElement;
    if (await this._proposer(req, res, 'element_modif', { genre, idElement: parseInt(req.params.idElement, 10) })) return;
    const element = await elements.modifierElement(this._models, genre, parseInt(req.params.id, 10),
      parseInt(req.params.idElement, 10), req.body);
    await this._signalerContribution(req, `a modifié le ${genre} « ${texteLisible(element.nom)} » de`);
    res.json({ success: true, data: element });
  }

  async supprimerElement(req, res) {
    const genre = req.genreElement;
    await elements.supprimerElement(this._models, genre, parseInt(req.params.id, 10), parseInt(req.params.idElement, 10));
    res.json({ success: true, message: genre === 'monument' ? 'Monument supprimé' : 'Vestige supprimé' });
  }

  // Blocs d'article du site (éditeur riche, par section)
  async blocs(req, res) {
    const lieu = await this._models.Lieu.findByPk(parseInt(req.params.id), { attributes: ['statut', 'id_createur'] });
    if (lieu && lieu.statut && lieu.statut !== 'publie' && !this._canSeeUnpublished(req, lieu.id_createur)) {
      return res.status(404).json({ success: false, error: req.t('common.notFound') });
    }
    res.json({ success: true, data: await elements.blocs(this._models, parseInt(req.params.id, 10), req.query.section) });
  }

  async ajouterBloc(req, res) {
    const bloc = await elements.ajouterBloc(this._models, parseInt(req.params.id, 10), req.body, req.user?.id_user);
    await this._signalerContribution(req, 'a ajouté un paragraphe à');
    res.status(201).json({ success: true, data: bloc });
  }

  async supprimerBloc(req, res) {
    await elements.supprimerBloc(this._models, parseInt(req.params.id, 10), parseInt(req.params.blockId, 10));
    res.json({ success: true, message: 'Bloc supprimé' });
  }

  /** Nouvelle personnalité du site (fiche créée et rattachée) */
  async creerPersonnalite(req, res) {
    const lien = await this.patrimoineService.creerPersonnalite(parseInt(req.params.id, 10), req.body, { userId: req.user.id_user });
    await this._signalerContribution(req, 'a ajouté une personnalité à');
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
    await this._signalerContribution(req, 'a retiré une personnalité de');
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
    // limite : l'accueil n'affiche que quelques plats (avant : jusqu'à 500 chargés à chaque visite)
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 0, 0), 500) || null;
    res.json({ success: true, data: await this.patrimoineService.plats({ wilaya, q, limite }) });
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
    await this._signalerContribution(req, 'a relié un article à');
    res.status(201).json({ success: true, data: lien });
  }

  /** Œuvres reliées à ce lieu par leur propriétaire */
  async oeuvresLiees(req, res) {
    const data = await this.patrimoineService.oeuvresLiees(parseInt(req.params.id, 10), {
      userId: req.user?.id_user || null, isModerator: this._estModeration(req)
    });
    res.json({ success: true, data });
  }

  /** Relier une œuvre à ce lieu (son propriétaire ou la modération) */
  async lierOeuvre(req, res) {
    const lien = await this.patrimoineService.lierOeuvre(parseInt(req.params.id, 10), parseInt(req.body.id_oeuvre, 10), {
      userId: req.user.id_user, isModerator: this._estModeration(req)
    });
    res.status(201).json({ success: true, data: lien });
  }

  /** Lieux reliés à une œuvre */
  async lieuxDeOeuvre(req, res) {
    const data = await this.patrimoineService.lieuxDeOeuvre(parseInt(req.params.idOeuvre, 10), {
      userId: req.user?.id_user || null, isModerator: this._estModeration(req)
    });
    res.json({ success: true, data });
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
    await this._signalerContribution(req, 'a retiré un article de');
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
    const site = await this.patrimoineService.update(parseInt(req.params.id), donnees, { idUser: req.user?.id_user });
    res.json({
      success: true,
      message: req.t('patrimoine.updated'),
      data: site.toDetailJSON(req.lang)
    });
  }

  async delete(req, res) {
    try {
      await this.patrimoineService.delete(parseInt(req.params.id));
    } catch (error) {
      if (error.code !== 'LIEU_UTILISE') throw error;
      return res.status(409).json({
        success: false,
        error: req.t('patrimoine.utiliseParEvenements', { count: error.data.evenements }),
        code: error.code
      });
    }
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
      // « ?src=qr » : la fiche ouverte par ce QR compte un scan (sans IP), puis retire le marqueur
      const siteUrl = `${baseUrl}/patrimoine/${siteId}?src=qr`;

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
      // Appelé à chaque visite d'une fiche : même image pour un même site, 17 ms de calcul évités (audit V8)
      const cleQr = `${siteId}:${qrSize}`;
      let dataUrl = qrEnMemoire.get(cleQr);
      if (!dataUrl) {
        dataUrl = await QRCode.toDataURL(siteUrl, { width: qrSize, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        qrEnMemoire.set(cleQr, dataUrl, 24 * 60 * 60 * 1000);
      }
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
      if (!elements.CHAMPS_DETAIL.some(champ => req.body[champ] !== undefined)) {
        return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour' });
      }
      const corps = Object.fromEntries(elements.CHAMPS_DETAIL.filter(c => req.body[c] !== undefined).map(c => [c, req.body[c]]));
      req.body = corps;
      if (await this._proposer(req, res, 'detail')) return;

      // Équipe ou créateur du site : modification directe (historique, notifications)
      const detail = await elements.enrichirDetail(this._models, container.notificationService, lieuId, req.user?.id_user, corps);
      res.json({ success: true, data: detail, message: 'Contribution enregistrée' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Historique des textes du lieu (administration) */
  async historique(req, res) {
    res.json({ success: true, data: await this.patrimoineService.historique(parseInt(req.params.id, 10)) });
  }

  /** Revenir au texte d'avant une modification (administration) */
  async restaurerVersion(req, res) {
    const resultat = await this.patrimoineService.restaurerVersion(
      parseInt(req.params.id, 10), parseInt(req.params.idHistorique, 10), req.user.id_user
    );
    if (!resultat) return res.status(404).json({ success: false, error: req.t('common.notFound') });
    res.json({ success: true, data: resultat });
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
    // Même règle que la fiche : un site non publié n'est pas lisible par un simple scan
    const site = await this._findVisibleSite(req, id);
    if (!site) throw AppError.notFound('Site patrimoine');
    res.json({ success: true, data: site.toDetailJSON(req.lang) });
  }

  /** POST /patrimoine/:id/scan-qr : un scan du QR imprimé (rien sur la personne n'est gardé) */
  async enregistrerScanQr(req, res) {
    const id = parseInt(req.params.id, 10);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const ok = await require('../services/patrimoine/scansQr').enregistrerScan(this._models, id, `${baseUrl}/patrimoine/${id}?src=qr`);
    if (!ok) return this._notFound(req, res);
    res.status(201).json({ success: true });
  }

  /** GET /patrimoine/:id/scans-qr : nombre de scans, pour le créateur du site et l'équipe */
  async statistiquesScansQr(req, res) {
    const id = parseInt(req.params.id, 10);
    // Même règle que la modification de la fiche (créateur du site ou du site parent, modération)
    if (!(await this._verifierDroitModification(req, res))) return;
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await require('../services/patrimoine/scansQr').statistiques(this._models, id) });
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
    // Route des voix : un seul fichier (req.file) ; route des médias : plusieurs (req.files)
    const fichiers = req.files || (req.file ? [req.file] : []);
    const medias = await this.patrimoineService.uploadMedias(siteId, fichiers, {
      langue: req.body?.langue || undefined,
      // Photographe ou source, et droits des photos envoyées
      credit: req.body?.credit,
      licence: req.body?.licence,
      // Route des voix seulement (case d'accord obligatoire, vérifiée par la route)
      ...(req.voixEnregistree ? { parler: req.body?.parler, accordVoix: true } : {})
    });
    if (medias?.length) await this._signalerContribution(req, 'a ajouté des photos ou des enregistrements à');
    res.json({ success: true, data: medias });
  }

  async reordonnerPoints(req, res) {
    const points = await this.patrimoineService.reordonnerPoints(parseInt(req.params.id), req.body.ordre, {
      userId: req.user.id_user,
      isModerator: this._estModeration(req)
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

  async updateMediaCredit(req, res) {
    if (!(await this._verifierDroitModification(req, res))) return;
    const { id, mediaId } = req.params;
    const data = await this.patrimoineService.updateMediaCredit(id, mediaId, req.body);
    res.json({ success: true, data });
  }

  async deleteMedia(req, res) {
    if (!(await this._verifierDroitModification(req, res))) return;
    const { id, mediaId } = req.params;
    await this.patrimoineService.deleteMedia(id, mediaId);
    await this._signalerContribution(req, 'a supprimé une photo ou un enregistrement de');
    res.json({ success: true, message: req.t('common.deleted') });
  }

  async updateHoraires(req, res) {
    res.status(501).json({ success: false, error: req.t('common.notImplemented') });
  }

}

module.exports = new PatrimoineController();
