/**
 * LieuIntervenant — Association Lieu patrimoine ↔ Intervenant (personnalité)
 *
 * L'intervenant peut avoir id_user NULL (personne non inscrite) ou lié à un compte.
 * Cette table ne remplace pas detail_lieux.personnalites (texte d'intro) ni les
 * blocs article_block section_patrimoine = 'personnalites'.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LieuIntervenant = sequelize.define('LieuIntervenant', {
    id_lieu_intervenant: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    id_intervenant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'intervenant',
        key: 'id_intervenant'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    role_sur_site: {
      type: DataTypes.STRING(80),
      allowNull: true,
      comment: 'figure_historique, artisan_local, artiste, ecrivain, fondateur, etc.'
    },
    periode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contexte: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Bio ou contexte spécifique à ce lieu'
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    id_contributeur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'lieu_intervenant',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['id_lieu', 'id_intervenant'],
        name: 'uk_lieu_intervenant'
      },
      {
        fields: ['id_lieu', 'ordre'],
        name: 'idx_lieu_intervenant_lieu_ordre'
      },
      {
        fields: ['id_intervenant'],
        name: 'idx_lieu_intervenant_intervenant'
      }
    ]
  });

  LieuIntervenant.associate = (models) => {
    LieuIntervenant.belongsTo(models.Lieu, {
      foreignKey: 'id_lieu',
      as: 'Lieu',
      onDelete: 'CASCADE'
    });

    LieuIntervenant.belongsTo(models.Intervenant, {
      foreignKey: 'id_intervenant',
      as: 'Intervenant',
      onDelete: 'CASCADE'
    });

    if (models.User) {
      LieuIntervenant.belongsTo(models.User, {
        foreignKey: 'id_contributeur',
        as: 'Contributeur',
        onDelete: 'SET NULL',
        constraints: false
      });
    }
  };

  return LieuIntervenant;
};
