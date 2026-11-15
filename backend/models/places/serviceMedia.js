// Photo de la galerie ou menu (PDF ou image) d'un service (restaurant, hôtel…), migration 20261226
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServiceMedia = sequelize.define('ServiceMedia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_service: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'services', key: 'id' } },
    type: { type: DataTypes.ENUM('photo', 'menu'), allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    nom: { type: DataTypes.STRING(100), allowNull: true },
    ordre: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    id_user: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'user', key: 'id_user' } },
  }, {
    tableName: 'service_media',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [{ fields: ['id_service', 'type', 'ordre'] }],
  });

  ServiceMedia.associate = (models) => {
    ServiceMedia.belongsTo(models.Service, { foreignKey: 'id_service', onDelete: 'CASCADE' });
  };

  return ServiceMedia;
};
