// ========================================
// Vue.js - Modèle pour tracking des vues
// ========================================

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vue = sequelize.define('Vue', {
    id_vue: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_entite: {
      type: DataTypes.ENUM('oeuvre', 'evenement', 'lieu', 'artisanat', 'article'),
      allowNull: false,
      comment: 'Type d\'entité consultée'
    },
    id_entite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de l\'entité consultée'
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'NULL si visiteur anonyme'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: 'IPv4 ou IPv6'
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Navigateur et OS'
    },
    referer: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Page d\'origine'
    },
    session_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'ID de session pour grouper les vues'
    },
    duree_secondes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durée de consultation en secondes'
    },
    pays: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: 'Code pays ISO'
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ville détectée par IP'
    },
    device_type: {
      type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'bot'),
      allowNull: true,
      defaultValue: 'desktop'
    },
    is_unique: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Vue unique pour cette session'
    },
    date_vue: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'vues',
    timestamps: false,
    indexes: [
      {
        fields: ['type_entite', 'id_entite'],
        name: 'idx_entite'
      },
      {
        fields: ['id_user'],
        name: 'idx_user'
      },
      {
        fields: ['date_vue'],
        name: 'idx_date'
      },
      {
        fields: ['ip_address', 'session_id'],
        name: 'idx_session'
      },
      {
        unique: true,
        fields: ['type_entite', 'id_entite', 'session_id'],
        name: 'unique_vue_session',
        where: { is_unique: true }
      }
    ]
  });

  // Associations
  Vue.associate = (models) => {
    Vue.belongsTo(models.User, { 
      foreignKey: 'id_user',
      as: 'Utilisateur'
    });
  };

  // Méthodes statiques
  Vue.trackView = async function(type, id, req, userId = null) {
    const sessionId = req.session?.id || req.cookies?.sessionId;
    const userAgent = req.get('User-Agent') || '';
    
    // Vérifier si vue unique pour cette session
    const existingView = await this.findOne({
      where: {
        type_entite: type,
        id_entite: id,
        session_id: sessionId
      }
    });

    const viewData = {
      type_entite: type,
      id_entite: id,
      id_user: userId,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: userAgent,
      referer: req.get('Referer'),
      session_id: sessionId,
      device_type: this.detectDeviceType(userAgent),
      is_unique: !existingView,
      date_vue: new Date()
    };

    // Géolocalisation IP (à implémenter avec service externe)
    // viewData.pays = await this.getCountryFromIP(viewData.ip_address);
    // viewData.ville = await this.getCityFromIP(viewData.ip_address);

    return await this.create(viewData);
  };

  Vue.detectDeviceType = function(userAgent) {
    if (/bot|crawler|spider/i.test(userAgent)) return 'bot';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  };

  Vue.getStats = async function(type, id, period = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const stats = await this.findAll({
      where: {
        type_entite: type,
        id_entite: id,
        date_vue: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('COUNT', '*'), 'total_vues'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT session_id')), 'vues_uniques'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT id_user')), 'utilisateurs_uniques'],
        [sequelize.fn('AVG', sequelize.col('duree_secondes')), 'duree_moyenne'],
        [sequelize.fn('DATE', sequelize.col('date_vue')), 'date'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('date_vue'))],
      order: [[sequelize.fn('DATE', sequelize.col('date_vue')), 'ASC']]
    });

    return stats;
  };

  return Vue;
};