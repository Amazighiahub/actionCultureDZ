const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    id_role: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'role',
        key: 'id_role'
      }
    }
  }, {
    tableName: 'userroles',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['id_user', 'id_role']
      }
    ]
  });

  // Associations
  UserRole.associate = (models) => {
    UserRole.belongsTo(models.User, { foreignKey: 'id_user' });
    UserRole.belongsTo(models.Role, { foreignKey: 'id_role' });
  };

  return UserRole;
};