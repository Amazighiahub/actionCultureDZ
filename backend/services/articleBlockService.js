/**
 * ArticleBlockService - Service pour la gestion des blocs d'articles
 * Architecture: Controller → Service → Repository → Database
 */
const BaseService = require('./core/baseService');
const { Op } = require('sequelize');

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
  async createBlock(data) {
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

    const transaction = await this.sequelize.transaction();

    try {
      const ordre = await this.repository.getNextOrdre(id_article, article_type);

      const block = await this.repository.create({
        id_article,
        article_type,
        type_block,
        contenu,
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
  async createMultipleBlocks(data) {
    const { id_article, article_type = 'article', blocks } = data;

    if (!id_article || !blocks || !Array.isArray(blocks)) {
      return { error: 'badRequest' };
    }

    const transaction = await this.sequelize.transaction();

    try {
      // Supprimer les anciens blocs
      await this.repository.deleteByArticle(id_article, article_type, transaction);

      // Créer les nouveaux blocs
      const allowedBlockFields = ['type', 'contenu', 'id_media', 'legende', 'alt_text', 'style', 'niveau'];
      const createdBlocks = [];

      for (let i = 0; i < blocks.length; i++) {
        const blockData = { id_article, article_type, ordre: i };
        allowedBlockFields.forEach(f => { if (blocks[i][f] !== undefined) blockData[f] = blocks[i][f]; });

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
  async updateBlock(blockId, updates) {
    const transaction = await this.sequelize.transaction();

    try {
      const block = await this.repository.findById(blockId);

      if (!block) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      const allowedFields = [
        'contenu', 'contenu_json', 'metadata',
        'id_media', 'visible', 'type_block'
      ];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          block[field] = updates[field];
        }
      });

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
  async deleteBlock(blockId) {
    const transaction = await this.sequelize.transaction();

    try {
      const block = await this.repository.findById(blockId);

      if (!block) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      await block.destroy({ transaction });
      await this._reorderAfterDelete(block.id_article, block.ordre, transaction);
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
  async reorderBlocks(articleId, blockIds) {
    if (!Array.isArray(blockIds)) {
      return { error: 'badRequest' };
    }

    const transaction = await this.sequelize.transaction();

    try {
      // Vérifier que tous les blocs appartiennent à l'article
      const blocks = await this.repository.model.findAll({
        where: {
          id_block: blockIds,
          id_article: articleId
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
        `UPDATE article_blocks SET ordre = CASE id_block ${cases} END WHERE id_block IN (${ids}) AND id_article = :articleId`,
        { replacements: { articleId: parseInt(articleId, 10) }, transaction }
      );

      await transaction.commit();
      return { success: true };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Uploader une image pour un bloc (créer l'entrée média)
   */
  async uploadBlockImage(articleId, file, meta = {}) {
    if (!file) {
      return { error: 'noFile' };
    }

    const transaction = await this.sequelize.transaction();

    try {
      const media = await this.models.Media.create({
        id_oeuvre: articleId,
        type_media: 'image',
        url: `/uploads/articles/${file.filename}`,
        titre: meta.titre || file.originalname,
        description: meta.description,
        nom_fichier: file.originalname,
        taille_fichier: file.size,
        mime_type: file.mimetype,
        visible_public: true,
        date_creation: new Date()
      }, { transaction });

      await transaction.commit();
      return { data: media };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Dupliquer un bloc
   */
  async duplicateBlock(blockId) {
    const transaction = await this.sequelize.transaction();

    try {
      const originalBlock = await this.repository.findById(blockId);

      if (!originalBlock) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

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
   * Réorganiser les ordres après suppression d'un bloc
   */
  async _reorderAfterDelete(articleId, deletedOrdre, transaction) {
    await this.repository.model.update(
      { ordre: this.sequelize.literal('ordre - 1') },
      {
        where: {
          id_article: articleId,
          ordre: { [Op.gt]: deletedOrdre }
        },
        transaction
      }
    );
  }
}

module.exports = ArticleBlockService;
