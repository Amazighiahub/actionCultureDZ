/**
 * IntervenantArticle — article complet (éditeur avancé) consacré à une personnalité
 * (« El Hadj M'hamed El Anka, le père du chaâbi »), affiché sur sa page.
 * Différent d'OeuvreIntervenant, qui relie une œuvre à ses auteurs et interprètes.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IntervenantArticle = sequelize.define('IntervenantArticle', {
    id_intervenant_article: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_intervenant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'intervenant', key: 'id_intervenant' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'oeuvre', key: 'id_oeuvre' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    id_contributeur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id_user' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'intervenant_article',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      { unique: true, fields: ['id_intervenant', 'id_oeuvre'], name: 'uk_intervenant_article' },
      { fields: ['id_oeuvre'], name: 'idx_intervenant_article_oeuvre' }
    ]
  });

  IntervenantArticle.associate = (models) => {
    IntervenantArticle.belongsTo(models.Intervenant, { foreignKey: 'id_intervenant', as: 'Intervenant', onDelete: 'CASCADE' });
    IntervenantArticle.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'Oeuvre', onDelete: 'CASCADE' });
  };

  return IntervenantArticle;
};
