
// models/geography/Wilaya.js
module.exports = (sequelize, DataTypes /* , Sequelize */) => {
  const Wilaya = sequelize.define('Wilaya', {
    id_wilaya: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codeW: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'idx_codeW_unique',
      validate: {
        min: 1,
        // adapte si besoin (ex: 58 wilayas)
        // max: 58,
      },
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false,
      trim: true,
    },
    wilaya_name_ascii: {
      type: DataTypes.STRING(255),
      allowNull: false,
      trim: true,
    },
  }, {
    tableName: 'wilayas',
    timestamps: true,               // createdAt / updatedAt
    underscored: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      {
        name: 'idx_codeW_unique',
        unique: true,
        fields: ['codeW'],
      },
    ],
  });

  // Associations
  Wilaya.associate = (models) => {
    // Attends que Daira et Lieu aient bien la colonne 'wilayaId'
    Wilaya.hasMany(models.Daira, { foreignKey: 'wilayaId', as: 'dairas' });
    Wilaya.hasMany(models.Lieu,  { foreignKey: 'wilayaId', as: 'lieux'  });

    // User doit avoir la colonne 'wilaya_residence'
    Wilaya.hasMany(models.User,  { foreignKey: 'wilaya_residence', as: 'users' });
  };

  return Wilaya;
};
