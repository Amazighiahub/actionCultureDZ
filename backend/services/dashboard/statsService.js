/**
 * Service de statistiques pour le Dashboard
 * Extrait de DashboardController pour une meilleure modularité
 */
const { Op, fn, col, literal } = require('sequelize');
const { subDays, subHours, subMonths, subYears, startOfDay } = require('date-fns');
const LRUCache = require('../../utils/LRUCache');

class DashboardStatsService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.cache = new LRUCache(200);
  }

  async getCached(key, generator, ttl = 300) {
    try {
      const cached = this.cache.get(key);
      if (cached !== undefined) return cached;
      const data = await generator();
      this.cache.set(key, data, ttl * 1000);
      return data;
    } catch (error) {
      console.error('Erreur cache stats:', error.message);
      return await generator();
    }
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
          'id_lieu', 'nom_fr', 'nom_ar', 'typeLieu',
          [literal(`(SELECT COUNT(*) FROM favori WHERE favori.entity_type = 'lieu' AND favori.entity_id = Lieu.id_lieu)`), 'favorites_count']
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
