const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Artisanat = sequelize.define('Artisanat', {
    id_artisanat: {
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
    id_materiau: {
      type: DataTypes.INTEGER,
      references: {
        model: 'materiau',
        key: 'id_materiau'
      }
    },
    id_technique: {
      type: DataTypes.INTEGER,
      references: {
        model: 'technique',
        key: 'id_technique'
      }
    },
    dimensions: {
      type: DataTypes.STRING(255)
    },
    poids: {
      type: DataTypes.DECIMAL(8, 3)
    },
    prix: {
      type: DataTypes.DECIMAL(10, 2),
      validate: { min: 0 },
      comment: 'Prix (minimum si prix_max est renseigné)'
    },
    prix_max: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 }
    },
    delai_fabrication: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 },
      comment: 'Délai de fabrication, en jours'
    },
    en_stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 }
    },
    sur_commande: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'artisanat',
    timestamps: false,
    indexes: [
      { fields: ['id_oeuvre'] },
      { fields: ['id_materiau'] },
      { fields: ['id_technique'] }
    ]
  });

  // Associations
  Artisanat.associate = (models) => {
    Artisanat.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    Artisanat.belongsTo(models.Materiau, { foreignKey: 'id_materiau' });
    Artisanat.belongsTo(models.Technique, { foreignKey: 'id_technique' });
  };

  // Comme Oeuvre, Evenement et Lieu : favoris, vues et signalements de la fiche partent avec elle
  // (avant : ils restaient en base, orphelins ; audit V11 BDD-22)
  Artisanat.afterDestroy(async (artisanat, options) => {
    const { Favori, Vue, Signalement } = sequelize.models;
    const id = artisanat.id_artisanat;
    const tx = options?.transaction ? { transaction: options.transaction } : {};
    if (Favori) await Favori.destroy({ where: { type_entite: 'artisanat', id_entite: id }, ...tx });
    if (Vue) await Vue.destroy({ where: { type_entite: 'artisanat', id_entite: id }, ...tx });
    if (Signalement) await Signalement.destroy({ where: { type_entite: 'artisanat', id_entite: id }, ...tx });
  });

  return Artisanat;
};
