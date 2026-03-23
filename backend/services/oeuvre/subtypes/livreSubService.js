/**
 * LivreSubService - Logique spécifique au sous-type Livre
 */

const BaseSubtypeService = require('./baseSubtypeService');
const LivreDTO = require('../../../dto/oeuvre/subtypes/livreDTO');

class LivreSubService extends BaseSubtypeService {
  constructor(models) {
    super('Livre', models, LivreDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      isbn: ds.isbn || null,
      nb_pages: ds.nb_pages != null ? parseInt(ds.nb_pages, 10) : null,
      id_genre: ds.id_genre || null
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.isbn !== undefined) data.isbn = ds.isbn;
    if (ds.nb_pages !== undefined) data.nb_pages = parseInt(ds.nb_pages, 10);
    if (ds.id_genre !== undefined) data.id_genre = ds.id_genre;
    return data;
  }
}

module.exports = LivreSubService;
