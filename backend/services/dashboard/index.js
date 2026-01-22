/**
 * Services Dashboard - Point d'entrée
 * Ces services sont extraits de DashboardController pour une meilleure modularité
 */

const DashboardStatsService = require('./StatsService');
const DashboardModerationService = require('./ModerationService');
const DashboardUserManagementService = require('./UserManagementService');
const DashboardAnalyticsService = require('./AnalyticsService');

/**
 * Factory pour créer tous les services dashboard
 * @param {Object} models - Modèles Sequelize
 */
function createDashboardServices(models) {
  return {
    stats: new DashboardStatsService(models),
    moderation: new DashboardModerationService(models),
    userManagement: new DashboardUserManagementService(models),
    analytics: new DashboardAnalyticsService(models)
  };
}

module.exports = {
  createDashboardServices,
  DashboardStatsService,
  DashboardModerationService,
  DashboardUserManagementService,
  DashboardAnalyticsService
};
