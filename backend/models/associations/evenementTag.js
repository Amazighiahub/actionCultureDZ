const { DataTypes } = require('sequelize');

/** Mots-clés d'un événement (même table de mots-clés que les œuvres : tagmotcle) */
module.exports = (sequelize) => {
  const EvenementTag = sequelize.define('EvenementTag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'evenement', key: 'id_evenement' }
    },
    id_tag: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tagmotcle', key: 'id_tag' }
    }
  }, {
    tableName: 'evenementtags',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['id_tag', 'id_evenement'] },
      { fields: ['id_evenement'] }
    ]
  });

  EvenementTag.associate = (models) => {
    EvenementTag.belongsTo(models.Evenement, { foreignKey: 'id_evenement', onDelete: 'CASCADE' });
    EvenementTag.belongsTo(models.TagMotCle, { foreignKey: 'id_tag', onDelete: 'CASCADE' });
  };

  return EvenementTag;
};
