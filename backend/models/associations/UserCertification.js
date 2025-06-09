const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserCertification = sequelize.define('UserCertification', {
    id_certification: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    nom_certification: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    organisme: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    numero_certification: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    date_obtention: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_expiration: {
      type: DataTypes.DATE,
      allowNull: true
    },
    url_verification: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    fichier_certificat: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    verifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    date_verification: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'user_certifications',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification'
  });

  return UserCertification;
};