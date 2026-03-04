/**
 * ArtisanatDTO - Data Transfer Object pour l'artisanat
 */

const BaseDTO = require('../baseDTO');

class ArtisanatDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);
    this.id = data.id;
    this.dimensions = data.dimensions;
    this.poids = data.poids;
    this.prix = data.prix;
    this.oeuvre = data.oeuvre;
    this.materiau = data.materiau;
    this.technique = data.technique;
    this.artisan = data.artisan;
    this.medias = data.medias || [];
    this.dateCreation = data.dateCreation;
  }

  static fromEntity(entity, options = {}) {
    if (!entity) return null;
    const raw = entity.get ? entity.get({ plain: true }) : entity;

    const oeuvre = raw.Oeuvre || {};

    const dto = new ArtisanatDTO({
      id: raw.id_artisanat,
      dimensions: raw.dimensions,
      poids: raw.poids,
      prix: raw.prix ? parseFloat(raw.prix) : null,
      oeuvre: oeuvre ? {
        id: oeuvre.id_oeuvre,
        titre: BaseDTO.normalizeMultilang(oeuvre.titre),
        description: BaseDTO.normalizeMultilang(oeuvre.description),
        statut: oeuvre.statut,
        dateCreation: BaseDTO.toISODate(oeuvre.date_creation)
      } : null,
      materiau: raw.Materiau ? {
        id: raw.Materiau.id_materiau,
        nom: BaseDTO.normalizeMultilang(raw.Materiau.nom),
        description: BaseDTO.normalizeMultilang(raw.Materiau.description)
      } : null,
      technique: raw.Technique ? {
        id: raw.Technique.id_technique,
        nom: BaseDTO.normalizeMultilang(raw.Technique.nom),
        description: BaseDTO.normalizeMultilang(raw.Technique.description)
      } : null,
      artisan: oeuvre.Saiseur ? {
        id: oeuvre.Saiseur.id_user,
        nom: oeuvre.Saiseur.nom,
        prenom: oeuvre.Saiseur.prenom,
        photo: oeuvre.Saiseur.photo_url
      } : null,
      medias: (oeuvre.Media || []).map(m => ({
        id: m.id_media,
        url: m.url,
        type: m.type_media,
        thumbnail: m.thumbnail_url
      })),
      dateCreation: BaseDTO.toISODate(raw.date_creation || oeuvre.date_creation)
    });
    dto._raw = raw;
    return dto;
  }

  toJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toCardJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toDetailJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
}

module.exports = ArtisanatDTO;
