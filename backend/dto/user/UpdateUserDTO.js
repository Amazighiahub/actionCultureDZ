/**
 * UpdateUserDTO - DTO pour la mise à jour d'utilisateur
 */
const BaseDTO = require('../BaseDTO');

class UpdateUserDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Seuls les champs fournis sont inclus
    if (data.nom !== undefined) {
      this.nom = BaseDTO.normalizeMultilang(data.nom);
    }
    if (data.prenom !== undefined) {
      this.prenom = BaseDTO.normalizeMultilang(data.prenom);
    }
    if (data.telephone !== undefined) {
      this.telephone = BaseDTO.cleanString(data.telephone);
    }
    if (data.biographie !== undefined) {
      this.biographie = BaseDTO.normalizeMultilang(data.biographie);
    }
    if (data.entreprise !== undefined) {
      this.entreprise = BaseDTO.cleanString(data.entreprise);
    }
    if (data.site_web !== undefined || data.siteWeb !== undefined) {
      this.siteWeb = BaseDTO.cleanString(data.site_web || data.siteWeb);
    }
    if (data.wilaya !== undefined) {
      this.wilaya = BaseDTO.cleanString(data.wilaya);
    }
    if (data.commune !== undefined) {
      this.commune = BaseDTO.cleanString(data.commune);
    }
    if (data.photo_url !== undefined || data.photoUrl !== undefined) {
      this.photoUrl = BaseDTO.cleanString(data.photo_url || data.photoUrl);
    }
    if (data.accepte_newsletter !== undefined || data.accepteNewsletter !== undefined) {
      this.accepteNewsletter = BaseDTO.toBool(data.accepte_newsletter ?? data.accepteNewsletter);
    }
  }

  /**
   * Crée depuis le body de la requête
   */
  static fromRequest(body, options = {}) {
    return new UpdateUserDTO(body);
  }

  /**
   * Transforme en données pour Sequelize (seulement les champs définis)
   */
  toEntity() {
    const entity = {
      date_modification: new Date()
    };

    if (this.nom !== undefined) entity.nom = this.nom;
    if (this.prenom !== undefined) entity.prenom = this.prenom;
    if (this.telephone !== undefined) entity.telephone = this.telephone;
    if (this.biographie !== undefined) entity.biographie = this.biographie;
    if (this.entreprise !== undefined) entity.entreprise = this.entreprise;
    if (this.siteWeb !== undefined) entity.site_web = this.siteWeb;
    if (this.wilaya !== undefined) entity.wilaya = this.wilaya;
    if (this.commune !== undefined) entity.commune = this.commune;
    if (this.photoUrl !== undefined) entity.photo_url = this.photoUrl;
    if (this.accepteNewsletter !== undefined) entity.accepte_newsletter = this.accepteNewsletter;

    return entity;
  }

  /**
   * Vérifie si au moins un champ est à mettre à jour
   */
  hasChanges() {
    return Object.keys(this).filter(k => !k.startsWith('_')).length > 0;
  }

  /**
   * Valide les données
   */
  validate() {
    const errors = [];

    // Téléphone valide si fourni
    if (this.telephone && !this._isValidPhone(this.telephone)) {
      errors.push({ field: 'telephone', message: 'Format de téléphone invalide' });
    }

    // URL valide si fournie
    if (this.siteWeb && !this._isValidUrl(this.siteWeb)) {
      errors.push({ field: 'siteWeb', message: 'URL invalide' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _isValidPhone(phone) {
    return /^(0|\+213)[567][0-9]{8}$/.test(phone.replace(/\s/g, ''));
  }

  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = UpdateUserDTO;
