/**
 * Service de statistiques pour le Dashboard
 * Extrait de DashboardController pour une meilleure modularité
 */
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

class DashboardStatsService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.cache = new Map();
  }

  // Cache simple en mémoire
  async getCached(key, generator, ttl = 300) {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    const data = await generator();
    this.cache.set(key, { data, expires: Date.now() + (ttl * 1000) });
    return data;
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Statistiques générales du dashboard
   */
  async generateOverviewStats() {
    const [
      totalUsers,
      totalOeuvres,
      totalEvenements,
      totalPatrimoine,
      pendingValidations,
      recentActivity
    ] = await Promise.all([
      this.models.User.count(),
      this.models.Oeuvre?.count() || 0,
      this.models.Evenement?.count() || 0,
      this.models.Patrimoine?.count() || 0,
      this.getPendingValidationsCount(),
      this.getRecentActivityStats()
    ]);

    return {
      counts: {
        users: totalUsers,
        oeuvres: totalOeuvres,
        evenements: totalEvenements,
        patrimoine: totalPatrimoine
      },
      pending: pendingValidations,
      activity: recentActivity,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Compte les validations en attente
   */
  async getPendingValidationsCount() {
    const [pendingUsers, pendingOeuvres] = await Promise.all([
      this.models.User.count({
        where: { statut_validation: 'en_attente' }
      }),
      this.models.Oeuvre?.count({
        where: { statut: 'en_attente' }
      }) || 0
    ]);

    return {
      users: pendingUsers,
      oeuvres: pendingOeuvres,
      total: pendingUsers + pendingOeuvres
    };
  }

  /**
   * Statistiques d'activité récente
   */
  async getRecentActivityStats() {
    const last24h = moment().subtract(24, 'hours').toDate();
    const last7days = moment().subtract(7, 'days').toDate();

    const [newUsers24h, newUsers7d] = await Promise.all([
      this.models.User.count({
        where: { date_creation: { [Op.gte]: last24h } }
      }),
      this.models.User.count({
        where: { date_creation: { [Op.gte]: last7days } }
      })
    ]);

    return {
      newUsers: { last24h: newUsers24h, last7days: newUsers7d }
    };
  }

  /**
   * Croissance des utilisateurs par période
   */
  async getUserGrowth(days = 30) {
    const dateLimit = moment().subtract(days, 'days').toDate();

    const growth = await this.models.User.findAll({
      attributes: [
        [fn('DATE', col('date_creation')), 'date'],
        [fn('COUNT', col('id_user')), 'count']
      ],
      where: { date_creation: { [Op.gte]: dateLimit } },
      group: [fn('DATE', col('date_creation'))],
      order: [[fn('DATE', col('date_creation')), 'ASC']],
      raw: true
    });

    return growth;
  }

  /**
   * Répartition du contenu par type
   */
  async getContentByType() {
    const types = {};

    if (this.models.Oeuvre) {
      types.oeuvres = await this.models.Oeuvre.count();
    }
    if (this.models.Evenement) {
      types.evenements = await this.models.Evenement.count();
    }
    if (this.models.Patrimoine) {
      types.patrimoine = await this.models.Patrimoine.count();
    }
    if (this.models.Artisanat) {
      types.artisanat = await this.models.Artisanat.count();
    }

    return types;
  }

  /**
   * Top contributeurs
   */
  async getTopContributors(limit = 10) {
    const contributors = await this.models.User.findAll({
      attributes: [
        'id_user',
        'nom',
        'prenom',
        'email',
        [fn('COUNT', col('Oeuvres.id_oeuvre')), 'oeuvresCount']
      ],
      include: [{
        model: this.models.Oeuvre,
        as: 'Oeuvres',
        attributes: [],
        required: false
      }],
      group: ['User.id_user'],
      order: [[literal('oeuvresCount'), 'DESC']],
      limit,
      raw: true
    });

    return contributors;
  }

  /**
   * Statistiques détaillées par période
   */
  async getDetailedStats(period = '30d') {
    const days = parseInt(period) || 30;
    const startDate = moment().subtract(days, 'days').toDate();

    const [userStats, contentStats] = await Promise.all([
      this.getUserAnalytics(startDate),
      this.getContentAnalytics(startDate)
    ]);

    return {
      period: `${days} jours`,
      users: userStats,
      content: contentStats,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Analytics utilisateurs
   */
  async getUserAnalytics(startDate) {
    const [newUsers, activeUsers] = await Promise.all([
      this.models.User.count({
        where: { date_creation: { [Op.gte]: startDate } }
      }),
      this.models.User.count({
        where: { derniere_connexion: { [Op.gte]: startDate } }
      })
    ]);

    return { newUsers, activeUsers };
  }

  /**
   * Analytics contenu
   */
  async getContentAnalytics(startDate) {
    const stats = {};

    if (this.models.Oeuvre) {
      stats.newOeuvres = await this.models.Oeuvre.count({
        where: { date_creation: { [Op.gte]: startDate } }
      });
    }

    if (this.models.Evenement) {
      stats.newEvenements = await this.models.Evenement.count({
        where: { date_creation: { [Op.gte]: startDate } }
      });
    }

    return stats;
  }
}

module.exports = DashboardStatsService;
