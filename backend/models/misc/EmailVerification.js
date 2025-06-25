// models/misc/EmailVerification.js
const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
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
      },
      onDelete: 'CASCADE'
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    type: {
      type: DataTypes.ENUM('email_verification', 'password_reset'),
      defaultValue: 'email_verification'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'email_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['token'], unique: true },
      { fields: ['id_user', 'type'] },
      { fields: ['expires_at'] }
    ]
  });

  EmailVerification.associate = (models) => {
    EmailVerification.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'User'
    });
  };

  EmailVerification.createVerificationToken = async function(userId, type = 'email_verification') {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresIn = type === 'email_verification' ? 24 : 2;

    await this.update(
      { used_at: new Date() },
      { where: { id_user: userId, type: type, used_at: null } }
    );
    
    return this.create({
      id_user: userId,
      token: token,
      type: type,
      expires_at: new Date(Date.now() + expiresIn * 60 * 60 * 1000)
    });
  };

  EmailVerification.verifyToken = async function(token, type = 'email_verification') {
    const verification = await this.findOne({
      where: {
        token: token,
        type: type,
        used_at: null,
        expires_at: {
          [Op.gt]: new Date()
        }
      },
      include: [{
        model: sequelize.models.User,
        as: 'User'
      }]
    });
    
    if (verification) {
      await verification.update({ used_at: new Date() });
    }
    
    return verification;
  };

  EmailVerification.cleanExpired = async function() {
    return this.destroy({
      where: {
        [Op.or]: [
          { expires_at: { [Op.lt]: new Date() } },
          { used_at: { [Op.ne]: null } }
        ]
      }
    });
  };

  return EmailVerification;
};