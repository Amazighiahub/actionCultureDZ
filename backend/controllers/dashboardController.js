// controllers/DashboardController.js
// Refactored: methods are organized in sub-modules under ./dashboard/

const analyticsMethods = require('./dashboard/analyticsMethods');
const moderationMethods = require('./dashboard/moderationMethods');
const usersMethods = require('./dashboard/usersMethods');
const monitoringMethods = require('./dashboard/monitoringMethods');
const BaseController = require('./baseController');
const { DASHBOARD_PERMISSIONS } = require('../constants/dashboardPermissions');
const LRUCache = require('../utils/LRUCache');

// ============================================================
// DashboardController — constructor + shared infrastructure
// ============================================================
class DashboardController extends BaseController {
  constructor() {
    super();
    this.cache = new LRUCache(200);
    this.adminPermissions = DASHBOARD_PERMISSIONS;
  }

  // ========================================
  // SHARED INFRASTRUCTURE
  // ========================================

  async getCachedData(key, generator, ttl = 300) {
    try {
      const cached = this.cache.get(key);
      if (cached !== undefined) return cached;
      const data = await generator();
      this.cache.set(key, data, ttl * 1000);
      return data;
    } catch (error) {
      console.error('Erreur cache:', error.message);
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
