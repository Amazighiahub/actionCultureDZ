// Connexion ouverte sur un appareil : le téléphone et l'ordinateur ont chacun la leur.
// Seule l'empreinte du jeton est gardée, jamais le jeton lui-même.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SessionConnexion = sequelize.define('SessionConnexion', {
    id_session: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_user: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'user', key: 'id_user' } },
    jeton_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    // Jeton précédent, accepté quelques minutes : la réponse a pu se perdre sur un réseau mobile
    jeton_precedent_hash: { type: DataTypes.STRING(64), allowNull: true },
    precedent_jusqua: { type: DataTypes.DATE, allowNull: true },
    expire_le: { type: DataTypes.DATE, allowNull: false },
    date_creation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'session_connexion',
    timestamps: false,
    indexes: [{ fields: ['id_user'] }, { fields: ['jeton_precedent_hash'] }, { fields: ['expire_le'] }],
  });

  SessionConnexion.associate = (models) => {
    SessionConnexion.belongsTo(models.User, { foreignKey: 'id_user', as: 'Utilisateur', onDelete: 'CASCADE' });
  };

  return SessionConnexion;
};
