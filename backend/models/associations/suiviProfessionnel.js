// Une personne suit un professionnel : elle est prévenue de ses nouvelles publications
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SuiviProfessionnel = sequelize.define('SuiviProfessionnel', {
    id_suivi: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_user: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'user', key: 'id_user' } },
    id_professionnel: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'user', key: 'id_user' } },
    date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'suivi_professionnel',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['id_user', 'id_professionnel'], name: 'uk_suivi_professionnel' },
      { fields: ['id_professionnel'], name: 'idx_suivi_professionnel_pro' },
    ],
  });

  SuiviProfessionnel.associate = (models) => {
    SuiviProfessionnel.belongsTo(models.User, { foreignKey: 'id_user', as: 'Abonne', onDelete: 'CASCADE' });
    SuiviProfessionnel.belongsTo(models.User, { foreignKey: 'id_professionnel', as: 'Professionnel', onDelete: 'CASCADE' });
  };

  return SuiviProfessionnel;
};
