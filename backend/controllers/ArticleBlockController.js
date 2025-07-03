// controllers/ArticleBlockController.js
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class ArticleBlockController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    if (!this.sequelize) {
      console.error('❌ Sequelize non trouvé dans les modèles!');
    } else {
      console.log('✅ ArticleBlockController initialisé avec succès');
    }
  }

  /**
   * Récupérer tous les blocs d'un article
   */
  async getBlocksByArticle(req, res) {
    try {
      const { articleId, articleType } = req.params;
      
      const blocks = await this.models.ArticleBlock.findAll({
        where: { 
          id_article: articleId,
          article_type: articleType || 'article'
        },
        include: [{
          model: this.models.Media,
          as: 'media',
          required: false
        }],
        order: [['ordre', 'ASC']]
      });

      res.json({
        success: true,
        data: blocks
      });

    } catch (error) {
      console.error('❌ Erreur récupération blocs:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des blocs' 
      });
    }
  }

  /**
   * Créer un nouveau bloc
   */
  async createBlock(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const {
        id_article,
        article_type = 'article',
        type_block,
        contenu,
        contenu_json,
        metadata = {},
        id_media
      } = req.body;

      // Validation
      if (!id_article || !type_block) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Article ID et type de bloc requis'
        });
      }

      // Déterminer l'ordre
      const ordre = await this.models.ArticleBlock.getNextOrder(id_article);

      // Créer le bloc
      const block = await this.models.ArticleBlock.create({
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

      // Récupérer le bloc avec ses associations
      const newBlock = await this.models.ArticleBlock.findByPk(block.id_block, {
        include: [{
          model: this.models.Media,
          as: 'media'
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Bloc créé avec succès',
        data: newBlock
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur création bloc:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création du bloc' 
      });
    }
  }

  /**
   * Créer plusieurs blocs en batch
   */
  async createMultipleBlocks(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id_article, article_type = 'article', blocks } = req.body;

      if (!id_article || !blocks || !Array.isArray(blocks)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Article ID et tableau de blocs requis'
        });
      }

      // Supprimer les anciens blocs
      await this.models.ArticleBlock.destroy({
        where: { id_article, article_type },
        transaction
      });

      // Créer les nouveaux blocs
      const createdBlocks = [];
      for (let i = 0; i < blocks.length; i++) {
        const blockData = {
          ...blocks[i],
          id_article,
          article_type,
          ordre: i
        };

        const block = await this.models.ArticleBlock.create(blockData, { transaction });
        createdBlocks.push(block);
      }

      await transaction.commit();

      // Récupérer les blocs avec associations
      const newBlocks = await this.models.ArticleBlock.findAll({
        where: { id_article, article_type },
        include: [{
          model: this.models.Media,
          as: 'media'
        }],
        order: [['ordre', 'ASC']]
      });

      res.json({
        success: true,
        message: `${createdBlocks.length} blocs créés avec succès`,
        data: newBlocks
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur création multiple:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création des blocs' 
      });
    }
  }

  /**
   * Mettre à jour un bloc
   */
  async updateBlock(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { blockId } = req.params;
      const updates = req.body;

      const block = await this.models.ArticleBlock.findByPk(blockId, { transaction });

      if (!block) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Bloc non trouvé' 
        });
      }

      // Mettre à jour les champs autorisés
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

      // Récupérer le bloc mis à jour avec associations
      const updatedBlock = await this.models.ArticleBlock.findByPk(blockId, {
        include: [{
          model: this.models.Media,
          as: 'media'
        }]
      });

      res.json({
        success: true,
        message: 'Bloc mis à jour avec succès',
        data: updatedBlock
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur mise à jour bloc:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la mise à jour' 
      });
    }
  }

  /**
   * Supprimer un bloc
   */
  async deleteBlock(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { blockId } = req.params;

      const block = await this.models.ArticleBlock.findByPk(blockId, { transaction });

      if (!block) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Bloc non trouvé' 
        });
      }

      await block.destroy({ transaction });

      // Réorganiser les blocs restants
      await this.reorderAfterDelete(block.id_article, block.ordre, transaction);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Bloc supprimé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur suppression bloc:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la suppression' 
      });
    }
  }

  /**
   * Réorganiser les blocs
   */
  async reorderBlocks(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { articleId } = req.params;
      const { blockIds } = req.body;

      if (!Array.isArray(blockIds)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'blockIds doit être un tableau'
        });
      }

      // Vérifier que tous les blocs appartiennent à l'article
      const blocks = await this.models.ArticleBlock.findAll({
        where: {
          id_block: blockIds,
          id_article: articleId
        },
        transaction
      });

      if (blocks.length !== blockIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Certains blocs n\'appartiennent pas à cet article'
        });
      }

      // Mettre à jour l'ordre
      for (let i = 0; i < blockIds.length; i++) {
        await this.models.ArticleBlock.update(
          { ordre: i },
          { 
            where: { 
              id_block: blockIds[i],
              id_article: articleId 
            },
            transaction 
          }
        );
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Ordre des blocs mis à jour'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur réorganisation blocs:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Uploader une image pour un bloc
   */
  async uploadBlockImage(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { articleId } = req.params;
      const file = req.file;

      if (!file) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'Aucun fichier fourni' 
        });
      }

      // Créer l'entrée média
      const media = await this.models.Media.create({
        id_oeuvre: articleId, // Lié à l'œuvre parent
        type_media: 'image',
        url: `/uploads/articles/${file.filename}`,
        titre: req.body.titre || file.originalname,
        description: req.body.description,
        nom_fichier: file.originalname,
        taille_fichier: file.size,
        mime_type: file.mimetype,
        visible_public: true,
        date_creation: new Date()
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Image uploadée avec succès',
        data: media
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur upload image:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de l\'upload' 
      });
    }
  }

  /**
   * Dupliquer un bloc
   */
  async duplicateBlock(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { blockId } = req.params;

      const originalBlock = await this.models.ArticleBlock.findByPk(blockId, { transaction });

      if (!originalBlock) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Bloc non trouvé' 
        });
      }

      // Créer une copie
      const newBlock = await this.models.ArticleBlock.create({
        id_article: originalBlock.id_article,
        article_type: originalBlock.article_type,
        type_block: originalBlock.type_block,
        contenu: originalBlock.contenu,
        contenu_json: originalBlock.contenu_json,
        id_media: originalBlock.id_media,
        metadata: originalBlock.metadata,
        ordre: await this.models.ArticleBlock.getNextOrder(originalBlock.id_article),
        visible: originalBlock.visible
      }, { transaction });

      await transaction.commit();

      const duplicatedBlock = await this.models.ArticleBlock.findByPk(newBlock.id_block, {
        include: [{
          model: this.models.Media,
          as: 'media'
        }]
      });

      res.json({
        success: true,
        message: 'Bloc dupliqué avec succès',
        data: duplicatedBlock
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur duplication bloc:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Obtenir les templates de blocs
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

      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      console.error('❌ Erreur templates:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ==================================================
  // MÉTHODES HELPER
  // ==================================================

  /**
   * Réorganiser après suppression
   */
  async reorderAfterDelete(articleId, deletedOrdre, transaction) {
    await this.models.ArticleBlock.update(
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

module.exports = ArticleBlockController;