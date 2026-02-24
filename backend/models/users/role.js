const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id_role: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom_role: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'role',
    timestamps: false
  });

  // Associations
  Role.associate = (models) => {
    Role.belongsToMany(models.User, { 
      through: models.UserRole, 
      foreignKey: 'id_role',
      as: 'Users' 
    });
  };

  return Role;
};