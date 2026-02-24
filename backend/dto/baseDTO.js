/**
 * BaseDTO - Classe de base pour les Data Transfer Objects
 * Assure la transformation et validation des données entre les couches
 *
 * Patterns utilisés:
 * - Data Transfer Object (DTO)
 * - Builder Pattern (via méthodes statiques)
 * - Immutability (freeze optionnel)
 */

class BaseDTO {
  constructor(data = {}) {
    // Données brutes conservées pour debug
    Object.defineProperty(this, '_raw', {
      value: data,
      enumerable: false,
      writable: false
    });
  }

  /**
   * Transforme une entité Sequelize en DTO
   * @param {Object} entity - Entité Sequelize
   * @param {Object} options - Options de transformation
   * @returns {BaseDTO}
   */
  static fromEntity(entity, options = {}) {
    throw new Error('fromEntity must be implemented in child class');
  }

  /**
   * Transforme le DTO en données pour créer/modifier une entité
   * @returns {Object}
   */
  toEntity() {
    throw new Error('toEntity must be implemented in child class');
  }

  /**
   * Transforme un tableau d'entités en tableau de DTOs
   * @param {Array} entities - Tableau d'entités
   * @param {Object} options - Options de transformation
   * @returns {Array<BaseDTO>}
   */
  static fromEntities(entities, options = {}) {
    if (!Array.isArray(entities)) return [];
    return entities.map(entity => this.fromEntity(entity, options)).filter(Boolean);
  }

  /**
   * Crée un DTO depuis une requête HTTP (body)
   * @param {Object} body - Corps de la requête
   * @param {Object} options - Options
   * @returns {BaseDTO}
   */
  static fromRequest(body, options = {}) {
    throw new Error('fromRequest must be implemented in child class');
  }

  /**
   * Retourne une représentation JSON propre pour l'API
   * @param {string} lang - Langue pour les champs multilingues
   * @returns {Object}
   */
  toJSON(lang = 'fr') {
    const obj = {};
    for (const [key, value] of Object.entries(this)) {
      if (key.startsWith('_')) continue;
      obj[key] = this._serializeValue(value, lang);
    }
    return obj;
  }

  /**
   * Sérialise une valeur pour JSON
   * @private
   */
  _serializeValue(value, lang) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (value instanceof BaseDTO) return value.toJSON(lang);
    if (Array.isArray(value)) {
      return value.map(v => this._serializeValue(v, lang));
    }
    if (typeof value === 'object' && this._isMultilang(value)) {
      return this.constructor.extractMultilang(value, lang);
    }
    return value;
  }

  /**
   * Vérifie si un objet est multilingue
   * @private
   */
  _isMultilang(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    const langKeys = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
    return keys.some(k => langKeys.includes(k));
  }

  /**
   * Retourne le JSON avec tous les champs multilingues complets
   * @returns {Object}
   */
  toFullJSON() {
    const obj = {};
    for (const [key, value] of Object.entries(this)) {
      if (key.startsWith('_')) continue;
      if (value instanceof BaseDTO) {
        obj[key] = value.toFullJSON();
      } else if (Array.isArray(value)) {
        obj[key] = value.map(v => v instanceof BaseDTO ? v.toFullJSON() : v);
      } else {
        obj[key] = value;
      }
    }
    return obj;
  }

  /**
   * Clone le DTO avec des modifications
   * @param {Object} overrides - Champs à modifier
   * @returns {BaseDTO}
   */
  clone(overrides = {}) {
    const Constructor = this.constructor;
    const data = { ...this.toFullJSON(), ...overrides };
    return new Constructor(data);
  }

  /**
   * Rend le DTO immuable
   * @returns {BaseDTO}
   */
  freeze() {
    return Object.freeze(this);
  }

  // ============================================================================
  // HELPERS MULTILINGUES
  // ============================================================================

  /**
   * Extrait une valeur d'un champ multilingue
   * @param {Object|string} field - Champ multilingue ou string
   * @param {string} lang - Langue désirée
   * @returns {string|null}
   */
  static extractMultilang(field, lang = 'fr') {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
      // Ordre de priorité : langue demandée > fr > ar > en > première valeur
      return field[lang] || field.fr || field.ar || field.en ||
             field['tz-ltn'] || field['tz-tfng'] ||
             Object.values(field).find(v => v && typeof v === 'string') || null;
    }
    return null;
  }

  /**
   * Crée un objet multilingue à partir d'une valeur
   * @param {string|Object} value - Valeur ou objet existant
   * @param {string} lang - Langue de la valeur si string
   * @returns {Object}
   */
  static createMultilang(value, lang = 'fr') {
    const base = { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };

    if (!value) return base;

    if (typeof value === 'object' && value !== null) {
      return { ...base, ...value };
    }

    return { ...base, [lang]: String(value) };
  }

  /**
   * Fusionne deux objets multilingues
   * @param {Object} target - Objet cible
   * @param {Object} source - Objet source
   * @returns {Object}
   */
  static mergeMultilang(target, source) {
    const result = { ...this.createMultilang(target) };
    if (source && typeof source === 'object') {
      for (const [lang, value] of Object.entries(source)) {
        if (value) result[lang] = value;
      }
    }
    return result;
  }

  /**
   * Normalise un champ qui peut être string ou multilingue
   * @param {string|Object} field - Champ à normaliser
   * @returns {Object}
   */
  static normalizeMultilang(field) {
    if (!field) return { fr: '', ar: '', en: '' };
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (typeof parsed === 'object') return this.createMultilang(parsed);
      } catch (e) {
        // Ce n'est pas du JSON, c'est une string simple
      }
      return this.createMultilang(field, 'fr');
    }
    return this.createMultilang(field);
  }

  // ============================================================================
  // HELPERS DE TRANSFORMATION
  // ============================================================================

  /**
   * Transforme une date en string ISO ou null
   * @param {Date|string} date
   * @returns {string|null}
   */
  static toISODate(date) {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    return new Date(date).toISOString();
  }

  /**
   * Transforme une string en Date ou null
   * @param {string|Date} value
   * @returns {Date|null}
   */
  static toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Parse un entier de manière sûre
   * @param {any} value
   * @param {number} defaultValue
   * @returns {number}
   */
  static toInt(value, defaultValue = 0) {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Parse un float de manière sûre
   * @param {any} value
   * @param {number} defaultValue
   * @returns {number}
   */
  static toFloat(value, defaultValue = 0) {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Convertit en booléen
   * @param {any} value
   * @returns {boolean}
   */
  static toBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return !!value;
  }

  /**
   * Nettoie une string (trim + null si vide)
   * @param {string} value
   * @returns {string|null}
   */
  static cleanString(value) {
    if (!value) return null;
    const cleaned = String(value).trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  /**
   * Parse un tableau JSON de manière sûre
   * @param {string|Array} value
   * @returns {Array}
   */
  static toArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}

module.exports = BaseDTO;
