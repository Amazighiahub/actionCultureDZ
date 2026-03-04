/**
 * EvenementDTO - Data Transfer Object pour les événements
 */

const BaseDTO = require('../baseDTO');

class EvenementDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);
    this.id = data.id;
    this.nom = data.nom;
    this.description = data.description;
    this.dateDebut = data.dateDebut;
    this.dateFin = data.dateFin;
    this.statut = data.statut;
    this.imageUrl = data.imageUrl;
    this.capaciteMax = data.capaciteMax;
    this.tarif = data.tarif;
    this.inscriptionRequise = data.inscriptionRequise;
    this.dateLimiteInscription = data.dateLimiteInscription;
    this.contactEmail = data.contactEmail;
    this.contactTelephone = data.contactTelephone;
    this.urlVirtuel = data.urlVirtuel;
    this.ageMinimum = data.ageMinimum;
    this.accessibilite = data.accessibilite;
    this.certificatDelivre = data.certificatDelivre;
    this.typeEvenement = data.typeEvenement;
    this.lieu = data.lieu;
    this.organisateur = data.organisateur;
    this.programmes = data.programmes || [];
    this.medias = data.medias || [];
    this.organisations = data.organisations || [];
    this.nombreParticipants = data.nombreParticipants;
    this.dateCreation = data.dateCreation;
  }

  /**
   * Transforme une entité Sequelize en DTO
   */
  static fromEntity(entity, options = {}) {
    if (!entity) return null;
    const raw = entity.get ? entity.get({ plain: true }) : entity;

    const dto = new EvenementDTO({
      id: raw.id_evenement,
      nom: BaseDTO.normalizeMultilang(raw.nom_evenement),
      description: BaseDTO.normalizeMultilang(raw.description),
      dateDebut: BaseDTO.toISODate(raw.date_debut),
      dateFin: BaseDTO.toISODate(raw.date_fin),
      statut: raw.statut,
      imageUrl: raw.image_url,
      capaciteMax: raw.capacite_max,
      tarif: raw.tarif ? parseFloat(raw.tarif) : 0,
      inscriptionRequise: raw.inscription_requise || false,
      dateLimiteInscription: BaseDTO.toISODate(raw.date_limite_inscription),
      contactEmail: raw.contact_email,
      contactTelephone: raw.contact_telephone,
      urlVirtuel: raw.url_virtuel,
      ageMinimum: raw.age_minimum,
      accessibilite: BaseDTO.normalizeMultilang(raw.accessibilite),
      certificatDelivre: raw.certificat_delivre || false,
      typeEvenement: raw.TypeEvenement ? {
        id: raw.TypeEvenement.id_type_evenement,
        nom: raw.TypeEvenement.nom_type
      } : null,
      lieu: raw.Lieu ? {
        id: raw.Lieu.id_lieu,
        nom: BaseDTO.normalizeMultilang(raw.Lieu.nom),
        adresse: BaseDTO.normalizeMultilang(raw.Lieu.adresse),
        latitude: raw.Lieu.latitude,
        longitude: raw.Lieu.longitude,
        wilaya: raw.Lieu.Commune?.Daira?.Wilaya?.nom_wilaya || null
      } : null,
      organisateur: raw.Organisateur ? {
        id: raw.Organisateur.id_user,
        nom: raw.Organisateur.nom,
        prenom: raw.Organisateur.prenom,
        photo: raw.Organisateur.photo_url
      } : null,
      programmes: (raw.Programmes || []).map(p => ({
        id: p.id_programme,
        titre: BaseDTO.normalizeMultilang(p.titre),
        description: BaseDTO.normalizeMultilang(p.description),
        date: p.date,
        heureDebut: p.heure_debut,
        heureFin: p.heure_fin
      })),
      medias: (raw.Medias || []).map(m => ({
        id: m.id_media,
        url: m.url,
        type: m.type_media
      })),
      organisations: (raw.Organisations || []).map(o => ({
        id: o.id_organisation,
        nom: BaseDTO.normalizeMultilang(o.nom)
      })),
      nombreParticipants: raw.nombre_participants || 0,
      dateCreation: BaseDTO.toISODate(raw.date_creation)
    });
    dto._raw = raw;
    return dto;
  }

  /**
   * JSON pour les cartes (liste) - retourne le format brut Sequelize pour compatibilité frontend
   */
  toJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toCardJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }

  /**
   * JSON détaillé
   */
  toDetailJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }

  /**
   * JSON pour admin
   */
  toAdminJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
}

module.exports = EvenementDTO;
