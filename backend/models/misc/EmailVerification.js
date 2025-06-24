// models/EmailVerification.js
const crypto = require('crypto');
const { Op , DataTypes} = require('sequelize');

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
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('email_verification', 'password_reset', 'email_change', '2fa'),
      defaultValue: 'email_verification',
      allowNull: false,
      comment: 'Type de vérification'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString()
      }
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date d\'utilisation du token'
    },
    used_ip: {
      type: DataTypes.STRING(45), // Support IPv6
      allowNull: true,
      comment: 'IP lors de l\'utilisation'
    },
    created_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP lors de la création'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Données additionnelles (nouveau email, etc.)'
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Nombre de tentatives d\'utilisation'
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      allowNull: false,
      comment: 'Nombre maximum de tentatives'
    }
  }, {
    tableName: 'email_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    indexes: [
      {
        fields: ['token'],
        unique: true
      },
      {
        fields: ['id_user', 'type']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['used_at']
      }
    ],
    
    hooks: {
      // Nettoyer automatiquement les vieux tokens avant création
      beforeCreate: async (instance, options) => {
        // Nettoyer les anciens tokens expirés pour cet utilisateur
        await EmailVerification.destroy({
          where: {
            id_user: instance.id_user,
            type: instance.type,
            [Op.or]: [
              { expires_at: { [Op.lt]: new Date() } },
              { used_at: { [Op.ne]: null } }
            ]
          },
          transaction: options.transaction
        });
      }
    }
  });

  // ========================================================================
  // ASSOCIATIONS
  // ========================================================================
  
  EmailVerification.associate = (models) => {
    EmailVerification.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'User'
    });
  };

  // ========================================================================
  // MÉTHODES DE CLASSE
  // ========================================================================

  /**
   * Créer un token de vérification
   */
  EmailVerification.createVerificationToken = async function(userId, type = 'email_verification', data = {}, ip = null) {
    try {
      // Générer un token unique
      const token = crypto.randomBytes(32).toString('hex');
      
      // Définir l'expiration selon le type
      const expirations = {
        'email_verification': 24 * 60 * 60 * 1000, // 24 heures
        'password_reset': 2 * 60 * 60 * 1000,      // 2 heures
        'email_change': 24 * 60 * 60 * 1000,       // 24 heures
        '2fa': 10 * 60 * 1000                      // 10 minutes
      };
      
      const expiresAt = new Date(Date.now() + (expirations[type] || expirations.email_verification));
      
      // Créer l'enregistrement
      const verification = await this.create({
        id_user: userId,
        token,
        type,
        expires_at: expiresAt,
        created_ip: ip,
        data
      });
      
      return verification;
    } catch (error) {
      console.error('Erreur création token:', error);
      throw error;
    }
  };

  /**
   * Vérifier et utiliser un token
   */
  EmailVerification.verifyToken = async function(token, expectedType = null, ip = null) {
    const transaction = await sequelize.transaction();
    
    try {
      // Rechercher le token
      const verification = await this.findOne({
        where: {
          token,
          expires_at: { [Op.gt]: new Date() },
          used_at: null
        },
        include: [{
          model: sequelize.models.User,
          as: 'User',
          attributes: ['id_user', 'email', 'nom', 'prenom', 'email_verifie']
        }],
        transaction
      });
      
      if (!verification) {
        await transaction.rollback();
        return {
          success: false,
          error: 'Token invalide ou expiré'
        };
      }
      
      // Vérifier le type si spécifié
      if (expectedType && verification.type !== expectedType) {
        await transaction.rollback();
        return {
          success: false,
          error: 'Type de token incorrect'
        };
      }
      
      // Vérifier le nombre de tentatives
      if (verification.attempts >= verification.max_attempts) {
        await transaction.rollback();
        return {
          success: false,
          error: 'Nombre maximum de tentatives atteint'
        };
      }
      
      // Incrémenter les tentatives
      await verification.increment('attempts', { transaction });
      
      // Marquer comme utilisé
      await verification.update({
        used_at: new Date(),
        used_ip: ip
      }, { transaction });
      
      // Actions selon le type
      let result = { success: true, user: verification.User };
      
      switch (verification.type) {
        case 'email_verification':
          await verification.User.update({
            email_verifie: true
          }, { transaction });
          result.message = 'Email vérifié avec succès';
          break;
          
        case 'password_reset':
          result.allowPasswordReset = true;
          result.message = 'Token validé, vous pouvez changer votre mot de passe';
          break;
          
        case 'email_change':
          if (verification.data.newEmail) {
            await verification.User.update({
              email: verification.data.newEmail,
              email_verifie: true
            }, { transaction });
            result.message = 'Email mis à jour avec succès';
          }
          break;
          
        case '2fa':
          result.verified = true;
          result.message = 'Vérification 2FA réussie';
          break;
      }
      
      await transaction.commit();
      return result;
      
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur vérification token:', error);
      return {
        success: false,
        error: 'Erreur lors de la vérification'
      };
    }
  };

  /**
   * Invalider tous les tokens d'un utilisateur pour un type donné
   */
  EmailVerification.invalidateUserTokens = async function(userId, type = null) {
    const where = { id_user: userId };
    if (type) where.type = type;
    
    const count = await this.update(
      { used_at: new Date() },
      { where }
    );
    
    return count[0]; // Nombre de tokens invalidés
  };

  /**
   * Nettoyer les tokens expirés ou utilisés
   */
  EmailVerification.cleanExpiredTokens = async function() {
    const count = await this.destroy({
      where: {
        [Op.or]: [
          { expires_at: { [Op.lt]: new Date() } },
          { used_at: { [Op.ne]: null } }
        ]
      }
    });
    
    console.log(`🧹 ${count} tokens expirés/utilisés supprimés`);
    return count;
  };

  /**
   * Obtenir les statistiques des tokens
   */
  EmailVerification.getStats = async function() {
    const [total, expired, used, active] = await Promise.all([
      this.count(),
      this.count({ where: { expires_at: { [Op.lt]: new Date() } } }),
      this.count({ where: { used_at: { [Op.ne]: null } } }),
      this.count({ 
        where: { 
          expires_at: { [Op.gt]: new Date() },
          used_at: null 
        } 
      })
    ]);
    
    return { total, expired, used, active };
  };

  /**
   * Vérifier si un utilisateur a un token actif
   */
  EmailVerification.hasActiveToken = async function(userId, type) {
    const count = await this.count({
      where: {
        id_user: userId,
        type,
        expires_at: { [Op.gt]: new Date() },
        used_at: null
      }
    });
    
    return count > 0;
  };

  // ========================================================================
  // MÉTHODES D'INSTANCE
  // ========================================================================

  /**
   * Vérifier si le token est valide
   */
  EmailVerification.prototype.isValid = function() {
    return this.expires_at > new Date() && !this.used_at;
  };

  /**
   * Vérifier si le token est expiré
   */
  EmailVerification.prototype.isExpired = function() {
    return this.expires_at <= new Date();
  };

  /**
   * Vérifier si le token a été utilisé
   */
  EmailVerification.prototype.isUsed = function() {
    return !!this.used_at;
  };

  /**
   * Obtenir le temps restant avant expiration
   */
  EmailVerification.prototype.getTimeRemaining = function() {
    const remaining = this.expires_at - new Date();
    return remaining > 0 ? remaining : 0;
  };

  /**
   * Prolonger l'expiration du token
   */
  EmailVerification.prototype.extendExpiration = async function(additionalTime = 3600000) {
    if (this.isUsed()) {
      throw new Error('Cannot extend used token');
    }
    
    const newExpiration = new Date(this.expires_at.getTime() + additionalTime);
    await this.update({ expires_at: newExpiration });
    
    return this;
  };

  /**
   * Obtenir l'URL de vérification complète
   */
  EmailVerification.prototype.getVerificationUrl = function() {
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL;
    const paths = {
      'email_verification': '/verify-email',
      'password_reset': '/reset-password',
      'email_change': '/confirm-email-change',
      '2fa': '/verify-2fa'
    };
    
    const path = paths[this.type] || '/verify';
    return `${baseUrl}${path}/${this.token}`;
  };

  return EmailVerification;
};