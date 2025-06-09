const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QRScan = sequelize.define('QRScan', {
    id_scan: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_qr_code: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'qr_codes',
        key: 'id_qr_code'
      }
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    device_type: {
      type: DataTypes.ENUM('mobile', 'tablet', 'desktop'),
      defaultValue: 'mobile'
    },
    pays: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    is_unique: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    date_scan: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'qr_scans',
    timestamps: false
  });

  return QRScan;
};