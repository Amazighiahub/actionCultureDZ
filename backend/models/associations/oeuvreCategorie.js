const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OeuvreCategorie = sequelize.define('OeuvreCategorie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    id_categorie: {
      type: DataTypes.INTEGER,
      references: {
        model: 'categorie',
        key: 'id_categorie'
      }
    }
  }, {
    tableName: 'oeuvrecategories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['id_oeuvre', 'id_categorie']
      }
    ]
  });

  // Associations
  OeuvreCategorie.associate = (models) => {
    OeuvreCategorie.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    OeuvreCategorie.belongsTo(models.Categorie, { foreignKey: 'id_categorie' });
  };

  return OeuvreCategorie;
};
