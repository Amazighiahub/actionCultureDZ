/**
 * FavoriController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController -> Controller -> Service -> Models
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier/data access déléguée au FavoriService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translateDeep } = require('../helpers/i18n');

class FavoriController extends BaseController {
  get favoriService() {
    return container.favoriService;
  }

  // ========================================================================
  // CONSULTATION
  // ========================================================================

  /**
   * Récupérer tous les favoris d'un utilisateur (paginé)
   */
  async getUserFavoris(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { type } = req.query;
      const { page, limit, offset } = this._paginate(req, { limit: 12 });

      const result = await this.favoriService.getUserFavoris(
        req.user.id_user,
        { page, limit, offset, type }
      );

      const favorisEnrichis = await this.favoriService.enrichirFavoris(result.rows);
      const translated = translateDeep(favorisEnrichis, lang);

      res.json({
        success: true,
        data: {
          favoris: translated,
          pagination: result.pagination
        },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Vérifier si une entité est dans les favoris
   */
  async checkFavori(req, res) {
    try {
      const { type, id } = req.params;

      const result = await this.favoriService.checkFavori(
        req.user.id_user, type, id
      );

      this._sendSuccess(res, {
        isFavorite: result.isFavorite,
        ...( result.favori && { favori: result.favori })
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Statistiques des favoris de l'utilisateur
   */
  async getUserFavorisStats(req, res) {
    try {
      const stats = await this.favoriService.getUserFavorisStats(req.user.id_user);
      this._sendSuccess(res, stats);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Favoris populaires (entités les plus favorites)
   */
  async getPopularFavorites(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { type, limit = 10 } = req.query;

      const populaires = await this.favoriService.getPopularFavorites({ type, limit });
      const translated = translateDeep(populaires, lang);

      res.json({
        success: true,
        data: translated,
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // ÉCRITURE
  // ========================================================================

  /**
   * Ajouter un favori
   */
  async addFavori(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { type_entite, id_entite } = req.body;

      const result = await this.favoriService.addFavori(
        req.user.id_user, type_entite, id_entite
      );

      if (result.error === 'invalidType') {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      if (result.error === 'entityNotFound') {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      if (result.error === 'duplicate') {
        return res.status(409).json({ success: false, error: req.t('favori.added') });
      }

      this._sendCreated(res, {
        favori: result.favori,
        entite: translateDeep(result.entite, lang)
      }, req.t('favori.added'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Supprimer un favori par ID
   */
  async removeFavori(req, res) {
    try {
      const result = await this.favoriService.removeFavori(
        req.params.id, req.user.id_user
      );

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('favori.notFound') });
      }

      this._sendMessage(res, req.t('favori.removed'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Supprimer un favori par type et ID d'entité
   */
  async removeFavoriByEntity(req, res) {
    try {
      const { type, id } = req.params;

      const result = await this.favoriService.removeFavoriByEntity(
        req.user.id_user, type, id
      );

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('favori.notFound') });
      }

      this._sendMessage(res, req.t('favori.removed'));
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = FavoriController;
