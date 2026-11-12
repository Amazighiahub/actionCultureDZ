/**
 * ArticleBlockService - Service pour la gestion des blocs d'articles
 * Architecture: Controller → Service → Repository → Database
 */
const BaseService = require('./core/baseService');
const { Op } = require('sequelize');
const { sanitizeBlockContent, sanitizeBlockJson } = require('../utils/sanitizeArticle');
const { peutGerer, estModeration, memeUtilisateur } = require('../utils/droits');

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
   * Blocs d'un article tels que le demandeur peut les voir : un article non publié (brouillon,
   * en attente, refusé) seulement par son auteur et la modération, comme la fiche de l'œuvre ;
   * les blocs masqués (visible: false) aussi. Les blocs « patrimoine » restent publics.
   * @returns {Promise<{ data?: Array, error?: string }>}
   */
  async getBlocksVisibles(articleId, articleType = 'article', user = null) {
    if (!EDITABLE_ARTICLE_TYPES.includes(articleType)) {
      const tous = await this.repository.findByArticle(articleId, articleType);
      if (articleType !== 'patrimoine' || !this.models?.Lieu) return { data: tous.filter(b => b.visible !== false) };
      // Site non publié : ses blocs ne sont pas publics, et les blocs masqués restent à son équipe
      const lieu = await this.models.Lieu.findByPk(articleId, { attributes: ['statut', 'id_createur'] });
      if (!lieu) return { error: 'notFound' };
      const gere = peutGerer(lieu.id_createur, { userId: user?.id_user ?? null, isModerator: estModeration(user) });
      if (lieu.statut !== 'publie' && !gere) return { error: 'notFound' };
      return { data: gere ? tous : tous.filter(b => b.visible !== false) };
    }
    const isScientifique = articleType === 'article_scientifique';
    const Model = isScientifique ? this.models?.ArticleScientifique : this.models?.Article;
    if (!Model || !this.models?.Oeuvre) return { data: await this.repository.findByArticle(articleId, articleType) };
    const parent = await Model.findByPk(articleId, {
      attributes: [isScientifique ? 'id_article_scientifique' : 'id_article', 'id_oeuvre'],
      include: [{ model: this.models.Oeuvre, attributes: ['saisi_par', 'statut'] }]
    });
    if (!parent) return { error: 'notFound' };
    const gere = peutGerer(parent.Oeuvre?.saisi_par, { userId: user?.id_user ?? null, isModerator: estModeration(user) });
    if (parent.Oeuvre?.statut !== 'publie' && !gere) return { error: 'notFound' };
    const blocks = await this.repository.findByArticle(articleId, articleType);
    return { data: gere ? blocks : blocks.filter(b => b.visible !== false) };
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
    if (!(await this._mediaAutorise(id_media, user))) return { error: 'forbidden' };

    const transaction = await this.sequelize.transaction();

    try {
      const ordre = await this.repository.getNextOrdre(id_article, article_type);

      const block = await this.repository.create({
        id_article,
        article_type,
        type_block,
        contenu: sanitizeBlockContent(type_block, contenu),
        contenu_json: sanitizeBlockJson(type_block, contenu_json),
        id_media,
        ordre,
        metadata,
        visible: true
      }, { transaction });

      await transaction.commit();

      const newBlock = await this.getBlockWithMedia(block.id_block);
      await this._signalerTexteModifie(access, user);
      await this._couvertureSuitPremiereImage(id_article, article_type);
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
    for (const b of blocks) {
      if (!(await this._mediaAutorise(b.id_media, user))) return { error: 'forbidden' };
    }

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
        blockData.contenu_json = sanitizeBlockJson(blockData.type_block, blockData.contenu_json);

        const block = await this.repository.create(blockData, { transaction });
        createdBlocks.push(block);
      }

      await transaction.commit();

      // Récupérer les blocs avec associations
      const newBlocks = await this.repository.findByArticle(id_article, article_type);

      await this._signalerTexteModifie(access, user);
      await this._couvertureSuitPremiereImage(id_article, article_type);
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
    if (updates.id_media !== undefined && Number(updates.id_media) !== Number(block.id_media)
        && !(await this._mediaAutorise(updates.id_media, user))) return { error: 'forbidden' };

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
      if (updates.contenu_json !== undefined || updates.type_block !== undefined) {
        block.contenu_json = sanitizeBlockJson(block.type_block, block.contenu_json);
      }

      await block.save({ transaction });
      await transaction.commit();

      const updatedBlock = await this.getBlockWithMedia(blockId);
      await this._signalerTexteModifie(access, user);
      await this._couvertureSuitPremiereImage(block.id_article, block.article_type);
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

      await this._signalerTexteModifie(access, user);
      await this._couvertureSuitPremiereImage(block.id_article, block.article_type);
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
      await this._couvertureSuitPremiereImage(articleId, articleType);
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
  /** Un bloc ne reprend qu'un média de son auteur : sinon il révélait le fichier privé d'un autre compte */
  async _mediaAutorise(idMedia, user) {
    if (!idMedia || !this.models?.Media || estModeration(user)) return true;
    const media = await this.models.Media.findByPk(idMedia, { attributes: ['metadata', 'id_oeuvre'] });
    if (!media) return false;
    if (media.metadata?.uploadedBy === user?.id_user) return true;
    if (!media.id_oeuvre || !this.models.Oeuvre) return false;
    const oeuvre = await this.models.Oeuvre.findByPk(media.id_oeuvre, { attributes: ['saisi_par'] });
    return peutGerer(oeuvre?.saisi_par, { userId: user?.id_user ?? null, isModerator: false });
  }

  async _checkCanEdit(idArticle, articleType, user) {
    if (!EDITABLE_ARTICLE_TYPES.includes(articleType)) return { error: 'badRequest' };
    if (user?.isAdmin) return {};

    const isScientifique = articleType === 'article_scientifique';
    const Model = isScientifique ? this.models?.ArticleScientifique : this.models?.Article;
    if (!Model || !this.models?.Oeuvre) return { error: 'forbidden' };

    const parent = await Model.findByPk(idArticle, {
      attributes: [isScientifique ? 'id_article_scientifique' : 'id_article', 'id_oeuvre'],
      include: [{ model: this.models.Oeuvre, attributes: ['saisi_par', 'id_oeuvre', 'statut', 'titre'] }]
    });
    if (!parent) return { error: 'notFound' };
    if (!user?.id_user || !memeUtilisateur(parent.Oeuvre?.saisi_par, user.id_user)) return { error: 'forbidden' };
    return { oeuvre: parent.Oeuvre };
  }

  /**
   * Article déjà publié dont l'auteur change les blocs : l'équipe est prévenue, comme pour une œuvre
   * modifiée (une fois par heure et par article : un texte se corrige en plusieurs fois)
   */
  async _signalerTexteModifie(access, user) {
    const oeuvre = access?.oeuvre;
    if (!oeuvre || oeuvre.statut !== 'publie' || user?.isAdmin) return;
    try {
      const { premiereFoisPendant } = require('./quotaEmail');
      if (!(await premiereFoisPendant(`moderation:article:${oeuvre.id_oeuvre}`, 3600))) return;
      const service = require('./serviceContainer').oeuvreService;
      await service?._signalerModificationPubliee?.(oeuvre, user.id_user, 'a modifié le texte de');
    } catch (err) {
      require('../utils/logger').error('Signalement de modification d’un article publié :', err.message);
    }
  }

  /**
   * L'image principale d'un article (sa carte dans les listes, l'accueil, les partages) suit la première
   * image visible de son contenu. Avant, c'était toujours la première image envoyée, souvent une ancienne
   * image retirée du texte, et l'éditeur d'article ne permettait pas de la changer.
   * Sans image dans le contenu, rien ne change. Jamais bloquant : une erreur est seulement journalisée.
   */
  async _couvertureSuitPremiereImage(idArticle, articleType) {
    const Media = this.models?.Media;
    const Model = articleType === 'article_scientifique' ? this.models?.ArticleScientifique : this.models?.Article;
    if (!Media || !Model) return;
    try {
      const parent = await Model.findByPk(idArticle, { attributes: ['id_oeuvre'] });
      const idOeuvre = parent?.id_oeuvre;
      if (!idOeuvre) return;
      const blocs = await this.repository.findByArticle(idArticle, articleType);
      const premiere = [...(blocs || [])]
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
        .find(b => b.type_block === 'image' && b.id_media && b.visible !== false);
      if (!premiere) return;
      // Seulement une image de cette œuvre : jamais le fichier d'un autre contenu
      const media = await Media.findOne({
        where: { id_media: premiere.id_media, id_oeuvre: idOeuvre, type_media: 'image' },
        attributes: ['id_media', 'is_Principale']
      });
      if (!media) return;
      const transaction = await this.sequelize.transaction();
      try {
        await Media.update({ is_Principale: false }, {
          where: { id_oeuvre: idOeuvre, is_Principale: true, id_media: { [Op.ne]: media.id_media } }, transaction
        });
        if (!media.is_Principale) await Media.update({ is_Principale: true }, { where: { id_media: media.id_media }, transaction });
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
      // Listes d'œuvres gardées en mémoire quelques minutes : la nouvelle image s'y voit tout de suite
      try { require('./serviceContainer').oeuvreService?.cache?.invalidate?.(); } catch { /* jamais bloquant */ }
    } catch (err) {
      require('../utils/logger').error('Image principale de l’article :', err.message);
    }
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
