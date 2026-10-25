/**
 * ArticleRevision — proposition de modification d'un article publié (éditeur avancé).
 * Une personne connectée complète ou corrige l'article et explique pourquoi (motif) ; la
 * proposition reste un brouillon, invisible des visiteurs, jusqu'à ce que l'auteur de l'article
 * ou l'administration l'accepte (elle remplace alors l'article) ou la refuse.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleRevision = sequelize.define('ArticleRevision', {
    id_revision: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'oeuvre', key: 'id_oeuvre' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    id_auteur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id_user' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Personne qui propose la modification'
    },
    motif: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Pourquoi : ajout, correction, nouvelle photo…'
    },
    contenu: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '{ titre, description, blocks } : la version complète proposée'
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'acceptee', 'refusee'),
      allowNull: false,
      defaultValue: 'en_attente'
    },
    id_decideur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id_user' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    motif_refus: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_decision: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'article_revision',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      { fields: ['id_oeuvre', 'statut'], name: 'idx_article_revision_oeuvre_statut' },
      { fields: ['id_auteur'], name: 'idx_article_revision_auteur' }
    ]
  });

  ArticleRevision.associate = (models) => {
    ArticleRevision.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'Oeuvre', onDelete: 'CASCADE' });
    ArticleRevision.belongsTo(models.User, { foreignKey: 'id_auteur', as: 'Auteur', constraints: false });
    ArticleRevision.belongsTo(models.User, { foreignKey: 'id_decideur', as: 'Decideur', constraints: false });
  };

  return ArticleRevision;
};
