// models/Organisation.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Organisation = sequelize.define('Organisation', {
    id_organisation: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Ministère de la Culture", ar: "وزارة الثقافة", en: "Ministry of Culture" }'
    },
    id_type_organisation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'typeorganisation',
        key: 'id_type_organisation'
      }
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    site_web: {
      type: DataTypes.STRING(255)
    },
    // Page publique : visible une fois vérifiée par la modération
    statut: {
      type: DataTypes.ENUM('en_attente', 'valide', 'rejete'),
      allowNull: false,
      defaultValue: 'en_attente'
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    id_wilaya: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'wilayas',
        key: 'id_wilaya'
      }
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    telephone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    // { facebook, instagram, youtube, x, linkedin } : adresses des pages
    reseaux: {
      type: DataTypes.JSON,
      allowNull: true
    },
    date_creation: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'organisation',
    timestamps: false
  });

  // Associations
  Organisation.associate = (models) => {
    Organisation.belongsTo(models.TypeOrganisation, { foreignKey: 'id_type_organisation' });
    if (models.Wilaya) Organisation.belongsTo(models.Wilaya, { foreignKey: 'id_wilaya', onDelete: 'SET NULL' });
    Organisation.belongsToMany(models.Evenement, { 
      through: models.EvenementOrganisation, 
      foreignKey: 'id_organisation' 
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Organisation.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Organisation.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Organisation;
};
