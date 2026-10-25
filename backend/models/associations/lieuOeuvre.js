/**
 * LieuOeuvre — pages détaillées d'un lieu patrimoine : un article (éditeur avancé) relié à une
 * section du lieu (gastronomie : « La rechta » ; histoire : « La bataille d'Alger »…).
 * Le texte de la section (detail_lieux) reste le résumé ; l'article est la page complète.
 */
const { DataTypes } = require('sequelize');

const SECTIONS_PATRIMOINE = [
  'histoire', 'architecture', 'traditions', 'gastronomie', 'artisanat_local',
  'personnalites', 'infos_pratiques', 'referencesHistoriques'
];

module.exports = (sequelize) => {
  const LieuOeuvre = sequelize.define('LieuOeuvre', {
    id_lieu_oeuvre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'lieu', key: 'id_lieu' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'oeuvre', key: 'id_oeuvre' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    section_patrimoine: {
      type: DataTypes.ENUM(...SECTIONS_PATRIMOINE),
      allowNull: false
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    id_contributeur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id_user' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'lieu_oeuvre',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      { unique: true, fields: ['id_lieu', 'id_oeuvre', 'section_patrimoine'], name: 'uk_lieu_oeuvre_section' },
      { fields: ['id_oeuvre'], name: 'idx_lieu_oeuvre_oeuvre' }
    ]
  });

  LieuOeuvre.associate = (models) => {
    LieuOeuvre.belongsTo(models.Lieu, { foreignKey: 'id_lieu', as: 'Lieu', onDelete: 'CASCADE' });
    LieuOeuvre.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'Oeuvre', onDelete: 'CASCADE' });
  };

  LieuOeuvre.SECTIONS = SECTIONS_PATRIMOINE;
  return LieuOeuvre;
};
