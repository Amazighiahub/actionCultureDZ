/**
 * LieuNotation — note (1 à 5) d'un site patrimoine par un utilisateur, une seule par couple.
 * La moyenne affichée sur la fiche (DetailLieu.noteMoyenne / nb_notations) en est dérivée.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LieuNotation = sequelize.define('LieuNotation', {
    id_lieu_notation: {
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
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'user', key: 'id_user' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    note: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: { min: 1, max: 5 }
    }
  }, {
    tableName: 'lieu_notation',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [{ unique: true, fields: ['id_lieu', 'id_user'], name: 'uk_lieu_notation_lieu_user' }]
  });

  return LieuNotation;
};
