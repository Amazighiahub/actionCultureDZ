/**
 * Service de statistiques pour le Dashboard
 * Extrait de DashboardController pour une meilleure modularité
 */
const { Op, fn, col, literal } = require('sequelize');
const { subDays, subHours, subMonths, subYears, startOfDay } = require('date-fns');
const LRUCache = require('../../utils/LRUCache');
const { getClient: getRedisClient } = require('../../utils/redisClient');
const logger = require('../../utils/logger');

const STATS_CACHE_PREFIX = 'stats:';

class DashboardStatsService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.lru = new LRUCache(200);
  }

  async getCached(key, generator, ttl = 300) {
    const fullKey = `${STATS_CACHE_PREFIX}${key}`;

    // 1. Essayer Redis
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(fullKey);
        if (val) return JSON.parse(val);
      } catch (_) { /* fallback LRU */ }
    }

    // 2. Essayer LRU (fallback in-memory)
    const lruVal = this.lru.get(key);
    if (lruVal !== undefined) return lruVal;

    // 3. Générer et stocker dans les deux caches
    try {
      const data = await generator();
      this.lru.set(key, data, ttl * 1000);
      if (redis) {
        redis.setEx(fullKey, ttl, JSON.stringify(data)).catch(() => {});
      }
      return data;
    } catch (error) {
      logger.error('Erreur cache stats:', error.message);
      return await generator();
    }
  }

  clearCache(pattern = null) {
    // LRU
    if (pattern) {
      for (const key of this.lru.keys()) {
        if (key.includes(pattern)) this.lru.delete(key);
      }
    } else {
      this.lru.clear();
    }

    // Redis (non-bloquant)
    const redis = getRedisClient();
    if (redis) {
      const redisPattern = pattern ? `${STATS_CACHE_PREFIX}*${pattern}*` : `${STATS_CACHE_PREFIX}*`;
      (async () => {
        try {
          let cursor = 0;
          do {
            const reply = await redis.scan(cursor, { MATCH: redisPattern, COUNT: 200 });
            cursor = reply.cursor;
            if (reply.keys.length > 0) await redis.del(reply.keys);
          } while (cursor !== 0);
        } catch (_) { /* best-effort */ }
      })();
    }
  }

  /**
   * Statistiques publiques pour la page d'accueil (hero section)
   */
  async getPublicStats() {
    const [sitesPatrimoniaux, evenementsActifs, oeuvres, artisanats, membres] = await Promise.all([
      this.models.Lieu ? this.models.Lieu.count() : 0,
      this.models.Evenement ? this.models.Evenement.count({ where: { statut: { [Op.in]: ['planifie', 'en_cours'] } } }) : 0,
      this.models.Oeuvre ? this.models.Oeuvre.count() : 0,
      this.models.Artisanat ? this.models.Artisanat.count() : 0,
      this.models.User ? this.models.User.count({ where: { statut: 'actif' } }) : 0
    ]);

    const formatStat = (num) => {
      if (num >= 10000) return Math.floor(num / 1000) + 'k+';
      if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k+';
      if (num >= 100) return Math.floor(num / 100) * 100 + '+';
      if (num >= 10) return Math.floor(num / 10) * 10 + '+';
      return num.toString();
    };

    return {
      sites_patrimoniaux: sitesPatrimoniaux,
      sites_patrimoniaux_formatted: formatStat(sitesPatrimoniaux),
      evenements: evenementsActifs,
      evenements_formatted: formatStat(evenementsActifs),
      oeuvres: oeuvres + artisanats,
      oeuvres_formatted: formatStat(oeuvres + artisanats),
      membres: membres,
      membres_formatted: formatStat(membres)
    };
  }

  /**
   * Statistiques générales du dashboard
   */
  async generateOverviewStats() {
    const [
      totalUsers, totalOeuvres, totalEvenements, totalArtisanats,
      newUsersToday, oeuvresEnAttente, professionnelsEnAttente,
      signalementsEnAttente, sitesPatrimoniaux, vuesAujourdhui
    ] = await Promise.all([
      this.models.User.count(),
      this.models.Oeuvre.count({ where: { statut: 'publie' } }),
      this.models.Evenement.count(),
      this.models.Artisanat?.count() || 0,
      this.models.User.count({
        where: { date_creation: { [Op.gte]: startOfDay(new Date()) } }
      }),
      this.models.Oeuvre.count({ where: { statut: 'en_attente' } }),
      this.models.User.count({
        where: { id_type_user: { [Op.ne]: 1 }, statut: 'en_attente_validation' }
      }),
      this.models.Signalement?.count({ where: { statut: 'en_attente' } }) || 0,
      this.models.Lieu?.count() || 0,
      this.models.Vue?.count({
        where: { date_vue: { [Op.gte]: startOfDay(new Date()) } }
      }) || 0
    ]);

    return {
      users: { total: totalUsers, newToday: newUsersToday, professionnelsEnAttente },
      content: { oeuvres: totalOeuvres, evenements: totalEvenements, artisanats: totalArtisanats, enAttente: oeuvresEnAttente },
      moderation: { signalementsEnAttente },
      patrimoine: { sites: sitesPatrimoniaux },
      engagement: { vuesAujourdhui }
    };
  }

  /**
   * Compte les validations en attente
   */
  async getPendingValidationsCount() {
    const [pendingUsers, pendingOeuvres] = await Promise.all([
      this.models.User.count({
        where: { statut: 'en_attente_validation' }
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
    const last24h = subHours(new Date(), 24);
    const last7days = subDays(new Date(), 7);

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
   * @param {Date} dateLimit - Date de début
   */
  async getUserGrowth(dateLimit) {
    try {
      return await this.models.User.findAll({
        where: { date_creation: { [Op.gte]: dateLimit } },
        attributes: [[fn('DATE', col('date_creation')), 'date'], [fn('COUNT', '*'), 'count']],
        group: [fn('DATE', col('date_creation'))],
        order: [[fn('DATE', col('date_creation')), 'ASC']],
        raw: true
      });
    } catch (error) { return []; }
  }

  /**
   * Répartition du contenu par type
   */
  async getContentByType() {
    try {
      const [oeuvres, evenements, artisanats] = await Promise.all([
        this.models.Oeuvre.count({ group: ['id_type_oeuvre'] }),
        this.models.Evenement.count(),
        this.models.Artisanat?.count() || 0
      ]);
      return { oeuvres, evenements, artisanats };
    } catch (error) { return { oeuvres: [], evenements: 0, artisanats: 0 }; }
  }

  /**
   * Top contributeurs (oeuvres + événements)
   */
  async getTopContributors(limit = 10) {
    try {
      return await this.models.User.findAll({
        attributes: [
          'id_user', 'nom', 'prenom', 'id_type_user',
          [literal(`(SELECT COUNT(*) FROM oeuvre WHERE oeuvre.saisi_par = User.id_user AND oeuvre.statut = 'publie')`), 'oeuvres_count'],
          [literal(`(SELECT COUNT(*) FROM evenement WHERE evenement.id_user = User.id_user)`), 'evenements_count']
        ],
        order: [[literal('oeuvres_count + evenements_count'), 'DESC']],
        limit, raw: true
      });
    } catch (error) { return []; }
  }

  /**
   * Convertit un label de période en Date
   */
  getDateLimit(period) {
    switch (period) {
      case 'day': return subDays(new Date(), 1);
      case 'week': return subDays(new Date(), 7);
      case 'month': return subMonths(new Date(), 1);
      case 'year': return subYears(new Date(), 1);
      default: return subMonths(new Date(), 1);
    }
  }

  /**
   * Activité récente (5 derniers de chaque type)
   */
  async getRecentActivity() {
    try {
      const [oeuvres, evenements, commentaires] = await Promise.all([
        this.models.Oeuvre.findAll({
          attributes: ['id_oeuvre', 'titre', 'statut', 'date_creation', 'saisi_par'],
          limit: 5, order: [['date_creation', 'DESC']],
          include: [{ model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom'] }]
        }),
        this.models.Evenement.findAll({
          attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'statut', 'date_creation'],
          limit: 5, order: [['date_creation', 'DESC']]
        }),
        this.models.Commentaire?.findAll({
          attributes: ['id_commentaire', 'contenu', 'date_creation', 'id_user'],
          limit: 5, order: [['date_creation', 'DESC']],
          include: [{ model: this.models.User, attributes: ['nom', 'prenom'] }]
        }) || []
      ]);
      return { oeuvres, evenements, commentaires };
    } catch (error) { return { oeuvres: [], evenements: [], commentaires: [] }; }
  }

  /**
   * Statistiques détaillées par période
   */
  async generateDetailedStats(period) {
    const dateLimit = this.getDateLimit(period);
    const [userGrowth, contentByType, recentActivity, topContributors] = await Promise.all([
      this.getUserGrowth(dateLimit),
      this.getContentByType(),
      this.getRecentActivity(),
      this.getTopContributors()
    ]);
    return { period, dateLimit, userGrowth, contentByType, recentActivity, topContributors };
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
    const dateWhere = { date_creation: { [Op.gte]: startDate } };

    const [newOeuvres, newEvenements] = await Promise.all([
      this.models.Oeuvre ? this.models.Oeuvre.count({ where: dateWhere }) : 0,
      this.models.Evenement ? this.models.Evenement.count({ where: dateWhere }) : 0
    ]);

    return { newOeuvres, newEvenements };
  }

  // ---- Patrimoine stats ----

  /**
   * Statistiques patrimoine complètes
   */
  async generatePatrimoineStats() {
    const [totalSites, totalParcours, evolution, popularSites, activeParcoursCount] = await Promise.all([
      this.models.Lieu?.count() || 0,
      this.models.Parcours?.count() || 0,
      this._getPatrimoineEvolution(),
      this._getPopularPatrimoineSites(),
      this._getActiveParcoursCount()
    ]);
    return { totalSites, totalParcours, activeParcoursCount, evolution, popularSites };
  }

  async _getPatrimoineEvolution() {
    try {
      if (!this.models.Lieu) return [];
      return await this.models.Lieu.findAll({
        attributes: [[fn('DATE_FORMAT', col('date_creation'), '%Y-%m'), 'month'], [fn('COUNT', '*'), 'count']],
        where: { date_creation: { [Op.gte]: subMonths(new Date(), 12) } },
        group: [fn('DATE_FORMAT', col('date_creation'), '%Y-%m')],
        order: [[literal('month'), 'ASC']],
        raw: true
      });
    } catch (error) { return []; }
  }

  async _getPopularPatrimoineSites() {
    try {
      if (!this.models.Lieu || !this.models.Favori) return [];
      return await this.models.Lieu.findAll({
        attributes: [
          'id_lieu', 'nom', 'typeLieu',
          [literal(`(SELECT COUNT(*) FROM favoris WHERE favoris.type_entite = 'lieu' AND favoris.id_entite = Lieu.id_lieu)`), 'favorites_count']
        ],
        order: [[literal('favorites_count'), 'DESC']],
        limit: 10, raw: true
      });
    } catch (error) { return []; }
  }

  async _getActiveParcoursCount() {
    try {
      if (!this.models.Parcours) return 0;
      return await this.models.Parcours.count({ where: { statut: 'actif' } });
    } catch (error) { return 0; }
  }

  // ---- QR stats ----

  /**
   * Statistiques QR codes
   */
  async generateQRStats(startDate) {
    if (!this.models.QRScan) {
      return { totalScans: 0, uniqueVisitors: 0, peakHours: [], topSites: [] };
    }
    const [totalScans, peakHours] = await Promise.all([
      this.models.QRScan.count({ where: { scan_date: { [Op.gte]: startDate } } }),
      this._getQRScanPeakHours(startDate)
    ]);
    return { totalScans, peakHours };
  }

  async _getQRScanPeakHours(startDate) {
    try {
      if (!this.models.QRScan) return [];
      return await this.models.QRScan.findAll({
        attributes: [[fn('HOUR', col('scan_date')), 'hour'], [fn('COUNT', '*'), 'scans']],
        where: { scan_date: { [Op.gte]: startDate } },
        group: [fn('HOUR', col('scan_date'))],
        order: [[literal('hour'), 'ASC']],
        raw: true
      });
    } catch (error) { return []; }
  }
}

module.exports = DashboardStatsService;
