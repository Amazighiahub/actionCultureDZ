/**
 * UserDTO - Data Transfer Object pour les utilisateurs
 * Utilisé pour les réponses API (lecture)
 */
const BaseDTO = require('../baseDTO');

class UserDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Identifiants
    this.id = data.id || data.id_user;
    this.email = data.email;

    // Informations personnelles (multilingues)
    this.nom = BaseDTO.normalizeMultilang(data.nom);
    this.prenom = BaseDTO.normalizeMultilang(data.prenom);
    this.biographie = BaseDTO.normalizeMultilang(data.biographie);

    // Type et statut
    this.idTypeUser = data.id_type_user || data.idTypeUser;
    this.statut = data.statut || 'actif';

    // Contact
    this.telephone = BaseDTO.cleanString(data.telephone);
    this.entreprise = BaseDTO.cleanString(data.entreprise);
    this.siteWeb = BaseDTO.cleanString(data.site_web || data.siteWeb);

    // Médias
    this.photoUrl = data.photo_url || data.photoUrl;

    // Localisation
    this.wilayaResidence = data.wilaya_residence || data.wilayaResidence;
    this.adresse = BaseDTO.cleanString(data.adresse);

    // Dates
    this.dateCreation = BaseDTO.toDate(data.date_creation || data.dateCreation);
    this.derniereConnexion = BaseDTO.toDate(data.derniere_connexion || data.derniereConnexion);
    this.dateValidation = BaseDTO.toDate(data.date_validation || data.dateValidation);

    // Relations (si chargées)
    this.roles = data.Roles ? data.Roles.map(r => r.nom_role || r.nom) : [];

    // Stats (si disponibles)
    this.stats = data.stats || null;
  }

  /**
   * Crée un UserDTO depuis une entité Sequelize
   */
  static fromEntity(entity, options = {}) {
    if (!entity) return null;

    const data = entity.get ? entity.get({ plain: true }) : entity;
    const dto = new UserDTO(data);
    // Strip sensitive fields from _raw to prevent password leaking in toJSON/translateRaw
    const { password, ...safeData } = data;

    // Rétro-compatibilité frontend : déduire statut_validation depuis statut
    if (!safeData.statut_validation && safeData.statut) {
      safeData.statut_validation = UserDTO._statutValidationForFrontend(safeData.statut);
    }

    dto._raw = safeData;

    // Options pour inclure des données supplémentaires
    if (options.includeStats && entity.stats) {
      dto.stats = entity.stats;
    }

    return dto;
  }

  /**
   * Version simplifiée pour les listes
   */
  static toListItem(entity, lang = 'fr') {
    if (!entity) return null;
    const data = entity.get ? entity.get({ plain: true }) : entity;

    return {
      id: data.id_user,
      nom: BaseDTO.extractMultilang(data.nom, lang),
      prenom: BaseDTO.extractMultilang(data.prenom, lang),
      email: data.email,
      idTypeUser: data.id_type_user,
      photoUrl: data.photo_url,
      statut: data.statut,
      statut_validation: UserDTO._statutValidationForFrontend(data.statut)
    };
  }

  /**
   * Version pour affichage public (sans données sensibles)
   */
  toJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toPublicJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }
  toAdminJSON(lang = 'fr') { return BaseDTO.translateRaw(this._raw, lang); }

  /**
   * Convertit statut (backend) → statut_validation (frontend)
   */
  static _statutValidationForFrontend(statut) {
    switch (statut) {
      case 'actif': return 'valide';
      case 'en_attente_validation': return 'en_attente';
      default: return statut;
    }
  }
}

module.exports = UserDTO;
