// controllers/articleBlockController.js
const path = require('path');
const crypto = require('crypto');
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class ArticleBlockController extends BaseController {
  get articleBlockService() {
    return container.articleBlockService;
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
      const result = await this.articleBlockService.createBlock(req.body);

      if (result.error === 'badRequest') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

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
      const result = await this.articleBlockService.createMultipleBlocks(req.body);

      if (result.error === 'badRequest') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

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
      const result = await this.articleBlockService.updateBlock(blockId, req.body);

      if (result.error === 'notFound') {
        return res.status(404).json({
          success: false,
          error: req.t('articleBlock.notFound')
        });
      }

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
      const result = await this.articleBlockService.deleteBlock(blockId);

      if (result.error === 'notFound') {
        return res.status(404).json({
          success: false,
          error: req.t('articleBlock.notFound')
        });
      }

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

      const result = await this.articleBlockService.reorderBlocks(articleId, blockIds);

      if (result.error === 'badRequest') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      if (result.error === 'notBelongToArticle') {
        return res.status(400).json({
          success: false,
          error: req.t('articleBlock.notBelongToArticle')
        });
      }

      this._sendMessage(res, req.t('articleBlock.reordered'));

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Uploader une image pour un bloc
   */
  async uploadBlockImage(req, res) {
    try {
      const { articleId } = req.params;

      const result = await this.articleBlockService.uploadBlockImage(
        articleId,
        req.file,
        { titre: req.body.titre, description: req.body.description }
      );

      if (result.error === 'noFile') {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      res.json({
        success: true,
        message: req.t('upload.imageSuccess'),
        data: result.data
      });

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
      const result = await this.articleBlockService.duplicateBlock(blockId);

      if (result.error === 'notFound') {
        return res.status(404).json({
          success: false,
          error: req.t('articleBlock.notFound')
        });
      }

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

  /**
   * Configuration Multer pour l'upload d'images
   */
  static getMulterConfig() {
    const multer = require('multer');
    const fsSync = require('fs');

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'articles');

        if (!fsSync.existsSync(uploadDir)) {
          fsSync.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `article-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
      }
    };

    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
      },
      fileFilter
    });
  }
}

module.exports = new ArticleBlockController();
