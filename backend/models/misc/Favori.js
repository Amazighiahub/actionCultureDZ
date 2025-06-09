const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Favori = sequelize.define('Favori', {
    id_favori: {
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
    type_entite: {
      type: DataTypes.ENUM('oeuvre', 'evenement', 'lieu', 'artisanat'),
      allowNull: false
    },
    id_entite: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_ajout: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'favoris',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['id_user', 'type_entite', 'id_entite']
      },
      {
        fields: ['type_entite', 'id_entite']
      },
      {
        fields: ['id_user']
      },
      {
        fields: ['date_ajout']
      }
    ]
  });

  // Associations
  Favori.associate = (models) => {
    Favori.belongsTo(models.User, { foreignKey: 'id_user' });
  };

  return Favori;
};