// controllers/DashboardController.js
// Refactored: methods are organized in sub-modules under ./dashboard/

const analyticsMethods = require('./dashboard/analyticsMethods');
const moderationMethods = require('./dashboard/moderationMethods');
const usersMethods = require('./dashboard/usersMethods');
const monitoringMethods = require('./dashboard/monitoringMethods');
const BaseController = require('./baseController');
const { DASHBOARD_PERMISSIONS } = require('../constants/dashboardPermissions');

// ============================================================
// DashboardController — constructor + shared infrastructure
// ============================================================
class DashboardController extends BaseController {
  constructor() {
    super();
    this.adminPermissions = DASHBOARD_PERMISSIONS;
  }

  // ========================================
  // SHARED INFRASTRUCTURE
  // ========================================

  // Cache des statistiques : celui du service (Redis partagé, mémoire en secours). Lot 3 doublons (2026-11-19) :
  // une 2e version, mémoire seule, était écrite ici.
  getCachedData(key, generator, ttl = 300) {
    return require('../services/serviceContainer').statsService.getCached(key, generator, ttl);
  }

  clearCache(pattern = null) {
    return require('../services/serviceContainer').statsService.clearCache(pattern);
  }
}

// ============================================================
// Mixin sub-module methods onto the prototype
// ============================================================
const allMethods = [analyticsMethods, moderationMethods, usersMethods, monitoringMethods];

for (const methods of allMethods) {
  for (const [name, fn] of Object.entries(methods)) {
    if (typeof fn === 'function') {
      DashboardController.prototype[name] = fn;
    }
  }
}

// Les routes passent les méthodes sans les appeler sur le contrôleur (dashboardController.getAllUsers) :
// chaque méthode est liée à l'instance, sinon `this` (this._handleError…) est vide et une erreur faisait
// planter la requête au lieu de répondre proprement (2026-11-16)
const instance = new DashboardController();
for (const nom of Object.getOwnPropertyNames(DashboardController.prototype)) {
  if (nom !== 'constructor' && typeof instance[nom] === 'function') instance[nom] = instance[nom].bind(instance);
}

module.exports = instance;
