/**
 * BaseSubtypeDTO - Classe de base pour les DTOs de sous-types d'œuvres
 * Fournit le pattern commun de validation et transformation
 */
const BaseDTO = require('../../baseDTO');

class BaseSubtypeDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);
  }

  /**
   * Crée un DTO depuis les données brutes de details_specifiques
   * @param {Object} data - Données brutes du sous-type
   * @returns {BaseSubtypeDTO}
   */
  static fromRequest(data = {}) {
    return new this(data);
  }

  /**
   * Valide les données du sous-type
   * @returns {{ valid: boolean, errors: Array }}
   */
  validate() {
    return { valid: true, errors: [] };
  }

  /**
   * Transforme en données pour Sequelize (colonnes du modèle sous-type)
   * Doit être implémenté par chaque sous-classe
   * @returns {Object}
   */
  toEntity() {
    throw new Error('toEntity must be implemented in child DTO');
  }

  /**
   * Transforme en données pour une mise à jour partielle
   * Ne retourne que les champs présents (non-undefined)
   * @returns {Object}
   */
  toUpdateEntity() {
    const full = this.toEntity();
    const partial = {};
    for (const [key, value] of Object.entries(full)) {
      if (value !== undefined) {
        partial[key] = value;
      }
    }
    return partial;
  }
}

module.exports = BaseSubtypeDTO;
