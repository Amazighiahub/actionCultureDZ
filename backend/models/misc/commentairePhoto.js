// Photo jointe par un visiteur à son avis sur un service (3 au plus par avis).
// Affichée seulement après validation de l'équipe (statut « publie »).
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommentairePhoto = sequelize.define('CommentairePhoto', {
    id_photo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_commentaire: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'commentaire', key: 'id_commentaire' } },
    id_user: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'user', key: 'id_user' } },
    url: { type: DataTypes.STRING(500), allowNull: false },
    statut: { type: DataTypes.ENUM('en_attente', 'publie', 'rejete'), allowNull: false, defaultValue: 'en_attente' },
    accord_droits_le: { type: DataTypes.DATE, allowNull: false },
    motif_refus: { type: DataTypes.STRING(1000), allowNull: true },
    id_moderateur: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'user', key: 'id_user' } },
    date_moderation: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'commentaire_photo',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [{ fields: ['id_commentaire'] }, { fields: ['statut', 'date_creation'] }],
  });

  CommentairePhoto.associate = (models) => {
    CommentairePhoto.belongsTo(models.Commentaire, { foreignKey: 'id_commentaire', as: 'Avis', onDelete: 'CASCADE' });
    CommentairePhoto.belongsTo(models.User, { foreignKey: 'id_user', as: 'Auteur', onDelete: 'SET NULL' });
  };

  return CommentairePhoto;
};
