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
      type: DataTypes.ENUM('email_verification', 'password_reset', 'email_change'),
      defaultValue: 'email_verification'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Données additionnelles (ex: nouvel email pour email_change)'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP de création du token'
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

  /**
   * Créer un token de vérification
   * @param {number} userId - ID de l'utilisateur
   * @param {string} type - Type de token (email_verification, password_reset, email_change)
   * @param {object} metadata - Données additionnelles (ex: { newEmail: '...' })
   * @param {string} ipAddress - Adresse IP de la requête
   */
  EmailVerification.createVerificationToken = async function(userId, type = 'email_verification', metadata = {}, ipAddress = null) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Durée d'expiration selon le type
    const expiresInHours = {
      'email_verification': 24,
      'password_reset': 2,
      'email_change': 24
    };
    const expiresIn = expiresInHours[type] || 24;

    // Invalider les anciens tokens non utilisés du même type
    await this.update(
      { used_at: new Date() },
      { where: { id_user: userId, type: type, used_at: null } }
    );

    return this.create({
      id_user: userId,
      token: token,
      type: type,
      expires_at: new Date(Date.now() + expiresIn * 60 * 60 * 1000),
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      ip_address: ipAddress
    });
  };

  /**
   * Vérifier si un utilisateur a un token actif
   * @param {number} userId - ID de l'utilisateur
   * @param {string} type - Type de token
   */
  EmailVerification.hasActiveToken = async function(userId, type = 'email_verification') {
    const count = await this.count({
      where: {
        id_user: userId,
        type: type,
        used_at: null,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    return count > 0;
  };

  /**
   * Vérifier et utiliser un token
   * @param {string} token - Le token à vérifier
   * @param {string} type - Type de token attendu
   * @param {string} ipAddress - IP de la requête (pour logging)
   */
  EmailVerification.verifyToken = async function(token, type = 'email_verification', ipAddress = null) {
    const verification = await this.findOne({
      where: {
        token: token,
        type: type,
        used_at: null,
        expires_at: { [Op.gt]: new Date() }
      },
      include: [{
        model: sequelize.models.User,
        as: 'User'
      }]
    });

    if (!verification) {
      return {
        success: false,
        error: 'Token invalide ou expiré'
      };
    }

    if (!verification.User) {
      return {
        success: false,
        error: 'Utilisateur non trouvé'
      };
    }

    // Marquer le token comme utilisé
    await verification.update({ used_at: new Date() });

    // Effectuer l'action selon le type
    const user = verification.User;
    let message = 'Vérification réussie';

    if (type === 'email_verification') {
      // Déterminer le nouveau statut selon le type d'utilisateur
      const TYPE_USER_IDS = { VISITEUR: 1, PROFESSIONNEL: 2, ADMIN: 3 };
      const isVisiteur = user.id_type_user === TYPE_USER_IDS.VISITEUR;
      const newStatut = isVisiteur ? 'actif' : 'en_attente_validation';

      await user.update({
        email_verifie: true,
        statut: newStatut
      });
      message = 'Email vérifié avec succès';
    } else if (type === 'email_change' && verification.metadata?.newEmail) {
      // Changer l'email
      const oldEmail = user.email;
      await user.update({
        email: verification.metadata.newEmail
      });
      message = `Email changé de ${oldEmail} à ${verification.metadata.newEmail}`;
    }

    return {
      success: true,
      message,
      user,
      verification
    };
  };

  /**
   * Invalider tous les tokens d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} type - Type de token (optionnel, tous si non spécifié)
   */
  EmailVerification.invalidateUserTokens = async function(userId, type = null) {
    const where = { id_user: userId, used_at: null };
    if (type) {
      where.type = type;
    }

    return this.update(
      { used_at: new Date() },
      { where }
    );
  };

  /**
   * Nettoyer les tokens expirés ou utilisés
   */
  EmailVerification.cleanExpiredTokens = async function() {
    const result = await this.destroy({
      where: {
        [Op.or]: [
          { expires_at: { [Op.lt]: new Date() } },
          { used_at: { [Op.ne]: null } }
        ]
      }
    });
    return result;
  };

  // Alias pour compatibilité
  EmailVerification.cleanExpired = EmailVerification.cleanExpiredTokens;

  /**
   * Obtenir les statistiques des tokens
   */
  EmailVerification.getStats = async function() {
    const now = new Date();

    const [total, pending, expired, used] = await Promise.all([
      this.count(),
      this.count({ where: { used_at: null, expires_at: { [Op.gt]: now } } }),
      this.count({ where: { used_at: null, expires_at: { [Op.lt]: now } } }),
      this.count({ where: { used_at: { [Op.ne]: null } } })
    ]);

    // Stats par type
    const byType = await this.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    return {
      total,
      pending,
      expired,
      used,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {})
    };
  };

  return EmailVerification;
};
