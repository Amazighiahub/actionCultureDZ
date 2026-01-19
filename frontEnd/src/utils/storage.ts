// utils/storage.ts - Utilitaires pour le stockage local et session

// =============================================================================
// TOKEN STORAGE (pour l'authentification)
// =============================================================================

export const tokenStorage = {
  TOKEN_KEY: 'patrimoine_auth_token',
  
  setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
    }
  },

  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  },

  removeToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
    }
  },

  hasToken(): boolean {
    return !!this.getToken();
  }
};

// =============================================================================
// STORAGE GÉNÉRIQUE
// =============================================================================

interface StorageInterface {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, expiresIn?: number): void;
  remove(key: string): void;
  clear(): void;
  exists(key: string): boolean;
  getAll(): Record<string, any>;
  getSize(): number;
}

class Storage implements StorageInterface {
  private storage: globalThis.Storage;
  private prefix: string;

  constructor(storage: globalThis.Storage, prefix = 'patrimoine_') {
    this.storage = storage;
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (item === null) return null;
      
      const parsed = JSON.parse(item);
      
      // Vérifier si l'item a une expiration
      if (parsed.expires && Date.now() > parsed.expires) {
        this.remove(key);
        return null;
      }
      
      return parsed.value !== undefined ? parsed.value : parsed;
    } catch (error) {
      console.error(`Erreur lors de la lecture de ${key}:`, error);
      return null;
    }
  }

  set<T>(key: string, value: T, expiresIn?: number): void {
    try {
      const item = expiresIn 
        ? { value, expires: Date.now() + expiresIn }
        : { value };
      
      this.storage.setItem(this.getKey(key), JSON.stringify(item));
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de ${key}:`, error);
      
      // Si erreur de quota, essayer de libérer de l'espace
      if (error instanceof DOMException && error.code === DOMException.QUOTA_EXCEEDED_ERR) {
        this.cleanup();
        try {
          const item = expiresIn 
            ? { value, expires: Date.now() + expiresIn }
            : { value };
          this.storage.setItem(this.getKey(key), JSON.stringify(item));
        } catch (retryError) {
          console.error(`Impossible de sauvegarder ${key} même après nettoyage:`, retryError);
        }
      }
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`Erreur lors de la suppression de ${key}:`, error);
    }
  }

  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.error('Erreur lors du nettoyage du storage:', error);
    }
  }

  exists(key: string): boolean {
    return this.get(key) !== null;
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const fullKey = this.storage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          const key = fullKey.substring(this.prefix.length);
          result[key] = this.get(key);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les éléments:', error);
    }
    return result;
  }

  // Nettoyer les éléments expirés
  private cleanup(): void {
    const keysToRemove: string[] = [];
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const fullKey = this.storage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          const item = this.storage.getItem(fullKey);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.expires && Date.now() > parsed.expires) {
                keysToRemove.push(fullKey);
              }
            } catch {
              // Item corrompu, le supprimer
              keysToRemove.push(fullKey);
            }
          }
        }
      }
      keysToRemove.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  }

  // Obtenir la taille utilisée (approximative)
  getSize(): number {
    let size = 0;
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const item = this.storage.getItem(key);
          if (item) {
            size += key.length + item.length;
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du calcul de la taille:', error);
    }
    return size;
  }
}

// =============================================================================
// INSTANCES POUR DIFFÉRENTS TYPES DE STOCKAGE
// =============================================================================

// Storage local persistant
export const storage = new Storage(globalThis.localStorage, 'patrimoine_');

// Storage de session (temporaire)
export const sessionStorage = new Storage(globalThis.sessionStorage, 'patrimoine_session_');

// =============================================================================
// CACHE INTELLIGENT POUR API
// =============================================================================

interface CacheConfig {
  ttl?: number; // Time to live en millisecondes
  maxSize?: number; // Taille maximale en bytes
}

class ApiCache {
  private storage: Storage;
  private config: Required<CacheConfig>;

  constructor(storage: Storage, config: CacheConfig = {}) {
    this.storage = storage;
    this.config = {
      ttl: config.ttl || 1000 * 60 * 15, // 15 minutes par défaut
      maxSize: config.maxSize || 1024 * 1024 * 5, // 5MB par défaut
    };
  }

  set<T>(key: string, data: T, customTtl?: number): void {
    const ttl = customTtl || this.config.ttl;
    
    // Vérifier la taille avant de sauvegarder
    const size = JSON.stringify(data).length;
    if (size > this.config.maxSize) {
      console.warn(`Données trop volumineuses pour ${key}: ${size} bytes`);
      return;
    }

    // Nettoyer le cache si nécessaire
    if (this.storage.getSize() > this.config.maxSize) {
      this.cleanup();
    }

    this.storage.set(key, data, ttl);
  }

  get<T>(key: string): T | null {
    return this.storage.get<T>(key);
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.storage.clear();
      return;
    }

    const allItems = this.storage.getAll();
    Object.keys(allItems).forEach(key => {
      if (key.includes(pattern)) {
        this.storage.remove(key);
      }
    });
  }

  private cleanup(): void {
    // Supprimer les items les plus anciens
    const allItems = this.storage.getAll();
    const keys = Object.keys(allItems);
    
    // Supprimer 25% des éléments les plus anciens
    const toRemove = Math.floor(keys.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.storage.remove(keys[i]);
    }
  }

  getStats() {
    return {
      size: this.storage.getSize(),
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      items: Object.keys(this.storage.getAll()).length
    };
  }
}

// Instance du cache API
export const apiCache = new ApiCache(storage, {
  ttl: 1000 * 60 * 15, // 15 minutes
  maxSize: 1024 * 1024 * 5 // 5MB
});

// =============================================================================
// UTILITAIRES SPÉCIALISÉS
// =============================================================================

// Cache pour les métadonnées (plus long)
export const metadataCache = new ApiCache(storage, {
  ttl: 1000 * 60 * 60 * 24, // 24 heures
  maxSize: 1024 * 1024 * 2 // 2MB
});

// Favoris utilisateur
export const favoritesStorage = {
  addFavorite(type: 'oeuvres' | 'evenements' | 'lieux', id: number): void {
    const key = `favorites_${type}`;
    const favorites = storage.get<number[]>(key) || [];
    if (!favorites.includes(id)) {
      favorites.push(id);
      storage.set(key, favorites);
    }
  },

  removeFavorite(type: 'oeuvres' | 'evenements' | 'lieux', id: number): void {
    const key = `favorites_${type}`;
    const favorites = storage.get<number[]>(key) || [];
    const updated = favorites.filter(fav => fav !== id);
    storage.set(key, updated);
  },

  getFavorites(type: 'oeuvres' | 'evenements' | 'lieux'): number[] {
    const key = `favorites_${type}`;
    return storage.get<number[]>(key) || [];
  },

  isFavorite(type: 'oeuvres' | 'evenements' | 'lieux', id: number): boolean {
    return this.getFavorites(type).includes(id);
  },

  clearFavorites(type?: 'oeuvres' | 'evenements' | 'lieux'): void {
    if (type) {
      storage.remove(`favorites_${type}`);
    } else {
      storage.remove('favorites_oeuvres');
      storage.remove('favorites_evenements');
      storage.remove('favorites_lieux');
    }
  }
};

// Historique de recherche
export const searchHistory = {
  add(query: string, type?: string): void {
    const key = 'search_history';
    const history = storage.get<Array<{query: string, type?: string, timestamp: number}>>(key) || [];
    
    // Éviter les doublons
    const existing = history.findIndex(item => item.query === query && item.type === type);
    if (existing !== -1) {
      history.splice(existing, 1);
    }
    
    // Ajouter en première position
    history.unshift({ query, type, timestamp: Date.now() });
    
    // Limiter à 50 entrées
    if (history.length > 50) {
      history.splice(50);
    }
    
    storage.set(key, history);
  },

  get(limit = 10): Array<{query: string, type?: string, timestamp: number}> {
    const history = storage.get<Array<{query: string, type?: string, timestamp: number}>>('search_history') || [];
    return history.slice(0, limit);
  },

  clear(): void {
    storage.remove('search_history');
  }
};

// Préférences utilisateur
export const userPreferences = {
  set<T>(key: string, value: T): void {
    storage.set(`pref_${key}`, value);
  },

  get<T>(key: string, defaultValue?: T): T | null {
    return storage.get<T>(`pref_${key}`) ?? defaultValue ?? null;
  },

  remove(key: string): void {
    storage.remove(`pref_${key}`);
  },

  // Préférences communes
  getLanguage(): string {
    return this.get('language', 'fr') as string;
  },

  setLanguage(lang: string): void {
    this.set('language', lang);
  },

  getTheme(): 'light' | 'dark' | 'auto' {
    return this.get('theme', 'auto') as 'light' | 'dark' | 'auto';
  },

  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.set('theme', theme);
  },

  getItemsPerPage(): number {
    return this.get('itemsPerPage', 12) as number;
  },

  setItemsPerPage(count: number): void {
    this.set('itemsPerPage', count);
  }
};

// =============================================================================
// UTILS DEBUGGING ET MONITORING
// =============================================================================

export const storageUtils = {
  // Obtenir des stats sur l'utilisation du storage
  getStorageStats() {
    return {
      localStorage: {
        used: storage.getSize(),
        items: Object.keys(storage.getAll()).length
      },
      sessionStorage: {
        used: sessionStorage.getSize(),
        items: Object.keys(sessionStorage.getAll()).length
      },
      apiCache: apiCache.getStats(),
      totalFavorites: Object.keys(storage.getAll()).filter(key => key.startsWith('favorites_')).length
    };
  },

  // Nettoyer tout le cache applicatif
  clearAllCache() {
    apiCache.invalidate();
    metadataCache.invalidate();
    searchHistory.clear();
  },

  // Exporter les données utilisateur (favoris, préférences)
  exportUserData() {
    const data = storage.getAll();
    const userData = Object.keys(data)
      .filter(key => key.startsWith('favorites_') || key.startsWith('pref_'))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {} as Record<string, any>);
    
    return {
      exportDate: new Date().toISOString(),
      data: userData
    };
  },

  // Importer les données utilisateur
  importUserData(exportedData: { data: Record<string, any> }) {
    Object.entries(exportedData.data).forEach(([key, value]) => {
      if (key.startsWith('favorites_') || key.startsWith('pref_')) {
        storage.set(key, value);
      }
    });
  }
};
