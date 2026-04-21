/**
 * Service de monitoring pour le Dashboard Admin
 * Alertes système, health checks, métriques de performance
 */
const { subDays, subHours } = require('date-fns');
const { Op } = require('sequelize');

class DashboardMonitoringService {
  constructor(models, repositories = {}) {
    this.models = models;
    this.repositories = repositories;
    this.userRepo = repositories.user || null;
    this.oeuvreRepo = repositories.oeuvre || null;
    this.signalementRepo = repositories.signalement || null;
  }

  /**
   * Génère les alertes dashboard basées sur des seuils
   * Utilise les repositories existants pour les counts
   * @returns {Array} Liste d'alertes avec type, catégorie, message, priorité
   */
  async generateAlerts() {
    const alerts = [];

    // 1. Utilisateurs en attente depuis > 7 jours
    const pendingUsersCount = this.userRepo
      ? await this.userRepo.count({
          statut: 'en_attente_validation',
          date_creation: { [Op.lt]: subDays(new Date(), 7) }
        })
      : 0;
    if (pendingUsersCount > 0) {
      alerts.push({
        type: 'warning', category: 'users',
        message: `${pendingUsersCount} utilisateurs en attente depuis plus de 7 jours`,
        priority: 'high', timestamp: new Date()
      });
    }

    // 2. Oeuvres en attente depuis > 3 jours (seuil : > 10)
    const pendingOeuvresCount = this.oeuvreRepo
      ? await this.oeuvreRepo.count({
          statut: 'en_attente',
          date_creation: { [Op.lt]: subDays(new Date(), 3) }
        })
      : 0;
    if (pendingOeuvresCount > 10) {
      alerts.push({
        type: 'warning', category: 'content',
        message: `${pendingOeuvresCount} œuvres en attente de validation`,
        priority: 'medium', timestamp: new Date()
      });
    }

    // 3. Signalements urgents non traités depuis > 24h
    const untreatedReports = this.signalementRepo
      ? await this.signalementRepo.count({
          statut: 'en_attente',
          priorite: 'urgente',
          date_signalement: { [Op.lt]: subHours(new Date(), 24) }
        })
      : 0;
    if (untreatedReports > 0) {
      alerts.push({
        type: 'error', category: 'moderation',
        message: `${untreatedReports} signalements urgents non traités`,
        priority: 'critical', timestamp: new Date()
      });
    }

    // 4. Espace disque
    const diskSpace = await this.checkDiskSpace();
    if (diskSpace && diskSpace.percentUsed > 90) {
      alerts.push({
        type: 'error', category: 'system',
        message: `Espace disque critique: ${diskSpace.percentUsed}% utilisé`,
        priority: 'critical', timestamp: new Date()
      });
    }

    // 5. Temps de réponse moyen
    const avgResponseTime = await this.getAverageResponseTime();
    if (avgResponseTime > 2000) {
      alerts.push({
        type: 'warning', category: 'performance',
        message: `Temps de réponse élevé: ${avgResponseTime}ms`,
        priority: 'medium', timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Vérifie l'espace disque disponible
   * TODO: Implémenter avec un vrai check OS (diskusage, check-disk-space, etc.)
   * @returns {Object|null} { total, used, free, percentUsed }
   */
  async checkDiskSpace() {
    // TODO: Remplacer ce stub par un vrai check OS (diskusage, check-disk-space, etc.)
    // Le try/catch a été retiré : tant que c'est un return littéral, il ne peut pas throw.
    // À réintroduire lors de l'implémentation réelle (appel async qui peut échouer).
    return { total: 100000000000, used: 50000000000, free: 50000000000, percentUsed: 50 };
  }

  /**
   * Calcule le temps de réponse moyen sur les 24 dernières heures
   * Utilise this.models car PerformanceLog n'a pas de repository dédié
   * @returns {number} Temps moyen en ms
   */
  async getAverageResponseTime() {
    try {
      if (!this.models.PerformanceLog) return 0;
      const sequelize = this.models.PerformanceLog.sequelize;
      const result = await this.models.PerformanceLog.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('response_time')), 'avg_time']],
        where: { created_at: { [Op.gte]: subHours(new Date(), 24) } },
        raw: true
      });
      return result?.avg_time || 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = DashboardMonitoringService;
