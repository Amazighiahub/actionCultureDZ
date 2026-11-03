// Appareil qui a accepté les notifications sur le téléphone (une ligne par navigateur)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushAbonnement = sequelize.define('PushAbonnement', {
    id_abonnement: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_user: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'user', key: 'id_user' } },
    endpoint: { type: DataTypes.STRING(512), allowNull: false, unique: true },
    p256dh: { type: DataTypes.STRING(255), allowNull: false },
    auth: { type: DataTypes.STRING(255), allowNull: false },
    date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'push_abonnement',
    timestamps: false,
    indexes: [{ fields: ['id_user'] }],
  });

  PushAbonnement.associate = (models) => {
    PushAbonnement.belongsTo(models.User, { foreignKey: 'id_user', as: 'Utilisateur', onDelete: 'CASCADE' });
  };

  return PushAbonnement;
};
