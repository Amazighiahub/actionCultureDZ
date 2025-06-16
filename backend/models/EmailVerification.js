// models/EmailVerification.js
module.exports = (sequelize, DataTypes) => {
  const EmailVerification = sequelize.define('EmailVerification', {
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'email_verifications',
    timestamps: true
  });

  EmailVerification.associate = (models) => {
    EmailVerification.belongsTo(models.User, {
      foreignKey: 'id_user'
    });
  };

  return EmailVerification;
};