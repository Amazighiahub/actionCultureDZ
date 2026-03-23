/**
 * AlbumMusicalDTO - DTO pour le sous-type AlbumMusical
 * Colonnes modèle: duree, id_genre (NOT NULL), label (NOT NULL)
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class AlbumMusicalDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.duree = data.duree != null ? this._parseDuree(data.duree) : undefined;
    this.idGenre = data.id_genre != null ? BaseDTO.toInt(data.id_genre) : undefined;
    this.label = BaseDTO.cleanString(data.label) || 'Indépendant';
  }

  /**
   * Parse "45:30" (mm:ss) ou "45" en minutes
   * @private
   */
  _parseDuree(duree) {
    if (duree == null || duree === '') return null;
    const num = parseInt(duree, 10);
    if (!isNaN(num)) return num;
    const parts = String(duree).split(':');
    if (parts.length >= 2) {
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return m + Math.round(s / 60);
    }
    return null;
  }

  validate() {
    const errors = [];

    // Validation durée
    if (this.duree !== undefined && this.duree !== null) {
      if (this.duree <= 0) {
        errors.push({
          field: 'duree',
          message: 'La durée doit être positive'
        });
      }
      if (this.duree > 1440) {
        errors.push({
          field: 'duree',
          message: 'La durée semble excessive (max 1440 min)'
        });
      }
    }

    // Validation label (longueur max du modèle: 100)
    if (this.label && this.label.length > 100) {
      errors.push({
        field: 'label',
        message: 'Le label est trop long (max 100 caractères)'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      duree: this.duree != null ? this.duree : null,
      id_genre: this.idGenre ?? 1,
      label: this.label || 'Indépendant'
    };
  }
}

module.exports = AlbumMusicalDTO;
