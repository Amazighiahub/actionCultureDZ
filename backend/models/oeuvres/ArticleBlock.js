// ================================================
// 1. MODÈLE SEQUELIZE - models/oeuvres/ArticleBlock.js
// ================================================

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleBlock = sequelize.define('ArticleBlock', {
    id_block: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_article: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'article',
        key: 'id_article'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    type_block: {
      type: DataTypes.ENUM(
        'text',          // Paragraphe de texte
        'heading',       // Titre (h1, h2, h3...)
        'image',         // Image via table Media
        'video',         // Vidéo via table Media
        'citation',      // Citation/Quote
        'code',          // Bloc de code
        'list',          // Liste à puces ou numérotée
        'table',         // Tableau
        'separator',     // Séparateur/HR
        'embed'          // Contenu embarqué (iframe, etc.)
      ),
      allowNull: false
      },
     // Type d'article (polymorphique)
     article_type: {
        type: DataTypes.ENUM('article', 'article_scientifique'),
        allowNull: false,
        comment: 'Type d\'article auquel ce bloc appartient'
      },
    contenu: {
      type: DataTypes.TEXT,
      comment: 'Contenu texte pour text/heading/citation/code/list'
    },
    contenu_json: {
      type: DataTypes.JSON,
      comment: 'Contenu structuré pour table/list complexes'
    },
    id_media: {
      type: DataTypes.INTEGER,
      references: {
        model: 'media',
        key: 'id_media'
      },
      onDelete: 'SET NULL',
      comment: 'Référence au média pour image/video'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'layout, level, language, style, etc.'
    },
    visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'article_block',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        fields: ['id_article', 'ordre']
      },
      {
        fields: ['type_block']
      },
      {
        fields: ['id_media']
      }
    ]
  });

  // Associations
  ArticleBlock.associate = (models) => {
    // Association avec Article
    ArticleBlock.belongsTo(models.Article, {
      foreignKey: 'id_article',
      constraints: false,
      as: 'article',
      scope: {
        article_type: 'article'
      }
    });

    // Association avec ArticleScientifique
    ArticleBlock.belongsTo(models.ArticleScientifique, {
      foreignKey: 'id_article',
      constraints: false,
      as: 'articleScientifique',
      scope: {
        article_type: 'article_scientifique'
      }
    });
    
    ArticleBlock.belongsTo(models.Media, { 
      foreignKey: 'id_media',
      as: 'media'
    });
  };

  // Méthodes d'instance
  ArticleBlock.prototype.getDisplayContent = function() {
    switch (this.type_block) {
      case 'text':
      case 'heading':
      case 'citation':
      case 'code':
        return this.contenu;
      case 'list':
      case 'table':
        return this.contenu_json;
      case 'image':
      case 'video':
        return this.media;
      default:
        return null;
    }
  };
  ArticleBlock.prototype.isLinkedTo = function(blockId) {
    return this.linked_blocks.includes(blockId);
  };

  ArticleBlock.prototype.addLink = function(blockId) {
    const links = this.linked_blocks || [];
    if (!links.includes(blockId)) {
      links.push(blockId);
      this.linked_blocks = links;
    }
  };

  ArticleBlock.prototype.removeLink = function(blockId) {
    const links = this.linked_blocks || [];
    const index = links.indexOf(blockId);
    if (index > -1) {
      links.splice(index, 1);
      this.linked_blocks = links;
    }
  };

  // Méthodes statiques
  ArticleBlock.getNextOrder = async function(id_article) {
    const maxOrder = await this.max('ordre', {
      where: { id_article }
    });
    return (maxOrder || -1) + 1;
  };

  ArticleBlock.reorderBlocks = async function(id_article, blockIds) {
    const transaction = await sequelize.transaction();
    
    try {
      for (let i = 0; i < blockIds.length; i++) {
        await this.update(
          { ordre: i },
          {
            where: { 
              id_block: blockIds[i],
              id_article 
            },
            transaction
          }
        );
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  return ArticleBlock;
};

