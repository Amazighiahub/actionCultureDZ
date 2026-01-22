/**
 * Service d'analytics pour le Dashboard Admin
 */
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

class DashboardAnalyticsService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  /**
   * Analytics avancés
   */
  async getAdvancedAnalytics(period = '30d') {
    const days = parseInt(period) || 30;
    const startDate = moment().subtract(days, 'days').toDate();

    const [
      userAnalytics,
      contentAnalytics,
      engagementAnalytics,
      geographicAnalytics
    ] = await Promise.all([
      this.getUserAnalytics(startDate),
      this.getContentAnalytics(startDate),
      this.getEngagementAnalytics(startDate),
      this.getGeographicAnalytics()
    ]);

    return {
      period: `${days} jours`,
      users: userAnalytics,
      content: contentAnalytics,
      engagement: engagementAnalytics,
      geographic: geographicAnalytics,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Analytics utilisateurs
   */
  async getUserAnalytics(startDate) {
    const [newUsers, activeUsers, usersByType] = await Promise.all([
      this.models.User.count({
        where: { date_creation: { [Op.gte]: startDate } }
      }),
      this.models.User.count({
        where: { derniere_connexion: { [Op.gte]: startDate } }
      }),
      this.models.User.findAll({
        attributes: [
          'type_user',
          [fn('COUNT', col('id_user')), 'count']
        ],
        group: ['type_user'],
        raw: true
      })
    ]);

    return {
      newUsers,
      activeUsers,
      byType: usersByType.reduce((acc, item) => {
        acc[item.type_user] = parseInt(item.count);
        return acc;
      }, {})
    };
  }

  /**
   * Analytics contenu
   */
  async getContentAnalytics(startDate) {
    const stats = {
      oeuvres: { new: 0, published: 0, pending: 0 },
      evenements: { new: 0, upcoming: 0, past: 0 },
      patrimoine: { new: 0, total: 0 }
    };

    if (this.models.Oeuvre) {
      const [newOeuvres, published, pending] = await Promise.all([
        this.models.Oeuvre.count({
          where: { date_creation: { [Op.gte]: startDate } }
        }),
        this.models.Oeuvre.count({
          where: { statut: 'publie' }
        }),
        this.models.Oeuvre.count({
          where: { statut: 'en_attente' }
        })
      ]);
      stats.oeuvres = { new: newOeuvres, published, pending };
    }

    if (this.models.Evenement) {
      const now = new Date();
      const [newEvents, upcoming, past] = await Promise.all([
        this.models.Evenement.count({
          where: { date_creation: { [Op.gte]: startDate } }
        }),
        this.models.Evenement.count({
          where: { date_debut: { [Op.gt]: now } }
        }),
        this.models.Evenement.count({
          where: { date_fin: { [Op.lt]: now } }
        })
      ]);
      stats.evenements = { new: newEvents, upcoming, past };
    }

    if (this.models.Patrimoine) {
      const [newPatrimoine, total] = await Promise.all([
        this.models.Patrimoine.count({
          where: { date_creation: { [Op.gte]: startDate } }
        }),
        this.models.Patrimoine.count()
      ]);
      stats.patrimoine = { new: newPatrimoine, total };
    }

    return stats;
  }

  /**
   * Analytics engagement
   */
  async getEngagementAnalytics(startDate) {
    const stats = {
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    };

    if (this.models.Commentaire) {
      stats.comments = await this.models.Commentaire.count({
        where: { date_creation: { [Op.gte]: startDate } }
      });
    }

    if (this.models.Like) {
      stats.likes = await this.models.Like.count({
        where: { date_creation: { [Op.gte]: startDate } }
      });
    }

    return stats;
  }

  /**
   * Analytics géographiques
   */
  async getGeographicAnalytics() {
    const stats = { byWilaya: [], byCommune: [] };

    if (this.models.User) {
      try {
        const byWilaya = await this.models.User.findAll({
          attributes: [
            'wilaya',
            [fn('COUNT', col('id_user')), 'count']
          ],
          where: { wilaya: { [Op.not]: null } },
          group: ['wilaya'],
          order: [[literal('count'), 'DESC']],
          limit: 10,
          raw: true
        });
        stats.byWilaya = byWilaya;
      } catch (error) {
        // Champ wilaya peut ne pas exister
      }
    }

    return stats;
  }

  /**
   * Logs d'audit
   */
  async getAuditLogs(options = {}) {
    const { page = 1, limit = 50, type, userId, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    if (!this.models.AuditLog) {
      return { logs: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const where = {};
    if (type) where.type = type;
    if (userId) where.id_user = userId;
    if (startDate || endDate) {
      where.date_creation = {};
      if (startDate) where.date_creation[Op.gte] = new Date(startDate);
      if (endDate) where.date_creation[Op.lte] = new Date(endDate);
    }

    const { rows: logs, count } = await this.models.AuditLog.findAndCountAll({
      where,
      include: [{
        model: this.models.User,
        as: 'User',
        attributes: ['id_user', 'nom', 'prenom', 'email']
      }],
      order: [['date_creation', 'DESC']],
      limit,
      offset
    });

    return {
      logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Génère un rapport d'activité
   */
  async generateActivityReport(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [userReport, contentReport, engagementReport] = await Promise.all([
      this.getUserReportData(start, end),
      this.getContentReportData(start, end),
      this.getEngagementReportData(start, end)
    ]);

    return {
      period: { start: startDate, end: endDate },
      users: userReport,
      content: contentReport,
      engagement: engagementReport,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Données utilisateurs pour rapport
   */
  async getUserReportData(startDate, endDate) {
    const dateRange = { [Op.between]: [startDate, endDate] };

    const [newUsers, validatedUsers, suspendedUsers] = await Promise.all([
      this.models.User.count({
        where: { date_creation: dateRange }
      }),
      this.models.User.count({
        where: { date_validation: dateRange }
      }),
      this.models.User.count({
        where: { date_suspension: dateRange }
      })
    ]);

    return { newUsers, validatedUsers, suspendedUsers };
  }

  /**
   * Données contenu pour rapport
   */
  async getContentReportData(startDate, endDate) {
    const dateRange = { [Op.between]: [startDate, endDate] };
    const data = {};

    if (this.models.Oeuvre) {
      data.oeuvres = await this.models.Oeuvre.count({
        where: { date_creation: dateRange }
      });
    }

    if (this.models.Evenement) {
      data.evenements = await this.models.Evenement.count({
        where: { date_creation: dateRange }
      });
    }

    return data;
  }

  /**
   * Données engagement pour rapport
   */
  async getEngagementReportData(startDate, endDate) {
    const dateRange = { [Op.between]: [startDate, endDate] };
    const data = { comments: 0, inscriptions: 0 };

    if (this.models.Commentaire) {
      data.comments = await this.models.Commentaire.count({
        where: { date_creation: dateRange }
      });
    }

    if (this.models.InscriptionEvenement) {
      data.inscriptions = await this.models.InscriptionEvenement.count({
        where: { date_inscription: dateRange }
      });
    }

    return data;
  }

  /**
   * Alertes système
   */
  async getSystemAlerts() {
    const alerts = [];

    // Utilisateurs en attente depuis longtemps
    const pendingUsersCount = await this.models.User.count({
      where: {
        statut_validation: 'en_attente',
        date_creation: {
          [Op.lt]: moment().subtract(7, 'days').toDate()
        }
      }
    });

    if (pendingUsersCount > 0) {
      alerts.push({
        type: 'warning',
        category: 'users',
        message: `${pendingUsersCount} utilisateurs en attente depuis plus de 7 jours`,
        count: pendingUsersCount
      });
    }

    // Œuvres en attente
    if (this.models.Oeuvre) {
      const pendingOeuvres = await this.models.Oeuvre.count({
        where: { statut: 'en_attente' }
      });

      if (pendingOeuvres > 10) {
        alerts.push({
          type: 'info',
          category: 'content',
          message: `${pendingOeuvres} œuvres en attente de validation`,
          count: pendingOeuvres
        });
      }
    }

    // Signalements non traités
    if (this.models.Signalement) {
      const pendingSignalements = await this.models.Signalement.count({
        where: { statut: 'en_attente' }
      });

      if (pendingSignalements > 0) {
        alerts.push({
          type: 'error',
          category: 'moderation',
          message: `${pendingSignalements} signalements non traités`,
          count: pendingSignalements
        });
      }
    }

    return alerts;
  }
}

module.exports = DashboardAnalyticsService;
