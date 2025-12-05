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
    communeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      }
    }
  }, {
    tableName: 'lieu',
    timestamps: true,
    indexes: [
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['communeId']
      },
      {
        fields: ['localiteId']
      }
    ]
  });

  // Associations
  Lieu.associate = (models) => {
    // Relations simplifiées - hiérarchie via commune seulement
    Lieu.belongsTo(models.Commune, { foreignKey: 'communeId' });
    Lieu.belongsTo(models.Localite, { foreignKey: 'localiteId' });
    
    // Relations one-to-one et one-to-many
    Lieu.hasOne(models.DetailLieu, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Lieu.hasMany(models.Service, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Lieu.hasMany(models.LieuMedia, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Lieu.hasMany(models.QrCode, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    
    // Relations avec événements
    Lieu.hasMany(models.Evenement, { foreignKey: 'id_lieu' });
    Lieu.hasMany(models.Programme, { foreignKey: 'id_lieu' });
    
    // Relation many-to-many avec parcours
    Lieu.belongsToMany(models.Parcours, { 
      through: models.ParcoursLieu, 
      foreignKey: 'id_lieu' 
    });
  };

  return Lieu;
};