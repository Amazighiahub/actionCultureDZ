const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OeuvreUser = sequelize.define('OeuvreUser', {
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
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    // CHANGEMENT : Remplacer role_dans_oeuvre par id_type_user
    id_type_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'type_user',
        key: 'id_type_user'
      },
      onDelete: 'RESTRICT'
    },
    personnage: {
      type: DataTypes.STRING(255)
    },
    ordre_apparition: {
      type: DataTypes.INTEGER
    },
    role_principal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    description_role: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'oeuvre_user',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['id_oeuvre', 'id_user', 'id_type_user']
      }
    ]
  });

  // Associations
  OeuvreUser.associate = (models) => {
    OeuvreUser.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    OeuvreUser.belongsTo(models.User, { foreignKey: 'id_user' });
    OeuvreUser.belongsTo(models.TypeUser, { foreignKey: 'id_type_user' });
  };

  return OeuvreUser;
};
