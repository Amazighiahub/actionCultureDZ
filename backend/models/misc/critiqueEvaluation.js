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
      type: DataTypes.INTEGER
    },
    commentaire: {
      type: DataTypes.TEXT
    },
    date_creation: {
      type: DataTypes.DATE
    },
    date_modification: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'critique_evaluation',
    timestamps: false
  });

  // Associations
  CritiqueEvaluation.associate = (models) => {
    CritiqueEvaluation.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    CritiqueEvaluation.belongsTo(models.User, { foreignKey: 'id_user' });
  };

  return CritiqueEvaluation;
};