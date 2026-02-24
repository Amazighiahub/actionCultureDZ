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
    }
  }, {
    tableName: 'organisation',
    timestamps: false
  });

  // Associations
  Organisation.associate = (models) => {
    Organisation.belongsTo(models.TypeOrganisation, { foreignKey: 'id_type_organisation' });
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
