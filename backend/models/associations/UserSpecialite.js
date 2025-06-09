const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSpecialite = sequelize.define('UserSpecialite', {
    id_user: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    id_specialite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'specialite',
        key: 'id_specialite'
      }
    },
    niveau: {
      type: DataTypes.ENUM('debutant', 'intermediaire', 'expert'),
      defaultValue: 'intermediaire'
    },
    annees_experience: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    date_ajout: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_specialite',
    timestamps: false
  });

  return UserSpecialite;
};