/**
 * OeuvreArtDTO - DTO pour le sous-type OeuvreArt
 * Colonnes modèle: technique, dimensions, support
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class OeuvreArtDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.technique = BaseDTO.cleanString(data.technique);
    this.dimensions = BaseDTO.cleanString(data.dimensions);
    this.support = BaseDTO.cleanString(data.support);
  }

  validate() {
    const errors = [];

    if (this.technique && this.technique.length > 255) {
      errors.push({
        field: 'technique',
        message: 'La technique est trop longue (max 255 caractères)'
      });
    }

    if (this.dimensions && this.dimensions.length > 255) {
      errors.push({
        field: 'dimensions',
        message: 'Les dimensions sont trop longues (max 255 caractères)'
      });
    }

    if (this.support && this.support.length > 255) {
      errors.push({
        field: 'support',
        message: 'Le support est trop long (max 255 caractères)'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      technique: this.technique || null,
      dimensions: this.dimensions || null,
      support: this.support || null
    };
  }
}

module.exports = OeuvreArtDTO;
