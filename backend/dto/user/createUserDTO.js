/**
 * CreateUserDTO - DTO pour la création d'utilisateur
 * Utilisé pour valider et transformer les données d'inscription
 */
const BaseDTO = require('../baseDTO');
const { REGISTRABLE_TYPE_USER_IDS } = require('../../constants/typeUserIds');

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
    // Absent ou non numerique => visiteur ; toute autre valeur est controlee dans validate()
    const rawTypeUser = parseInt(data.id_type_user ?? data.idTypeUser, 10);
    this.idTypeUser = Number.isInteger(rawTypeUser) ? rawTypeUser : 1;
    this.entreprise = BaseDTO.cleanString(data.entreprise);
    this.biographie = BaseDTO.normalizeMultilang(data.biographie);
    this.siteWeb = BaseDTO.cleanString(data.site_web || data.siteWeb);
    this.portfolio = BaseDTO.cleanString(data.portfolio);
    this.wilaya = BaseDTO.cleanString(data.wilaya);
    this.wilayaResidence = BaseDTO.toInt(data.wilaya_residence || data.wilayaResidence || data.wilaya, null);
    this.commune = BaseDTO.cleanString(data.commune);
    // Commune de résidence (identifiant) : obligatoire pour un professionnel
    this.idCommune = BaseDTO.toInt(data.id_commune ?? data.communeId, null);

    // Consentements
    this.accepteConditions = BaseDTO.toBool(data.accepte_conditions || data.accepteConditions);
    this.accepteNewsletter = BaseDTO.toBool(data.accepte_newsletter || data.accepteNewsletter);

    // RGPD Art. 7 — preuve du consentement (injecté par le contrôleur/service, pas par le frontend)
    this.ipClient = BaseDTO.cleanString(data._ipClient) || null;

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
      id_commune: this.idCommune,
      adresse: this.commune,
      accepte_conditions: this.accepteConditions,
      accepte_newsletter: this.accepteNewsletter,
      date_acceptation_conditions: this.accepteConditions ? new Date() : null,
      ip_acceptation_conditions: this.accepteConditions ? this.ipClient : null,
      ip_inscription: this.ipClient,
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

    // Type d'utilisateur : uniquement les types inscriptibles (jamais administrateur)
    if (!REGISTRABLE_TYPE_USER_IDS.has(this.idTypeUser)) {
      errors.push({ field: 'id_type_user', message: 'Type d\'utilisateur invalide' });
    }

    // Professionnel : commune obligatoire (proximité avec les lieux et les autres pros)
    if (this.idTypeUser !== 1 && !this.idCommune) {
      errors.push({ field: 'id_commune', message: 'La commune est obligatoire pour un compte professionnel' });
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

    // Photo : uniquement un média hébergé par la plateforme (service d'upload)
    if (this.photoUrl && !BaseDTO.isOwnMediaUrl(this.photoUrl)) {
      errors.push({ field: 'photo_url', message: 'Photo invalide : utilisez le service d\'upload' });
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
    // Format international : +indicatif suivi de 6-14 chiffres
    const digits = phone.replace(/[\s\-().]/g, '');
    return /^\+?[0-9]{8,15}$/.test(digits);
  }

  _isSafeUrl(url) {
    return BaseDTO.isHttpUrl(url);
  }
}

module.exports = CreateUserDTO;
