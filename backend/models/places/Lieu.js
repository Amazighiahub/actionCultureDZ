const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lieu = sequelize.define('Lieu', {
    id_lieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    typeLieu: {
      type: DataTypes.ENUM('Wilaya', 'Daira', 'Commune'),
      allowNull: false
    },
    wilayaId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'wilayas',
        key: 'id_wilaya'
      }
    },
    dairaId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'dairas',
        key: 'id_daira'
      }
    },
    communeId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'communes',
        key: 'id_commune'
      }
    },
    localiteId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'localite',
        key: 'id_localite'
      }
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    tableName: 'lieu',
    timestamps: true
  });

  // Associations
  Lieu.associate = (models) => {
    Lieu.belongsTo(models.Wilaya, { foreignKey: 'wilayaId' });
    Lieu.belongsTo(models.Daira, { foreignKey: 'dairaId' });
    Lieu.belongsTo(models.Commune, { foreignKey: 'communeId' });
    Lieu.belongsTo(models.Localite, { foreignKey: 'localiteId' });
    
    Lieu.hasOne(models.DetailLieu, { foreignKey: 'id_lieu' });
    Lieu.hasMany(models.Service, { foreignKey: 'id_lieu' });
    Lieu.hasMany(models.LieuMedia, { foreignKey: 'id_lieu' });
    Lieu.hasMany(models.Evenement, { foreignKey: 'id_lieu' });
    Lieu.hasMany(models.Programme, { foreignKey: 'id_lieu' });
    
    Lieu.belongsToMany(models.Parcours, { 
      through: models.ParcoursLieu, 
      foreignKey: 'id_lieu' 
    });
  };

  return Lieu;
};