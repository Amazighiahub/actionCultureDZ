// Lien publié par un professionnel : article de presse, YouTube, Instagram, TikTok ou Facebook.
// Sur son portfolio, et sur la fiche de l'œuvre ou de l'événement auquel il est rattaché.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LienExterne = sequelize.define('LienExterne', {
    id_lien: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_user: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'user', key: 'id_user' } },
    type_lien: { type: DataTypes.ENUM('presse', 'youtube', 'instagram', 'tiktok', 'facebook'), allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    titre: { type: DataTypes.STRING(200), allowNull: true },
    source: { type: DataTypes.STRING(100), allowNull: true },
    date_publication: { type: DataTypes.DATEONLY, allowNull: true },
    id_oeuvre: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'oeuvre', key: 'id_oeuvre' } },
    id_evenement: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'evenement', key: 'id_evenement' } },
    date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'lien_externe',
    timestamps: false,
    indexes: [{ fields: ['id_user'] }, { fields: ['id_oeuvre'] }, { fields: ['id_evenement'] }],
  });

  LienExterne.associate = (models) => {
    LienExterne.belongsTo(models.User, { foreignKey: 'id_user', as: 'Proprietaire', onDelete: 'CASCADE' });
    LienExterne.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'Oeuvre', onDelete: 'SET NULL' });
    LienExterne.belongsTo(models.Evenement, { foreignKey: 'id_evenement', as: 'Evenement', onDelete: 'SET NULL' });
  };

  return LienExterne;
};
