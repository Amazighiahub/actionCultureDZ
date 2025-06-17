const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeUser = sequelize.define('TypeUser', {
    id_type_user: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'type_user',
    timestamps: false,
    indexes: [
      {
        fields: ['nom_type'],
        unique: true
      }
    ]
  });

  // Associations
  TypeUser.associate = (models) => {
    TypeUser.hasMany(models.User, { 
      foreignKey: 'id_type_user',
      as: 'Users'
    });
    TypeUser.hasMany(models.OeuvreUser, { 
  foreignKey: 'id_type_user',
  as: 'OeuvreUsers'
});

  };

  return TypeUser;
};