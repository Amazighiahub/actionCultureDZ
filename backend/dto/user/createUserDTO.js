/**
 * CreateUserDTO - DTO pour la création d'utilisateur
 * Utilisé pour valider et transformer les données d'inscription
 */
const BaseDTO = require('../baseDTO');

class CreateUserDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Champs obligatoires
    this.email = BaseDTO.cleanString(data.email)?.toLowerCase();
    this.password = data.password; // Ne pas nettoyer le mot de passe
    this.confirmationPassword = data.password_confirmation || data.confirmation_mot_de_passe || data.confirmationPassword;
    this.nom = BaseDTO.normalizeMultilang(data.nom);
    this.prenom = BaseDTO.normalizeMultilang(data.prenom);

    // Champs optionnels
    this.sexe = BaseDTO.cleanString(data.sexe) || null;
    this.dateNaissance = BaseDTO.cleanString(data.date_naissance || data.dateNaissance) || null;
    this.telephone = BaseDTO.cleanString(data.telephone);
    this.typeUser = data.type_user || data.typeUser || 'visiteur';
    this.idTypeUser = parseInt(data.id_type_user || data.idTypeUser) || 1;
    this.entreprise = BaseDTO.cleanString(data.entreprise);
    this.biographie = BaseDTO.normalizeMultilang(data.biographie);
    this.siteWeb = BaseDTO.cleanString(data.site_web || data.siteWeb);
    this.portfolio = BaseDTO.cleanString(data.portfolio);
    this.wilaya = BaseDTO.cleanString(data.wilaya);
    this.wilayaResidence = BaseDTO.toInt(data.wilaya_residence || data.wilayaResidence || data.wilaya, null);
    this.commune = BaseDTO.cleanString(data.commune);

    // Consentements
    this.accepteConditions = BaseDTO.toBool(data.accepte_conditions || data.accepteConditions);
    this.accepteNewsletter = BaseDTO.toBool(data.accepte_newsletter || data.accepteNewsletter);

    // Photo (URL si fournie)
    this.photoUrl = BaseDTO.cleanString(data.photo_url || data.photoUrl);
  }

  /**
   * Crée un DTO depuis le body de la requête
   */
  static fromRequest(body, options = {}) {
    return new CreateUserDTO(body);
  }

  /**
   * Transforme le DTO en données pour Sequelize
   */
  toEntity() {
    return {
      email: this.email,
      password: this.password, // Sera hashé par le service
      nom: this.nom,
      prenom: this.prenom,
      sexe: this.sexe,
      date_naissance: this.dateNaissance,
      telephone: this.telephone,
      id_type_user: this.idTypeUser,
      entreprise: this.entreprise,
      biographie: this.biographie,
      site_web: this.siteWeb,
      wilaya_residence: this.wilayaResidence,
      adresse: this.commune,
      accepte_conditions: this.accepteConditions,
      accepte_newsletter: this.accepteNewsletter,
      photo_url: this.photoUrl,
      statut: this.typeUser === 'visiteur' ? 'actif' : 'en_attente_validation',
      date_creation: new Date()
    };
  }

  /**
   * Valide les données
   */
  validate() {
    const errors = [];

    // Email obligatoire et valide
    if (!this.email) {
      errors.push({ field: 'email', message: 'L\'email est requis' });
    } else if (!this._isValidEmail(this.email)) {
      errors.push({ field: 'email', message: 'Format d\'email invalide' });
    }

    // Mot de passe obligatoire et fort
    if (!this.password) {
      errors.push({ field: 'password', message: 'Le mot de passe est requis' });
    } else if (this.password.length < 12) {
      errors.push({ field: 'password', message: 'Le mot de passe doit contenir au moins 12 caractères' });
    } else if (!this._isStrongPassword(this.password)) {
      errors.push({ field: 'password', message: 'Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial' });
    }

    // Confirmation mot de passe (R-3)
    if (this.password && this.confirmationPassword !== undefined) {
      if (this.password !== this.confirmationPassword) {
        errors.push({ field: 'confirmation_mot_de_passe', message: 'Les mots de passe ne correspondent pas' });
      }
    }

    // Nom obligatoire
    if (!BaseDTO.extractMultilang(this.nom)) {
      errors.push({ field: 'nom', message: 'Le nom est requis' });
    }

    // Prénom obligatoire
    if (!BaseDTO.extractMultilang(this.prenom)) {
      errors.push({ field: 'prenom', message: 'Le prénom est requis' });
    }

    // Sexe : doit être 'M' ou 'F' si fourni (ENUM en base)
    if (this.sexe && !['M', 'F'].includes(this.sexe)) {
      errors.push({ field: 'sexe', message: 'Le sexe doit être M ou F' });
    }

    // Date de naissance : date valide, pas dans le futur, âge >= 13 ans
    if (this.dateNaissance) {
      const birth = new Date(this.dateNaissance);
      if (isNaN(birth.getTime())) {
        errors.push({ field: 'date_naissance', message: 'Date de naissance invalide' });
      } else {
        const today = new Date();
        if (birth > today) {
          errors.push({ field: 'date_naissance', message: 'La date de naissance ne peut pas être dans le futur' });
        } else {
          // Calcul d'âge précis (mois + jour)
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          if (age < 13) {
            errors.push({ field: 'date_naissance', message: 'Vous devez avoir au moins 13 ans' });
          }
        }
      }
    }

    // Conditions acceptées
    if (!this.accepteConditions) {
      errors.push({ field: 'accepteConditions', message: 'Vous devez accepter les conditions' });
    }

    // Téléphone valide si fourni
    if (this.telephone && !this._isValidPhone(this.telephone)) {
      errors.push({ field: 'telephone', message: 'Format de téléphone invalide' });
    }

    // Portfolio URL valide si fourni (bloquer javascript:, data:, file:)
    if (this.portfolio && !this._isSafeUrl(this.portfolio)) {
      errors.push({ field: 'portfolio', message: 'URL de portfolio invalide' });
    }

    // Site web URL valide si fourni
    if (this.siteWeb && !this._isSafeUrl(this.siteWeb)) {
      errors.push({ field: 'site_web', message: 'URL de site web invalide' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  _isStrongPassword(password) {
    return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
  }

  _isValidPhone(phone) {
    // Format algérien
    return /^(0|\+213)[567][0-9]{8}$/.test(phone.replace(/\s/g, ''));
  }

  _isSafeUrl(url) {
    // Bloquer les schémas dangereux
    const dangerous = /^(javascript|data|file|vbscript):/i;
    if (dangerous.test(url.trim())) return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

module.exports = CreateUserDTO;
