/**
 * LivreDTO - DTO pour le sous-type Livre
 * Colonnes modèle: isbn, nb_pages, id_genre
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class LivreDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.isbn = BaseDTO.cleanString(data.isbn);
    this.nbPages = data.nb_pages != null ? BaseDTO.toInt(data.nb_pages) : undefined;
    this.idGenre = data.id_genre != null ? BaseDTO.toInt(data.id_genre) : undefined;
  }

  validate() {
    const errors = [];

    // Validation ISBN (si fourni)
    if (this.isbn) {
      const isbnClean = this.isbn.replace(/[-\s]/g, '');
      if (!/^(\d{10}|\d{13})$/.test(isbnClean)) {
        errors.push({
          field: 'isbn',
          message: 'ISBN invalide (doit être 10 ou 13 chiffres)'
        });
      }
    }

    // Validation nb_pages
    if (this.nbPages !== undefined && this.nbPages !== null) {
      if (this.nbPages <= 0) {
        errors.push({
          field: 'nb_pages',
          message: 'Le nombre de pages doit être positif'
        });
      }
      if (this.nbPages > 50000) {
        errors.push({
          field: 'nb_pages',
          message: 'Le nombre de pages semble excessif (max 50 000)'
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      isbn: this.isbn || null,
      nb_pages: this.nbPages != null ? this.nbPages : null,
      id_genre: this.idGenre || null
    };
  }
}

module.exports = LivreDTO;
