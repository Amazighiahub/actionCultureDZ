/**
 * UserDTO - Data Transfer Object pour les utilisateurs
 * Utilisé pour les réponses API (lecture)
 */
const BaseDTO = require('../BaseDTO');

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
    this.typeUser = data.type_user || data.typeUser;
    this.statutValidation = data.statut_validation || data.statutValidation || 'en_attente';
    this.estActif = BaseDTO.toBool(data.est_actif ?? data.estActif ?? true);
    this.estSuspendu = BaseDTO.toBool(data.est_suspendu ?? data.estSuspendu ?? false);

    // Contact
    this.telephone = BaseDTO.cleanString(data.telephone);
    this.entreprise = BaseDTO.cleanString(data.entreprise);
    this.siteWeb = BaseDTO.cleanString(data.site_web || data.siteWeb);

    // Médias
    this.photoUrl = data.photo_url || data.photoUrl;

    // Localisation
    this.wilaya = BaseDTO.cleanString(data.wilaya);
    this.commune = BaseDTO.cleanString(data.commune);

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
      typeUser: data.type_user,
      photoUrl: data.photo_url,
      statutValidation: data.statut_validation
    };
  }

  /**
   * Version pour affichage public (sans données sensibles)
   */
  toPublicJSON(lang = 'fr') {
    return {
      id: this.id,
      nom: BaseDTO.extractMultilang(this.nom, lang),
      prenom: BaseDTO.extractMultilang(this.prenom, lang),
      typeUser: this.typeUser,
      photoUrl: this.photoUrl,
      biographie: BaseDTO.extractMultilang(this.biographie, lang),
      entreprise: this.entreprise
    };
  }

  /**
   * Version complète pour l'admin
   */
  toAdminJSON(lang = 'fr') {
    return {
      ...this.toJSON(lang),
      email: this.email,
      telephone: this.telephone,
      statutValidation: this.statutValidation,
      estActif: this.estActif,
      estSuspendu: this.estSuspendu,
      dateCreation: this.dateCreation,
      derniereConnexion: this.derniereConnexion,
      roles: this.roles
    };
  }
}

module.exports = UserDTO;
