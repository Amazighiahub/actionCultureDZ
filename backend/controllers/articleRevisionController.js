/**
 * ArticleRevisionController — propositions de modification d'un article
 * (GET/POST /oeuvres/:id/revisions, décision par l'auteur de l'article ou l'administration).
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class ArticleRevisionController extends BaseController {
  get service() {
    return container.articleRevisionService;
  }

  _compte(req) {
    return this._droits(req);
  }

  /** Propositions visibles par le compte (toutes pour l'auteur et l'administration) */
  async lister(req, res) {
    res.json({ success: true, data: await this.service.lister(parseInt(req.params.id, 10), this._compte(req)) });
  }

  /** Une proposition et son contenu */
  async detail(req, res) {
    const revision = await this.service.detail(parseInt(req.params.id, 10), parseInt(req.params.idRevision, 10), this._compte(req));
    if (!revision) return res.status(404).json({ success: false, error: req.t('common.notFound') });
    res.json({ success: true, data: revision });
  }

  /** Proposer une modification (brouillon jusqu'à la décision) */
  async proposer(req, res) {
    const { motif, titre, description, blocks } = req.body;
    const revision = await this.service.proposer(parseInt(req.params.id, 10), { motif, titre, description, blocks }, this._compte(req));
    res.status(201).json({ success: true, data: { id_revision: revision.id_revision, statut: revision.statut } });
  }

  /** Accepter ou refuser une proposition */
  async decider(req, res) {
    const { decision, motif_refus } = req.body;
    const revision = await this.service.decider(parseInt(req.params.id, 10), parseInt(req.params.idRevision, 10), { decision, motif_refus }, this._compte(req));
    // L'article a pu changer : le cache des œuvres est vidé
    if (revision.statut === 'acceptee') container.oeuvreService?.cache?.invalidate?.();
    res.json({ success: true, data: { id_revision: revision.id_revision, statut: revision.statut } });
  }
}

module.exports = new ArticleRevisionController();
