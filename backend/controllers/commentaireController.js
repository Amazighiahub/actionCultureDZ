/**
 * CommentaireController - Controller refactored with BaseController + Service Pattern
 * Architecture: BaseController -> Controller -> Service -> Database
 *
 * All data access goes through container.commentaireService.
 * Translation (translateDeep) stays here as presentation logic.
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translateDeep } = require('../helpers/i18n');

class CommentaireController extends BaseController {
  get service() {
    return container.commentaireService;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  /**
   * Recuperer les commentaires d'une oeuvre (pagine)
   */
  async getCommentairesOeuvre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { oeuvreId } = req.params;
      const { page, limit, offset } = this._paginate(req, { limit: 10 });

      const commentaires = await this.service.getCommentairesOeuvre(oeuvreId, { limit, offset });

      res.json({
        success: true,
        data: {
          commentaires: translateDeep(commentaires.rows, lang),
          pagination: {
            total: commentaires.count,
            page,
            pages: Math.ceil(commentaires.count / limit),
            limit
          }
        },
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Recuperer les commentaires d'un evenement (pagine)
   */
  async getCommentairesEvenement(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { evenementId } = req.params;
      const { page, limit, offset } = this._paginate(req, { limit: 10 });

      const commentaires = await this.service.getCommentairesEvenement(evenementId, { limit, offset });

      res.json({
        success: true,
        data: {
          commentaires: translateDeep(commentaires.rows, lang),
          pagination: {
            total: commentaires.count,
            page,
            pages: Math.ceil(commentaires.count / limit),
            limit
          }
        },
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Recuperer les avis d'un service (pagine) + note moyenne
   */
  async getCommentairesService(req, res) {
    try {
      const lang = req.lang || 'fr';
      const serviceId = Number(req.params.serviceId);
      const { page, limit, offset } = this._paginate(req, { limit: 10 });

      const [commentaires, notes] = await Promise.all([
        this.service.getCommentairesService(serviceId, { limit, offset }),
        this.service.notesServices([serviceId])
      ]);

      res.json({
        success: true,
        data: {
          commentaires: translateDeep(commentaires.rows, lang),
          note: notes.get(serviceId) || { moyenne: 0, nombre: 0 },
          pagination: {
            total: commentaires.count,
            page,
            pages: Math.ceil(commentaires.count / limit),
            limit
          }
        },
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // CREATION
  // ========================================================================

  /**
   * Publier un avis (ou une reponse) sur un service (authentifie)
   */
  async createCommentaireService(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { contenu, note_qualite, commentaire_parent_id } = req.body;
      const avis = await this.service.creerAvisService(Number(req.params.serviceId), req.user.id_user,
        { contenu, note_qualite, commentaire_parent_id });
      return this._sendCreated(res, translateDeep(avis, lang), req.t('comment.added'));
    } catch (error) {
      // Les erreurs metier portent une cle de traduction
      if (error.isOperational && error.statusCode < 500) error.message = req.t(error.message);
      return this._handleError(res, error);
    }
  }

  /**
   * Creer un commentaire sur une oeuvre (authentifie)
   */
  async createCommentaireOeuvre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { oeuvreId } = req.params;
      const { contenu, note_qualite, commentaire_parent_id } = req.body;

      const oeuvre = await this.service.findOeuvre(oeuvreId);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: req.t('oeuvre.notFound')
        });
      }

      const commentaireComplet = await this.service.createCommentaire({
        contenu,
        note_qualite,
        commentaire_parent_id,
        id_user: req.user.id_user,
        id_oeuvre: oeuvreId
      });

      return this._sendCreated(res, translateDeep(commentaireComplet, lang), req.t('comment.added'));
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Creer un commentaire sur un evenement (authentifie)
   */
  async createCommentaireEvenement(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { evenementId } = req.params;
      const { contenu, note_qualite, commentaire_parent_id } = req.body;

      const evenement = await this.service.findEvenement(evenementId);
      if (!evenement) {
        return res.status(404).json({
          success: false,
          error: req.t('event.notFound')
        });
      }

      const commentaireComplet = await this.service.createCommentaire({
        contenu,
        note_qualite,
        commentaire_parent_id,
        id_user: req.user.id_user,
        id_evenement: evenementId
      });

      return this._sendCreated(res, translateDeep(commentaireComplet, lang), req.t('comment.added'));
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // MODIFICATION / SUPPRESSION
  // ========================================================================

  /**
   * Modifier un commentaire (req.resource deja charge par middleware)
   */
  async updateCommentaire(req, res) {
    try {
      const { contenu, note_qualite } = req.body;

      const commentaire = await this.service.updateCommentaire(req.resource, { contenu, note_qualite });

      res.json({
        success: true,
        message: req.t('comment.updated'),
        data: commentaire
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Supprimer un commentaire (soft delete, req.resource deja charge par middleware)
   */
  async deleteCommentaire(req, res) {
    try {
      await this.service.deleteCommentaire(req.resource, req.user?.id_user);

      return this._sendMessage(res, req.t('comment.deleted'));
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // MODERATION (ADMIN)
  // ========================================================================

  /**
   * Moderer un commentaire (admin set statut)
   */
  async moderateCommentaire(req, res) {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      const commentaire = await this.service.moderateCommentaire(id, statut);
      if (!commentaire) {
        return res.status(404).json({
          success: false,
          error: req.t('common.notFound')
        });
      }

      return this._sendMessage(res, req.t('comment.statusUpdated', { statut }));
    } catch (error) {
      return this._handleError(res, error);
    }
  }
}

module.exports = new CommentaireController();
