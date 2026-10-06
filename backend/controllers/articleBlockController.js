// controllers/articleBlockController.js
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

// Erreurs métier renvoyées par articleBlockService → statut HTTP + clé i18n
const SERVICE_ERRORS = {
  badRequest: { status: 400, key: 'common.badRequest' },
  notFound: { status: 404, key: 'articleBlock.notFound' },
  forbidden: { status: 403, key: 'common.forbidden' },
  notBelongToArticle: { status: 400, key: 'articleBlock.notBelongToArticle' }
};

class ArticleBlockController extends BaseController {
  get articleBlockService() {
    return container.articleBlockService;
  }

  /** Renvoie true (et répond) si le service a signalé une erreur métier */
  _sendServiceError(req, res, result) {
    const mapped = result && SERVICE_ERRORS[result.error];
    if (!mapped) return false;
    res.status(mapped.status).json({ success: false, error: req.t(mapped.key) });
    return true;
  }

  /**
   * Récupérer tous les blocs d'un article
   */
  async getBlocksByArticle(req, res) {
    try {
      const { articleId, articleType } = req.params;

      const blocks = await this.articleBlockService.getBlocksByArticle(
        articleId,
        articleType || 'article'
      );

      this._sendSuccess(res, blocks);

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Créer un nouveau bloc
   */
  async createBlock(req, res) {
    try {
      // L'assainissement du contenu (XSS) est fait dans le service
      const result = await this.articleBlockService.createBlock(req.body, req.user);
      if (this._sendServiceError(req, res, result)) return;

      this._sendCreated(res, result.data, req.t('articleBlock.created'));

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Créer plusieurs blocs en batch
   */
  async createMultipleBlocks(req, res) {
    try {
      const result = await this.articleBlockService.createMultipleBlocks(req.body, req.user);
      if (this._sendServiceError(req, res, result)) return;

      res.json({
        success: true,
        message: req.t('articleBlock.multipleCreated', { count: result.count }),
        data: result.data
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Mettre à jour un bloc
   */
  async updateBlock(req, res) {
    try {
      const { blockId } = req.params;
      const result = await this.articleBlockService.updateBlock(blockId, req.body, req.user);
      if (this._sendServiceError(req, res, result)) return;

      res.json({
        success: true,
        message: req.t('articleBlock.updated'),
        data: result.data
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Supprimer un bloc
   */
  async deleteBlock(req, res) {
    try {
      const { blockId } = req.params;
      const result = await this.articleBlockService.deleteBlock(blockId, req.user);
      if (this._sendServiceError(req, res, result)) return;

      this._sendMessage(res, req.t('articleBlock.deleted'));

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Réorganiser les blocs
   */
  async reorderBlocks(req, res) {
    try {
      const { articleId } = req.params;
      const { blockIds } = req.body;
      const articleType = req.query.article_type || req.body.article_type || 'article';

      const result = await this.articleBlockService.reorderBlocks(articleId, blockIds, req.user, articleType);
      if (this._sendServiceError(req, res, result)) return;

      this._sendMessage(res, req.t('articleBlock.reordered'));

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Dupliquer un bloc
   */
  async duplicateBlock(req, res) {
    try {
      const { blockId } = req.params;
      const result = await this.articleBlockService.duplicateBlock(blockId, req.user);
      if (this._sendServiceError(req, res, result)) return;

      res.json({
        success: true,
        message: req.t('articleBlock.duplicated'),
        data: result.data
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtenir les templates de blocs (static data, no DB access)
   */
  async getBlockTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'paragraph',
          name: 'Paragraphe',
          type_block: 'text',
          icon: 'text',
          metadata: { level: 'p' }
        },
        {
          id: 'heading1',
          name: 'Titre 1',
          type_block: 'heading',
          icon: 'heading',
          metadata: { level: 1 }
        },
        {
          id: 'heading2',
          name: 'Titre 2',
          type_block: 'heading',
          icon: 'heading',
          metadata: { level: 2 }
        },
        {
          id: 'image',
          name: 'Image',
          type_block: 'image',
          icon: 'image',
          metadata: { layout: 'full-width' }
        },
        {
          id: 'citation',
          name: 'Citation',
          type_block: 'citation',
          icon: 'quote',
          metadata: {}
        },
        {
          id: 'list',
          name: 'Liste',
          type_block: 'list',
          icon: 'list',
          metadata: { listType: 'unordered' }
        },
        {
          id: 'table',
          name: 'Tableau',
          type_block: 'table',
          icon: 'table',
          metadata: {}
        },
        {
          id: 'code',
          name: 'Code',
          type_block: 'code',
          icon: 'code',
          metadata: { language: 'javascript' }
        },
        {
          id: 'separator',
          name: 'Séparateur',
          type_block: 'separator',
          icon: 'minus',
          metadata: {}
        }
      ];

      this._sendSuccess(res, templates);

    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new ArticleBlockController();
