const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserOrganisation = sequelize.define('UserOrganisation', {
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
    id_organisation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organisation',
        key: 'id_organisation'
      }
    },
    role: {
      type: DataTypes.ENUM('membre', 'responsable', 'directeur', 'collaborateur'),
      defaultValue: 'membre',
      comment: 'Rôle dans l\'organisation'
    },
   
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // ===== NOUVEAUX CHAMPS AJOUTÉS =====
    
    // Date de début du rôle
    
    
    // Responsabilités
   
    
   
    
    // Département/Service
    departement: {
      type: DataTypes.STRING(100),
      comment: 'Département ou service au sein de l\'organisation'
    },
    
    // Superviseur direct
    id_superviseur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'ID du superviseur direct'
    },
    
   
    
    
    
  }, {
    tableName: 'userorganisation',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['id_user', 'id_organisation']
      },
      {
        fields: ['role']
      },
      {
        fields: ['actif']
      },
      {
        fields: ['departement']
      }
    ]
  });

  UserOrganisation.associate = (models) => {
    UserOrganisation.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'User',
      onDelete: 'CASCADE'
    });

    UserOrganisation.belongsTo(models.Organisation, {
      foreignKey: 'id_organisation',
      as: 'Organisation',
      onDelete: 'CASCADE'
    });

    UserOrganisation.belongsTo(models.User, {
      foreignKey: 'id_superviseur',
      as: 'Superviseur',
      onDelete: 'SET NULL'
    });
  };
  
  // Hooks
 
  
  // Méthodes d'instance
  
 
  

  
  
  
  
  // Méthodes de classe
 
  return UserOrganisation;
};
