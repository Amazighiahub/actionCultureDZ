/**
 * ParcoursDTO - Data Transfer Object pour les parcours intelligents
 */

const BaseDTO = require('../baseDTO');

class ParcoursDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);
    this.id = data.id;
    this.nom = data.nom;
    this.description = data.description;
    this.dureeEstimee = data.dureeEstimee;
    this.difficulte = data.difficulte;
    this.theme = data.theme;
    this.distanceKm = data.distanceKm;
    this.pointDepart = data.pointDepart;
    this.pointArrivee = data.pointArrivee;
    this.statut = data.statut;
    this.createur = data.createur;
    this.etapes = data.etapes || [];
    this.nombreEtapes = data.nombreEtapes;
    this.dateCreation = data.dateCreation;
  }

  static fromEntity(entity, options = {}) {
    if (!entity) return null;
    const raw = entity.get ? entity.get({ plain: true }) : entity;

    const etapes = (raw.Etapes || [])
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      .map(e => ({
        id: e.id_parcours_lieu,
        ordre: e.ordre,
        dureeEstimee: e.duree_estimee,
        distancePrecedent: e.distance_precedent,
        tempsTrajet: e.temps_trajet,
        notes: e.notes,
        transportMode: e.transport_mode,
        lieu: e.Lieu ? {
          id: e.Lieu.id_lieu,
          nom: BaseDTO.normalizeMultilang(e.Lieu.nom),
          adresse: BaseDTO.normalizeMultilang(e.Lieu.adresse),
          latitude: e.Lieu.latitude,
          longitude: e.Lieu.longitude,
          typePatrimoine: e.Lieu.typePatrimoine,
          medias: (e.Lieu.LieuMedias || e.Lieu.LieuMedia || []).map(m => ({
            id: m.id_media || m.id,
            url: m.url,
            type: m.type_media || m.type
          }))
        } : null,
        evenement: e.Evenement ? {
          id: e.Evenement.id_evenement,
          nom: BaseDTO.normalizeMultilang(e.Evenement.nom_evenement),
          dateDebut: BaseDTO.toISODate(e.Evenement.date_debut),
          dateFin: BaseDTO.toISODate(e.Evenement.date_fin)
        } : null
      }));

    const dto = new ParcoursDTO({
      id: raw.id_parcours,
      nom: BaseDTO.normalizeMultilang(raw.nom_parcours),
      description: BaseDTO.normalizeMultilang(raw.description),
      dureeEstimee: raw.duree_estimee,
      difficulte: raw.difficulte,
      theme: raw.theme,
      distanceKm: raw.distance_km ? parseFloat(raw.distance_km) : null,
      pointDepart: raw.point_depart,
      pointArrivee: raw.point_arrivee,
      statut: raw.statut,
      createur: raw.Createur ? {
        id: raw.Createur.id_user,
        nom: raw.Createur.nom,
        prenom: raw.Createur.prenom,
        photo: raw.Createur.photo_url
      } : null,
      etapes,
      nombreEtapes: etapes.length,
      dateCreation: BaseDTO.toISODate(raw.date_creation)
    });
    dto._raw = raw;
    return dto;
  }

  toJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toCardJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toDetailJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toMapJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toAdminJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
}

module.exports = ParcoursDTO;
