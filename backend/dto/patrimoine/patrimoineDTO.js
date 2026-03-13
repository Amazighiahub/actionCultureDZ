/**
 * PatrimoineDTO - Data Transfer Object pour les sites patrimoniaux
 */

const BaseDTO = require('../baseDTO');

class PatrimoineDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);
    this.id = data.id;
    this.id_lieu = data.id_lieu ?? data.id;
    this.nom = data.nom;
    this.adresse = data.adresse;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.typeLieu = data.typeLieu;
    this.typePatrimoine = data.typePatrimoine;
    this.commune = data.commune;
    this.daira = data.daira;
    this.wilaya = data.wilaya;
    this.detail = data.detail;
    this.monuments = data.monuments || [];
    this.vestiges = data.vestiges || [];
    this.medias = data.medias || [];
    this.services = data.services || [];
    this.qrcodes = data.qrcodes || [];
    this.programmes = data.programmes || [];
    this.dateCreation = data.dateCreation;
  }

  static fromEntity(entity, options = {}) {
    if (!entity) return null;
    const raw = entity.get ? entity.get({ plain: true }) : entity;

    const dto = new PatrimoineDTO({
      id: raw.id_lieu,
      id_lieu: raw.id_lieu,
      nom: BaseDTO.normalizeMultilang(raw.nom),
      adresse: BaseDTO.normalizeMultilang(raw.adresse),
      latitude: raw.latitude,
      longitude: raw.longitude,
      typeLieu: raw.typeLieu,
      typePatrimoine: raw.typePatrimoine,
      commune: raw.commune ? {
        id: raw.commune.id_commune,
        nom: raw.commune.nom_commune
      } : null,
      daira: raw.daira ? {
        id: raw.daira.id_daira,
        nom: raw.daira.nom_daira
      } : null,
      wilaya: raw.wilaya ? {
        id: raw.wilaya.id_wilaya,
        nom: raw.wilaya.nom_wilaya,
        code: raw.wilaya.code_wilaya
      } : null,
      detail: raw.DetailLieu ? {
        id: raw.DetailLieu.id_detailLieu,
        description: BaseDTO.normalizeMultilang(raw.DetailLieu.description),
        horaires: raw.DetailLieu.horaires,
        tarifs: raw.DetailLieu.tarifs,
        accessibilite: raw.DetailLieu.accessibilite,
        contact: raw.DetailLieu.contact
      } : null,
      monuments: (raw.DetailLieu?.Monuments || raw.monuments || []).map(m => ({
        id: m.id_monument ?? m.id,
        nom: BaseDTO.normalizeMultilang(m.nom),
        description: BaseDTO.normalizeMultilang(m.description),
        type: m.type,
        epoque: m.epoque,
        style: m.style
      })),
      vestiges: (raw.DetailLieu?.Vestiges || raw.vestiges || []).map(v => ({
        id: v.id_vestige ?? v.id,
        nom: BaseDTO.normalizeMultilang(v.nom),
        description: BaseDTO.normalizeMultilang(v.description),
        type: v.type,
        periode: v.periode,
        etatConservation: v.etat_conservation
      })),
      medias: (raw.LieuMedias || raw.LieuMedia || raw.medias || []).map(m => ({
        id: m.id_media || m.id,
        url: m.url,
        type: m.type_media || m.type
      })),
      services: (raw.Services || raw.services || []).map(s => ({
        id: s.id,
        nom: BaseDTO.normalizeMultilang(s.nom),
        type: s.type_service,
        disponible: s.disponible
      })),
      qrcodes: (raw.QRCodes || raw.qrcodes || []).map(q => ({
        id: q.id_qrcode || q.id,
        url: q.url || q.qr_url
      })),
      programmes: (raw.Programmes || raw.programmes || []).map(p => ({
        id: p.id_programme,
        titre: BaseDTO.normalizeMultilang(p.titre),
        date: p.date,
        heureDebut: p.heure_debut,
        heureFin: p.heure_fin
      })),
      dateCreation: BaseDTO.toISODate(raw.createdAt || raw.date_creation)
    });
    dto._raw = raw;
    return dto;
  }

  static _addComputedFields(data) {
    if (!data) return data;
    // Map Sequelize PascalCase association keys to lowercase keys expected by frontend
    if (Array.isArray(data.LieuMedia) && !data.medias) {
      data.medias = data.LieuMedia;
    }
    if (Array.isArray(data.Services) && !data.services) {
      data.services = data.Services;
    }
    if (Array.isArray(data.QRCodes) && !data.qrcodes) {
      data.qrcodes = data.QRCodes;
    }
    if (Array.isArray(data.Programmes) && !data.programmes) {
      data.programmes = data.Programmes;
    }
    return data;
  }

  toJSON(lang = 'fr') { return PatrimoineDTO._addComputedFields(BaseDTO.translateRaw(this._raw, lang)); }
  toCardJSON(lang = 'fr') { return PatrimoineDTO._addComputedFields(BaseDTO.translateRaw(this._raw, lang)); }
  toDetailJSON(lang = 'fr') { return PatrimoineDTO._addComputedFields(BaseDTO.translateRaw(this._raw, lang)); }
  toMapJSON(lang = 'fr') { return PatrimoineDTO._addComputedFields(BaseDTO.translateRaw(this._raw, lang)); }
  toAdminJSON(lang = 'fr') { return PatrimoineDTO._addComputedFields(BaseDTO.translateRaw(this._raw, lang)); }
}

module.exports = PatrimoineDTO;
