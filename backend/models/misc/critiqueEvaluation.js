const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CritiqueEvaluation = sequelize.define('CritiqueEvaluation', {
    id_critique: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    note: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    commentaire: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'critique_evaluation',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification'
  });

  // Associations
  CritiqueEvaluation.associate = (models) => {
    CritiqueEvaluation.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', onDelete: 'CASCADE' });
    CritiqueEvaluation.belongsTo(models.User, { foreignKey: 'id_user', onDelete: 'CASCADE' });
  };

  return CritiqueEvaluation;
};