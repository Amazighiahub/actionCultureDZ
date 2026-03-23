/**
 * FilmDTO - DTO pour le sous-type Film
 * Colonnes modèle: duree_minutes, realisateur, id_genre
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class FilmDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.dureeMinutes = data.duree_minutes != null ? BaseDTO.toInt(data.duree_minutes) : undefined;
    this.realisateur = BaseDTO.cleanString(data.realisateur);
    this.idGenre = data.id_genre != null ? BaseDTO.toInt(data.id_genre) : undefined;
  }

  validate() {
    const errors = [];

    // Validation durée
    if (this.dureeMinutes !== undefined && this.dureeMinutes !== null) {
      if (this.dureeMinutes <= 0) {
        errors.push({
          field: 'duree_minutes',
          message: 'La durée doit être positive'
        });
      }
      if (this.dureeMinutes > 1440) {
        errors.push({
          field: 'duree_minutes',
          message: 'La durée semble excessive (max 1440 min = 24h)'
        });
      }
    }

    // Validation réalisateur (longueur max)
    if (this.realisateur && this.realisateur.length > 255) {
      errors.push({
        field: 'realisateur',
        message: 'Le nom du réalisateur est trop long (max 255 caractères)'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      duree_minutes: this.dureeMinutes != null ? this.dureeMinutes : null,
      realisateur: this.realisateur || null,
      id_genre: this.idGenre || null
    };
  }
}

module.exports = FilmDTO;
