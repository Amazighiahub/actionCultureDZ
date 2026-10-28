/**
 * OrganisationController - annuaire, page publique (vitrine), modification et vérification
 * des organisations (associations, maisons d'édition, musées…).
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

const CATEGORIES_VALIDES = ['associations', 'edition', 'culture', 'institutions', 'entreprises', 'autres'];

class OrganisationController extends BaseController {
  get service() {
    return container.organisationService;
  }

  /** GET /organisations?categorie=&wilaya=&q= : organisations vérifiées */
  async annuaire(req, res) {
    try {
      const { categorie, wilaya, q } = req.query;
      const data = await this.service.annuaire({
        categorie: CATEGORIES_VALIDES.includes(categorie) ? categorie : null,
        wilaya: wilaya && /^\d+$/.test(String(wilaya)) ? Number(wilaya) : null,
        q: typeof q === 'string' ? q.slice(0, 100) : ''
      });
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** GET /organisations/:id/vitrine : fiche, membres, événements et œuvres */
  async vitrine(req, res) {
    try {
      const data = await this.service.vitrine(Number(req.params.id), this._droits(req));
      // Textes multilingues bruts : la page les affiche dans la langue du visiteur
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** GET /organisations/ressemblantes?nom=&exclure= : noms proches (doublons probables) */
  async ressemblantes(req, res) {
    try {
      const nom = typeof req.query.nom === 'string' ? req.query.nom.slice(0, 200) : '';
      const exclure = /^\d+$/.test(String(req.query.exclure || '')) ? Number(req.query.exclure) : null;
      res.json({ success: true, data: await this.service.ressemblantes(nom, { exclure }) });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** GET /organisations/:id/fusion?doublons=7,9 : résumé avant fusion */
  async apercuFusion(req, res) {
    try {
      const doublons = String(req.query.doublons || '').split(',').filter(v => /^\d+$/.test(v)).map(Number);
      res.json({ success: true, data: await this.service.apercuFusion(Number(req.params.id), doublons) });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** POST /organisations/:id/fusion { doublons: [7, 9] } : fusion (modération) */
  async fusionner(req, res) {
    try {
      const data = await this.service.fusionner(Number(req.params.id), req.body.doublons, req.user.id_user);
      res.json({ success: true, message: req.t('organisation.merged'), data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** PUT /organisations/:id : responsables de l'organisation ou modération */
  async modifier(req, res) {
    try {
      const data = await this.service.modifier(Number(req.params.id), req.body, this._droits(req));
      res.json({ success: true, message: req.t('organisation.updated'), data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** GET /organisations/admin/liste : toutes les organisations et leur statut */
  async listeModeration(req, res) {
    try {
      res.json({ success: true, data: await this.service.listePourModeration() });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** PATCH /organisations/:id/statut { statut: valide|rejete, motif } */
  async changerStatut(req, res) {
    try {
      const id = Number(req.params.id);
      const { statut, motif } = req.body;
      const data = statut === 'valide'
        ? await this.service.valider(id, req.user.id_user)
        : await this.service.refuser(id, req.user.id_user, motif);
      res.json({ success: true, message: req.t(statut === 'valide' ? 'organisation.validated' : 'organisation.rejected'), data });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new OrganisationController();
