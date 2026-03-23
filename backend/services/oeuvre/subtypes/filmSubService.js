/**
 * FilmSubService - Logique spécifique au sous-type Film
 */

const BaseSubtypeService = require('./baseSubtypeService');
const FilmDTO = require('../../../dto/oeuvre/subtypes/filmDTO');

class FilmSubService extends BaseSubtypeService {
  constructor(models) {
    super('Film', models, FilmDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      duree_minutes: ds.duree_minutes != null ? parseInt(ds.duree_minutes, 10) : null,
      realisateur: ds.realisateur || null,
      id_genre: ds.id_genre || null
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.duree_minutes !== undefined) data.duree_minutes = parseInt(ds.duree_minutes, 10);
    if (ds.realisateur !== undefined) data.realisateur = ds.realisateur;
    if (ds.id_genre !== undefined) data.id_genre = ds.id_genre;
    return data;
  }
}

module.exports = FilmSubService;
