// models/misc/AuditLog.js - VERSION CORRIGÉE
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id_log: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_admin: {
      type: DataTypes.INTEGER,
      allowNull: true,  // IMPORTANT: Changé de false à true
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    date_action: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
      {
        fields: ['id_admin']
      },
      {
        fields: ['action']
      },
      {
        fields: ['date_action']
      },
      {
        fields: ['entity_type', 'entity_id']
      }
    ]
  });

  AuditLog.associate = function(models) {
    // Association optionnelle avec User (peut être null)
    AuditLog.belongsTo(models.User, {
      foreignKey: 'id_admin',
      as: 'Admin',
      constraints: false  // Important pour permettre les valeurs null
    });
  };

  return AuditLog;
};