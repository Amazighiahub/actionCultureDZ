/**
 * CreateUserDTO - DTO pour la création d'utilisateur
 * Utilisé pour valider et transformer les données d'inscription
 */
const BaseDTO = require('../BaseDTO');

class CreateUserDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Champs obligatoires
    this.email = BaseDTO.cleanString(data.email)?.toLowerCase();
    this.password = data.password; // Ne pas nettoyer le mot de passe
    this.nom = BaseDTO.normalizeMultilang(data.nom);
    this.prenom = BaseDTO.normalizeMultilang(data.prenom);

    // Champs optionnels
    this.telephone = BaseDTO.cleanString(data.telephone);
    this.typeUser = data.type_user || data.typeUser || 'visiteur';
    this.entreprise = BaseDTO.cleanString(data.entreprise);
    this.biographie = BaseDTO.normalizeMultilang(data.biographie);
    this.siteWeb = BaseDTO.cleanString(data.site_web || data.siteWeb);
    this.wilaya = BaseDTO.cleanString(data.wilaya);
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
      mot_de_passe: this.password, // Sera hashé par le service
      nom: this.nom,
      prenom: this.prenom,
      telephone: this.telephone,
      type_user: this.typeUser,
      entreprise: this.entreprise,
      biographie: this.biographie,
      site_web: this.siteWeb,
      wilaya: this.wilaya,
      commune: this.commune,
      accepte_conditions: this.accepteConditions,
      accepte_newsletter: this.accepteNewsletter,
      photo_url: this.photoUrl,
      // Valeurs par défaut
      statut_validation: this.typeUser === 'visiteur' ? 'valide' : 'en_attente',
      est_actif: true,
      est_suspendu: false,
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
    } else if (this.password.length < 8) {
      errors.push({ field: 'password', message: 'Le mot de passe doit contenir au moins 8 caractères' });
    } else if (!this._isStrongPassword(this.password)) {
      errors.push({ field: 'password', message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre' });
    }

    // Nom obligatoire
    if (!BaseDTO.extractMultilang(this.nom)) {
      errors.push({ field: 'nom', message: 'Le nom est requis' });
    }

    // Prénom obligatoire
    if (!BaseDTO.extractMultilang(this.prenom)) {
      errors.push({ field: 'prenom', message: 'Le prénom est requis' });
    }

    // Conditions acceptées
    if (!this.accepteConditions) {
      errors.push({ field: 'accepteConditions', message: 'Vous devez accepter les conditions' });
    }

    // Téléphone valide si fourni
    if (this.telephone && !this._isValidPhone(this.telephone)) {
      errors.push({ field: 'telephone', message: 'Format de téléphone invalide' });
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
    return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
  }

  _isValidPhone(phone) {
    // Format algérien
    return /^(0|\+213)[567][0-9]{8}$/.test(phone.replace(/\s/g, ''));
  }
}

module.exports = CreateUserDTO;
