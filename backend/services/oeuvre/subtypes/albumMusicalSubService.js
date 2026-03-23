/**
 * AlbumMusicalSubService - Logique spécifique au sous-type Album Musical
 */

const BaseSubtypeService = require('./baseSubtypeService');
const AlbumMusicalDTO = require('../../../dto/oeuvre/subtypes/albumMusicalDTO');

class AlbumMusicalSubService extends BaseSubtypeService {
  constructor(models) {
    super('AlbumMusical', models, AlbumMusicalDTO);
  }

  /**
   * Surcharge createForOeuvre pour gérer la logique du genre par défaut
   */
  async createForOeuvre(oeuvreId, detailsSpecifiques, transaction) {
    if (!this.model) {
      this.logger.warn(`Modèle ${this.modelName} non disponible, création sous-type ignorée`);
      return null;
    }

    const ds = detailsSpecifiques || {};

    // Valider via le DTO
    this._validateDTO(ds);

    let idGenre = ds.id_genre || null;

    // Fallback : chercher un genre par défaut via TypeOeuvreGenre
    if (!idGenre && this.models?.TypeOeuvreGenre) {
      const tog = await this.models.TypeOeuvreGenre.findOne({
        where: { id_type_oeuvre: 3, actif: 1 },
        transaction
      });
      idGenre = tog?.id_genre || null;
    }

    const duree = ds.duree ? this._parseDureeToMinutes(ds.duree) : null;

    const record = await this.model.create({
      id_oeuvre: oeuvreId,
      duree,
      id_genre: idGenre ?? 1,
      label: ds.label || 'Indépendant'
    }, { transaction });

    this.logger.info(`${this.modelName} créé pour œuvre ${oeuvreId}`);
    return record;
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.duree !== undefined) data.duree = this._parseDureeToMinutes(ds.duree);
    if (ds.id_genre !== undefined) data.id_genre = ds.id_genre;
    if (ds.label !== undefined) data.label = ds.label;
    return data;
  }

  /**
   * Parse "45:30" (mm:ss) ou "45" en minutes
   * @private
   */
  _parseDureeToMinutes(duree) {
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
}

module.exports = AlbumMusicalSubService;
