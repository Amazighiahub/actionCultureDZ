const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OeuvreTag = sequelize.define('OeuvreTag', {
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
    id_tag: {
      type: DataTypes.INTEGER,
      references: {
        model: 'tagmotcle',
        key: 'id_tag'
      }
    }
  }, {
    tableName: 'oeuvretags',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['id_tag', 'id_oeuvre']
      }
    ]
  });

  // Associations
  OeuvreTag.associate = (models) => {
    OeuvreTag.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    OeuvreTag.belongsTo(models.TagMotCle, { foreignKey: 'id_tag' });
  };

  return OeuvreTag;
};