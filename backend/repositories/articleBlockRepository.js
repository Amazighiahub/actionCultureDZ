/**
 * ArticleBlockRepository - Repository pour les blocs d'articles
 * Encapsule tous les accès Sequelize pour le modèle ArticleBlock
 */
const BaseRepository = require('./baseRepository');

class ArticleBlockRepository extends BaseRepository {
  constructor(models) {
    super(models.ArticleBlock);
    this.models = models;
    this.sequelize = models.sequelize || models.ArticleBlock.sequelize;
  }

  /**
   * Include média par défaut
   */
  _mediaInclude() {
    if (!this.models.Media) return [];
    return [{ model: this.models.Media, as: 'media', required: false }];
  }

  /**
   * Blocs d'un article, triés par ordre
   */
  async findByArticle(articleId, articleType = 'article') {
    return this.model.findAll({
      where: { id_article: articleId, article_type: articleType },
      include: this._mediaInclude(),
      order: [['ordre', 'ASC']]
    });
  }

  /**
   * Un bloc avec son média
   */
  async findWithMedia(blockId) {
    return this.model.findByPk(blockId, {
      include: this._mediaInclude()
    });
  }

  /**
   * Prochain ordre disponible pour un article
   */
  async getNextOrdre(articleId, articleType = 'article') {
    const maxOrdre = await this.model.max('ordre', {
      where: { id_article: articleId, article_type: articleType }
    });
    return (maxOrdre || 0) + 1;
  }

  /**
   * Réordonne les blocs d'un article
   */
  async reorder(articleId, articleType, orderedIds, transaction) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.model.update(
        { ordre: i + 1 },
        { where: { id_block: orderedIds[i], id_article: articleId, article_type: articleType }, transaction }
      );
    }
  }

  /**
   * Supprime tous les blocs d'un article
   */
  async deleteByArticle(articleId, articleType = 'article', transaction) {
    return this.model.destroy({
      where: { id_article: articleId, article_type: articleType },
      ...(transaction ? { transaction } : {})
    });
  }
}

module.exports = ArticleBlockRepository;
