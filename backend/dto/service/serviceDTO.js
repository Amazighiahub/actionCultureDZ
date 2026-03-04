/**
 * ServiceDTO - Data Transfer Object pour les services culturels
 */

const BaseDTO = require('../baseDTO');

class ServiceDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);
    this.id = data.id;
    this.nom = data.nom;
    this.description = data.description;
    this.typeService = data.typeService;
    this.disponible = data.disponible;
    this.statut = data.statut;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.adresse = data.adresse;
    this.telephone = data.telephone;
    this.email = data.email;
    this.siteWeb = data.siteWeb;
    this.horaires = data.horaires;
    this.tarifMin = data.tarifMin;
    this.tarifMax = data.tarifMax;
    this.photoUrl = data.photoUrl;
    this.lieu = data.lieu;
    this.professionnel = data.professionnel;
    this.dateCreation = data.dateCreation;
  }

  static fromEntity(entity, options = {}) {
    if (!entity) return null;
    const raw = entity.get ? entity.get({ plain: true }) : entity;

    const dto = new ServiceDTO({
      id: raw.id,
      nom: BaseDTO.normalizeMultilang(raw.nom),
      description: BaseDTO.normalizeMultilang(raw.description),
      typeService: raw.type_service,
      disponible: raw.disponible,
      statut: raw.statut,
      latitude: raw.latitude ? parseFloat(raw.latitude) : null,
      longitude: raw.longitude ? parseFloat(raw.longitude) : null,
      adresse: BaseDTO.normalizeMultilang(raw.adresse),
      telephone: raw.telephone,
      email: raw.email,
      siteWeb: raw.site_web,
      horaires: raw.horaires || {},
      tarifMin: raw.tarif_min ? parseFloat(raw.tarif_min) : null,
      tarifMax: raw.tarif_max ? parseFloat(raw.tarif_max) : null,
      photoUrl: raw.photo_url,
      lieu: raw.Lieu ? {
        id: raw.Lieu.id_lieu,
        nom: BaseDTO.normalizeMultilang(raw.Lieu.nom),
        adresse: BaseDTO.normalizeMultilang(raw.Lieu.adresse),
        latitude: raw.Lieu.latitude,
        longitude: raw.Lieu.longitude,
        wilaya: raw.Lieu.Commune?.Daira?.Wilaya?.nom_wilaya || null
      } : null,
      professionnel: raw.Professionnel ? {
        id: raw.Professionnel.id_user,
        nom: raw.Professionnel.nom,
        prenom: raw.Professionnel.prenom,
        photo: raw.Professionnel.photo_url
      } : null,
      dateCreation: BaseDTO.toISODate(raw.createdAt || raw.date_creation)
    });
    dto._raw = raw;
    return dto;
  }

  toJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toCardJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toDetailJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toAdminJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
}

module.exports = ServiceDTO;
