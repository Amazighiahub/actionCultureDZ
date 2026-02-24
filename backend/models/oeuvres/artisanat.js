const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Artisanat = sequelize.define('Artisanat', {
    id_artisanat: {
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
    id_materiau: {
      type: DataTypes.INTEGER,
      references: {
        model: 'materiau',
        key: 'id_materiau'
      }
    },
    id_technique: {
      type: DataTypes.INTEGER,
      references: {
        model: 'technique',
        key: 'id_technique'
      }
    },
    dimensions: {
      type: DataTypes.STRING(255)
    },
    poids: {
      type: DataTypes.FLOAT
    },
    prix: {
      type: DataTypes.FLOAT
    },
    date_creation: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'artisanat',
    timestamps: false
  });

  // Associations
  Artisanat.associate = (models) => {
    Artisanat.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    Artisanat.belongsTo(models.Materiau, { foreignKey: 'id_materiau' });
    Artisanat.belongsTo(models.Technique, { foreignKey: 'id_technique' });
  };

  return Artisanat;
};
