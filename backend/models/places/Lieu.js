// models/Lieu.js - ⚡ MODIFIÉ POUR I18N
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
      allowNull: false,
      comment: 'Division administrative du lieu'
    },
    // ⚡ NOUVEAU - Type de patrimoine pour adapter l'affichage
    typePatrimoine: {
      type: DataTypes.ENUM(
        'ville_village',       // Contient monuments, vestiges, musées → parcours intelligent
        'monument',            // Mosquée, Palais, Fort, etc. → programmes, services
        'musee',               // Collections, expositions → programmes, billetterie
        'site_archeologique',  // Ruines, vestiges → programmes, visites guidées
        'site_naturel',        // Parcs, réserves → randonnées, parcours
        'edifice_religieux',   // Mosquées, zaouïas, églises
        'palais_forteresse',   // Palais, forts, citadelles
        'autre'
      ),
      allowNull: false,
      defaultValue: 'monument',
      comment: 'Type de patrimoine pour adapter les fonctionnalités affichées'
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
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du lieu en plusieurs langues { fr: "Casbah d\'Alger", ar: "قصبة الجزائر", en: "Casbah of Algiers" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    adresse: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Adresse en plusieurs langues'
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
    Lieu.belongsTo(models.Commune, { foreignKey: 'communeId' });
    Lieu.belongsTo(models.Localite, { foreignKey: 'localiteId' });
    
    Lieu.hasOne(models.DetailLieu, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Lieu.hasMany(models.Service, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Lieu.hasMany(models.LieuMedia, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Lieu.hasMany(models.QRCode, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    
    Lieu.hasMany(models.Evenement, { foreignKey: 'id_lieu' });
    Lieu.hasMany(models.Programme, { foreignKey: 'id_lieu' });
    
    Lieu.belongsToMany(models.Parcours, {
      through: models.ParcoursLieu,
      foreignKey: 'id_lieu',
      otherKey: 'id_parcours'
    });

    Lieu.hasMany(models.ParcoursLieu, {
      foreignKey: 'id_lieu',
      as: 'ParcoursLieux'
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Lieu.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Lieu.prototype.getAdresse = function(lang = 'fr') {
    return this.adresse?.[lang] || this.adresse?.fr || this.adresse?.ar || '';
  };

  return Lieu;
};
