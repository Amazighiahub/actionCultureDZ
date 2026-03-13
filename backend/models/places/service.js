// models/Service.js - ⚡ MODIFIÉ POUR I18N + PROFESSIONNELS
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: true, // Peut être null si coordonnées GPS fournies
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    // 🆕 Professionnel qui a créé le service
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Professionnel propriétaire du service'
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du service en plusieurs langues'
    },
    // 🆕 Type de service
    type_service: {
      type: DataTypes.ENUM('restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'location', 'autre'),
      allowNull: false,
      defaultValue: 'autre',
      comment: 'Type de service proposé'
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    // 🆕 Coordonnées GPS (si pas lié à un lieu existant)
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Latitude du service'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitude du service'
    },
    // 🆕 Adresse
    adresse: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Adresse en plusieurs langues'
    },
    // 🆕 Contact
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    site_web: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // 🆕 Horaires
    horaires: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Horaires en plusieurs langues ou structurés'
    },
    // 🆕 Tarifs
    tarif_min: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    tarif_max: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // 🆕 Statut de validation
    statut: {
      type: DataTypes.ENUM('en_attente', 'valide', 'rejete'),
      defaultValue: 'en_attente',
      comment: 'Statut de validation par admin'
    },
    // 🆕 Photo principale
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'services',
    timestamps: true,
    indexes: [
      { fields: ['id_lieu'] },
      { fields: ['id_user'] },
      { fields: ['statut'] },
      { fields: ['type_service'] }
    ]
  });

  // Associations
  Service.associate = (models) => {
    Service.belongsTo(models.Lieu, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    Service.belongsTo(models.User, { foreignKey: 'id_user', as: 'Professionnel', onDelete: 'SET NULL' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Service.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Service.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Service;
};
