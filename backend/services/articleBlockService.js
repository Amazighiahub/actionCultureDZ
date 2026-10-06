/**
 * ArticleBlockService - Service pour la gestion des blocs d'articles
 * Architecture: Controller → Service → Repository → Database
 */
const BaseService = require('./core/baseService');
const { Op } = require('sequelize');
const { sanitizeBlockContent } = require('../utils/sanitizeArticle');

// Types d'articles gérés par ce service (les blocs patrimoine ont leurs propres routes)
const EDITABLE_ARTICLE_TYPES = ['article', 'article_scientifique'];
// Champs qu'un client peut fixer sur un bloc
const BLOCK_FIELDS = ['type_block', 'contenu', 'contenu_json', 'metadata', 'id_media', 'visible'];

class ArticleBlockService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
  }

  /** @returns {import('sequelize').Sequelize} */
  get sequelize() {
    return this.repository.model.sequelize;
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Récupérer tous les blocs d'un article
   */
  async getBlocksByArticle(articleId, articleType = 'article') {
    return this.repository.findByArticle(articleId, articleType);
  }

  /**
   * Récupérer un bloc par son ID avec ses associations
   */
  async getBlockWithMedia(blockId) {
    return this.repository.findWithMedia(blockId);
  }

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Créer un nouveau bloc
   */
  async createBlock(data, user) {
    const {
      id_article,
      article_type = 'article',
      type_block,
      contenu,
      contenu_json,
      metadata = {},
      id_media
    } = data;

    if (!id_article || !type_block) {
      return { error: 'badRequest' };
    }

    const access = await this._checkCanEdit(id_article, article_type, user);
    if (access.error) return access;

    const transaction = await this.sequelize.transaction();

    try {
      const ordre = await this.repository.getNextOrdre(id_article, article_type);

      const block = await this.repository.create({
        id_article,
        article_type,
        type_block,
        contenu: sanitizeBlockContent(type_block, contenu),
        contenu_json,
        id_media,
        ordre,
        metadata,
        visible: true
      }, { transaction });

      await transaction.commit();

      const newBlock = await this.getBlockWithMedia(block.id_block);
      return { data: newBlock };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Créer plusieurs blocs en batch (remplace les anciens)
   */
  async createMultipleBlocks(data, user) {
    const { id_article, article_type = 'article', blocks } = data;

    if (!id_article || !blocks || !Array.isArray(blocks)) {
      return { error: 'badRequest' };
    }

    const access = await this._checkCanEdit(id_article, article_type, user);
    if (access.error) return access;

    const transaction = await this.sequelize.transaction();

    try {
      // Supprimer les anciens blocs
      await this.repository.deleteByArticle(id_article, article_type, transaction);

      // Créer les nouveaux blocs
      const createdBlocks = [];

      for (let i = 0; i < blocks.length; i++) {
        const blockData = { id_article, article_type, ordre: i };
        BLOCK_FIELDS.forEach(f => { if (blocks[i][f] !== undefined) blockData[f] = blocks[i][f]; });
        blockData.contenu = sanitizeBlockContent(blockData.type_block, blockData.contenu);

        const block = await this.repository.create(blockData, { transaction });
        createdBlocks.push(block);
      }

      await transaction.commit();

      // Récupérer les blocs avec associations
      const newBlocks = await this.repository.findByArticle(id_article, article_type);

      return { data: newBlocks, count: createdBlocks.length };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Mettre à jour un bloc
   */
  async updateBlock(blockId, updates, user) {
    const block = await this.repository.findById(blockId);
    if (!block) return { error: 'notFound' };

    const access = await this._checkCanEdit(block.id_article, block.article_type, user);
    if (access.error) return access;

    const transaction = await this.sequelize.transaction();

    try {
      BLOCK_FIELDS.forEach(field => {
        if (updates[field] !== undefined) {
          block[field] = updates[field];
        }
      });
      // Toujours assainir selon le type effectif (celui envoyé, sinon celui en base)
      if (updates.contenu !== undefined || updates.type_block !== undefined) {
        block.contenu = sanitizeBlockContent(block.type_block, block.contenu);
      }

      await block.save({ transaction });
      await transaction.commit();

      const updatedBlock = await this.getBlockWithMedia(blockId);
      return { data: updatedBlock };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Supprimer un bloc
   */
  async deleteBlock(blockId, user) {
    const block = await this.repository.findById(blockId);
    if (!block) return { error: 'notFound' };

    const access = await this._checkCanEdit(block.id_article, block.article_type, user);
    if (access.error) return access;

    const transaction = await this.sequelize.transaction();

    try {
      await block.destroy({ transaction });
      await this._reorderAfterDelete(block.id_article, block.article_type, block.ordre, transaction);
      await transaction.commit();

      return { success: true };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Réorganiser les blocs d'un article
   */
  async reorderBlocks(articleId, blockIds, user, articleType = 'article') {
    if (!Array.isArray(blockIds)) {
      return { error: 'badRequest' };
    }

    const access = await this._checkCanEdit(articleId, articleType, user);
    if (access.error) return access;

    const transaction = await this.sequelize.transaction();

    try {
      // Vérifier que tous les blocs appartiennent à l'article
      const blocks = await this.repository.model.findAll({
        where: {
          id_block: blockIds,
          id_article: articleId,
          article_type: articleType
        },
        transaction
      });

      if (blocks.length !== blockIds.length) {
        await transaction.rollback();
        return { error: 'notBelongToArticle' };
      }

      // Bulk update via single CASE WHEN query instead of N individual UPDATEs
      const cases = blockIds.map((id, i) => `WHEN ${parseInt(id, 10)} THEN ${i}`).join(' ');
      const ids = blockIds.map(id => parseInt(id, 10)).join(',');
      await this.sequelize.query(
        `UPDATE article_block SET ordre = CASE id_block ${cases} END WHERE id_block IN (${ids}) AND id_article = :articleId AND article_type = :articleType`,
        { replacements: { articleId: parseInt(articleId, 10), articleType }, transaction }
      );

      await transaction.commit();
      return { success: true };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Dupliquer un bloc
   */
  async duplicateBlock(blockId, user) {
    const originalBlock = await this.repository.findById(blockId);
    if (!originalBlock) return { error: 'notFound' };

    const access = await this._checkCanEdit(originalBlock.id_article, originalBlock.article_type, user);
    if (access.error) return access;

    const transaction = await this.sequelize.transaction();

    try {

      const ordre = await this.repository.getNextOrdre(originalBlock.id_article, originalBlock.article_type);

      const newBlock = await this.repository.create({
        id_article: originalBlock.id_article,
        article_type: originalBlock.article_type,
        type_block: originalBlock.type_block,
        contenu: originalBlock.contenu,
        contenu_json: originalBlock.contenu_json,
        id_media: originalBlock.id_media,
        metadata: originalBlock.metadata,
        ordre,
        visible: originalBlock.visible
      }, { transaction });

      await transaction.commit();

      const duplicatedBlock = await this.getBlockWithMedia(newBlock.id_block);
      return { data: duplicatedBlock };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================

  /**
   * Vérifie que l'utilisateur peut modifier les blocs de cet article :
   * propriétaire de l'œuvre parente (saisi_par) ou admin.
   * @returns {Promise<{error?: string}>} error = 'badRequest' | 'notFound' | 'forbidden'
   */
  async _checkCanEdit(idArticle, articleType, user) {
    if (!EDITABLE_ARTICLE_TYPES.includes(articleType)) return { error: 'badRequest' };
    if (user?.isAdmin) return {};

    const isScientifique = articleType === 'article_scientifique';
    const Model = isScientifique ? this.models?.ArticleScientifique : this.models?.Article;
    if (!Model || !this.models?.Oeuvre) return { error: 'forbidden' };

    const parent = await Model.findByPk(idArticle, {
      attributes: [isScientifique ? 'id_article_scientifique' : 'id_article', 'id_oeuvre'],
      include: [{ model: this.models.Oeuvre, attributes: ['saisi_par'] }]
    });
    if (!parent) return { error: 'notFound' };
    if (!user?.id_user || parent.Oeuvre?.saisi_par !== user.id_user) return { error: 'forbidden' };
    return {};
  }

  /**
   * Réorganiser les ordres après suppression d'un bloc
   */
  async _reorderAfterDelete(articleId, articleType, deletedOrdre, transaction) {
    await this.repository.model.update(
      { ordre: this.sequelize.literal('ordre - 1') },
      {
        where: {
          id_article: articleId,
          article_type: articleType,
          ordre: { [Op.gt]: deletedOrdre }
        },
        transaction
      }
    );
  }
}

module.exports = ArticleBlockService;
