const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OeuvreEditeur = sequelize.define('OeuvreEditeur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    id_editeur: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'editeur',
        key: 'id_editeur'
      }
    },
    role_editeur: {
      type: DataTypes.ENUM('editeur_principal', 'co_editeur', 'distributeur', 'editeur_original', 'editeur_traduction', 'editeur_numerique', 'reedition', 'autre'),
      defaultValue: 'editeur_principal'
    },
    date_edition: {
      type: DataTypes.DATE
    },
    isbn_editeur: {
      type: DataTypes.STRING(20)
    },
    tirage: {
      type: DataTypes.INTEGER
    },
    prix_vente: {
      type: DataTypes.DECIMAL(10, 2)
    },
    langue_edition: {
      type: DataTypes.STRING(10)
    },
    format: {
      type: DataTypes.STRING(100)
    },
    statut_edition: {
      type: DataTypes.ENUM('en_cours', 'publie', 'epuise', 'annule'),
      defaultValue: 'publie'
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'oeuvre_editeur',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['id_oeuvre', 'id_editeur', 'role_editeur']
      }
    ]
  });

  // Associations
  OeuvreEditeur.associate = (models) => {
    OeuvreEditeur.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    OeuvreEditeur.belongsTo(models.Editeur, { foreignKey: 'id_editeur' });
  };

  return OeuvreEditeur;
};