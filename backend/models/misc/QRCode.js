const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QRCode = sequelize.define('QRCode', {
    id_qr_code: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    code_unique: {
      type: DataTypes.STRING(100),
      allowNull: false,
     
    },
    url_destination: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    qr_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    date_expiration: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'qr_codes',
    timestamps: false,
    indexes: [
     
      {
        name: 'id_index_code',  // Toujours nommer l'index
        fields: ['code_unique'],
        unique: true
      },]
  });

  // Associations
  QRCode.associate = (models) => {
    QRCode.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
  };

  return QRCode;
};