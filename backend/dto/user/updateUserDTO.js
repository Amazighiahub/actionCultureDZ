/**
 * UpdateUserDTO - DTO pour la mise à jour d'utilisateur
 */
const BaseDTO = require('../baseDTO');

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
    if (data.langue_preferee !== undefined) this.languePreferee = data.langue_preferee;
    if (data.theme_prefere !== undefined) this.themePrefere = data.theme_prefere;
    if (data.notifications_email !== undefined) this.notificationsEmail = BaseDTO.toBool(data.notifications_email);
    if (data.notifications_push !== undefined) this.notificationsPush = BaseDTO.toBool(data.notifications_push);
    if (data.profil_public !== undefined) this.profilPublic = BaseDTO.toBool(data.profil_public);
    if (data.email_public !== undefined) this.emailPublic = BaseDTO.toBool(data.email_public);
    if (data.telephone_public !== undefined) this.telephonePublic = BaseDTO.toBool(data.telephone_public);
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
    if (this.languePreferee !== undefined) entity.langue_preferee = this.languePreferee;
    if (this.themePrefere !== undefined) entity.theme_prefere = this.themePrefere;
    if (this.notificationsEmail !== undefined) entity.notifications_email = this.notificationsEmail;
    if (this.notificationsPush !== undefined) entity.notifications_push = this.notificationsPush;
    if (this.profilPublic !== undefined) entity.profil_public = this.profilPublic;
    if (this.emailPublic !== undefined) entity.email_public = this.emailPublic;
    if (this.telephonePublic !== undefined) entity.telephone_public = this.telephonePublic;

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
