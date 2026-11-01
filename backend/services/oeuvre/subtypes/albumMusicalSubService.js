/**
 * AlbumMusicalSubService - Logique spécifique au sous-type Album Musical (type « Musique »)
 */

const BaseSubtypeService = require('./baseSubtypeService');
const AlbumMusicalDTO = require('../../../dto/oeuvre/subtypes/albumMusicalDTO');

const TYPE_MUSIQUE = 3;

class AlbumMusicalSubService extends BaseSubtypeService {
  constructor(models) {
    super('AlbumMusical', models, AlbumMusicalDTO);
  }

  /**
   * Genre de l'album d'après les catégories de l'œuvre (déjà enregistrées dans la même transaction) :
   * le genre musical de la première catégorie choisie qui en a un.
   * @private
   */
  async _genreDesCategories(oeuvreId, transaction) {
    const { OeuvreCategorie, GenreCategorie, TypeOeuvreGenre } = this.models || {};
    if (!OeuvreCategorie || !GenreCategorie || !TypeOeuvreGenre) return null;

    const choisies = await OeuvreCategorie.findAll({
      where: { id_oeuvre: oeuvreId }, attributes: ['id_categorie'], order: [['id', 'ASC']], transaction
    });
    if (!choisies.length) return null;

    const genresMusique = await TypeOeuvreGenre.findAll({
      where: { id_type_oeuvre: TYPE_MUSIQUE, actif: 1 }, attributes: ['id_genre'], transaction
    });
    if (!genresMusique.length) return null;

    const liens = await GenreCategorie.findAll({
      where: {
        id_categorie: choisies.map((c) => c.id_categorie),
        id_genre: genresMusique.map((g) => g.id_genre),
        actif: 1
      },
      attributes: ['id_genre', 'id_categorie'],
      transaction
    });
    for (const { id_categorie } of choisies) {
      const lien = liens.find((l) => l.id_categorie === id_categorie);
      if (lien) return lien.id_genre;
    }
    return null;
  }

  /**
   * Genre envoyé par le client, gardé seulement s'il est un genre musical actif
   * (un identifiant inconnu donnait une erreur de clé étrangère, donc une erreur 500).
   * @private
   */
  async _genreValide(idGenre, transaction) {
    const id = parseInt(idGenre, 10);
    if (!id || !this.models?.TypeOeuvreGenre) return null;
    const lien = await this.models.TypeOeuvreGenre.findOne({
      where: { id_type_oeuvre: TYPE_MUSIQUE, id_genre: id, actif: 1 }, attributes: ['id_genre'], transaction
    });
    return lien ? id : null;
  }

  /**
   * Surcharge createForOeuvre pour gérer la logique du genre
   */
  async createForOeuvre(oeuvreId, detailsSpecifiques, transaction) {
    if (!this.model) {
      this.logger.warn(`Modèle ${this.modelName} non disponible, création sous-type ignorée`);
      return null;
    }

    const ds = detailsSpecifiques || {};

    // Valider via le DTO
    this._validateDTO(ds);

    let idGenre = await this._genreValide(ds.id_genre, transaction) || await this._genreDesCategories(oeuvreId, transaction);

    // Repli : premier genre actif du type, dans l'ordre d'affichage (Andalou, pas le plus petit id)
    if (!idGenre && this.models?.TypeOeuvreGenre) {
      const tog = await this.models.TypeOeuvreGenre.findOne({
        where: { id_type_oeuvre: TYPE_MUSIQUE, actif: 1 },
        order: [['ordre_affichage', 'ASC']],
        transaction
      });
      idGenre = tog?.id_genre || null;
    }

    const duree = ds.duree ? this._parseDureeToMinutes(ds.duree) : null;
    const entite = AlbumMusicalDTO.fromRequest(ds).toEntity();

    const record = await this.model.create({
      id_oeuvre: oeuvreId,
      duree,
      id_genre: idGenre ?? 1,
      label: ds.label || 'Indépendant',
      format: entite.format,
      nb_pistes: entite.nb_pistes,
      pistes: entite.pistes,
      liens_ecoute: entite.liens_ecoute,
      instruments: entite.instruments
    }, { transaction });

    this.logger.info(`${this.modelName} créé pour œuvre ${oeuvreId}`);
    return record;
  }

  /**
   * Les catégories viennent d'être resynchronisées : le genre suit, sauf s'il est donné explicitement.
   */
  async updateForOeuvre(oeuvreId, detailsSpecifiques, transaction) {
    if (!detailsSpecifiques) return null;
    const idGenre = await this._genreValide(detailsSpecifiques.id_genre, transaction)
      || await this._genreDesCategories(oeuvreId, transaction);
    // Un genre non valide envoyé par le client est ignoré (le genre en place est gardé)
    const { id_genre: _ignore, ...reste } = detailsSpecifiques;
    return super.updateForOeuvre(oeuvreId, idGenre ? { ...reste, id_genre: idGenre } : reste, transaction);
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.duree !== undefined) data.duree = this._parseDureeToMinutes(ds.duree);
    if (ds.id_genre !== undefined) data.id_genre = ds.id_genre;
    if (ds.label !== undefined) data.label = ds.label;
    const entite = AlbumMusicalDTO.fromRequest(ds).toEntity();
    if (ds.format !== undefined) data.format = entite.format;
    if (ds.nb_pistes !== undefined) data.nb_pistes = entite.nb_pistes;
    if (ds.pistes !== undefined) data.pistes = entite.pistes;
    if (ds.liens_ecoute !== undefined) data.liens_ecoute = entite.liens_ecoute;
    if (ds.instruments !== undefined) data.instruments = entite.instruments;
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
