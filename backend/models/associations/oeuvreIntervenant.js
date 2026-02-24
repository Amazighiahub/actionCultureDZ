const { DataTypes } = require('sequelize');  // IMPORTANT: Import manquant

module.exports = (sequelize) => {
  const OeuvreIntervenant = sequelize.define('OeuvreIntervenant', {
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
    id_type_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'type_user',
        key: 'id_type_user'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
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
    tableName: 'oeuvre_intervenant',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    // Les indexes doivent être ici, pas dans les colonnes !
    indexes: [
      {
        unique: true,
        fields: ['id_oeuvre', 'id_intervenant', 'id_type_user']
      },
      {
        fields: ['id_oeuvre']
      },
      {
        fields: ['id_intervenant']
      },
      {
        fields: ['id_type_user']
      }
    ]
  });

  // Associations
  OeuvreIntervenant.associate = (models) => {
    OeuvreIntervenant.hasMany(models.Oeuvre, { 
      foreignKey: 'id_oeuvre',
      as: 'Oeuvre'
    });
    OeuvreIntervenant.belongsTo(models.Intervenant, { 
      foreignKey: 'id_intervenant',
      as: 'Intervenant'
    });
    OeuvreIntervenant.belongsTo(models.TypeUser, { 
      foreignKey: 'id_type_user',
      as: 'TypeUser'
    });
  };

  return OeuvreIntervenant;
};