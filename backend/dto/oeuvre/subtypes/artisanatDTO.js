/**
 * ArtisanatDTO - DTO pour le sous-type Artisanat
 * Colonnes modèle: id_materiau, id_technique, dimensions, poids, prix
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class ArtisanatDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.idMateriau = data.id_materiau != null ? BaseDTO.toInt(data.id_materiau) : undefined;
    this.idTechnique = data.id_technique != null ? BaseDTO.toInt(data.id_technique) : undefined;
    this.dimensions = BaseDTO.cleanString(data.dimensions);
    this.poids = data.poids != null ? BaseDTO.toFloat(data.poids) : undefined;
    this.prix = data.prix != null ? BaseDTO.toFloat(data.prix) : undefined;
  }

  validate() {
    const errors = [];

    if (this.dimensions && this.dimensions.length > 255) {
      errors.push({
        field: 'dimensions',
        message: 'Les dimensions sont trop longues (max 255 caractères)'
      });
    }

    if (this.poids !== undefined && this.poids !== null) {
      if (this.poids < 0) {
        errors.push({
          field: 'poids',
          message: 'Le poids ne peut pas être négatif'
        });
      }
      if (this.poids > 99999) {
        errors.push({
          field: 'poids',
          message: 'Le poids semble excessif (max 99 999 kg)'
        });
      }
    }

    if (this.prix !== undefined && this.prix !== null) {
      if (this.prix < 0) {
        errors.push({
          field: 'prix',
          message: 'Le prix ne peut pas être négatif'
        });
      }
      if (this.prix > 99999999) {
        errors.push({
          field: 'prix',
          message: 'Le prix semble excessif'
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      id_materiau: this.idMateriau || null,
      id_technique: this.idTechnique || null,
      dimensions: this.dimensions || null,
      poids: this.poids != null ? this.poids : null,
      prix: this.prix != null ? this.prix : null
    };
  }
}

module.exports = ArtisanatDTO;
