// controllers/DashboardController.js
// Refactored: methods are organized in sub-modules under ./dashboard/

const analyticsMethods = require('./dashboard/analyticsMethods');
const moderationMethods = require('./dashboard/moderationMethods');
const usersMethods = require('./dashboard/usersMethods');
const monitoringMethods = require('./dashboard/monitoringMethods');

// ============================================================
// LRU in-memory cache (internal to dashboard)
// ============================================================
class LRUCache {
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const item = this.cache.get(key);
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlMs) {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
  }

  delete(key) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
  get size() { return this.cache.size; }
  keys() { return this.cache.keys(); }
}

// ============================================================
// DashboardController — constructor + shared infrastructure
// ============================================================
class DashboardController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.cache = new LRUCache(200);
    this.adminPermissions = this.setupPermissions();
  }

  setupPermissions() {
    return {
      'Admin': [
        'view_dashboard', 'validate_user', 'validate_oeuvre',
        'moderate_comment', 'moderate_signalement', 'view_reports',
        'manage_events', 'manage_patrimoine'
      ],
      'Super Admin': ['*'],
      'Moderateur': [
        'view_dashboard', 'moderate_comment', 'moderate_signalement',
        'view_reports'
      ]
    };
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

  async checkAdminPermission(userId, action) {
    try {
      const user = await this.models.User.findByPk(userId, {
        include: [{ model: this.models.Role, as: 'Roles', through: { attributes: [] }, attributes: ['nom_role'] }]
      });
      if (!user || !user.Roles) return false;
      for (const role of user.Roles) {
        const permissions = this.adminPermissions[role.nom_role];
        if (permissions && (permissions.includes('*') || permissions.includes(action))) return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur vérification permissions:', error.message);
      return false;
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

module.exports = DashboardController;
