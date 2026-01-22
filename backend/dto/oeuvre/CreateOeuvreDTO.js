/**
 * CreateOeuvreDTO - DTO pour la création d'une œuvre
 * Transforme et valide les données d'entrée
 */
const BaseDTO = require('../BaseDTO');

class CreateOeuvreDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Champs multilingues (obligatoires)
    this.titre = BaseDTO.normalizeMultilang(data.titre);
    this.description = BaseDTO.normalizeMultilang(data.description);
    this.resume = BaseDTO.normalizeMultilang(data.resume);

    // Type (obligatoire)
    this.idTypeOeuvre = BaseDTO.toInt(data.id_type_oeuvre || data.idTypeOeuvre);

    // Langue de l'œuvre
    this.idLangue = BaseDTO.toInt(data.id_langue || data.idLangue);

    // Créateur (sera défini par le contrôleur)
    this.idCreateur = BaseDTO.toInt(data.id_createur || data.idCreateur);

    // Détails optionnels
    this.anneeCreation = data.annee_creation || data.anneeCreation
      ? BaseDTO.toInt(data.annee_creation || data.anneeCreation)
      : null;
    this.isbn = BaseDTO.cleanString(data.isbn);
    this.editeur = BaseDTO.cleanString(data.editeur);
    this.pages = data.pages ? BaseDTO.toInt(data.pages) : null;
    this.duree = data.duree ? BaseDTO.toInt(data.duree) : null;
    this.prix = data.prix !== undefined ? BaseDTO.toFloat(data.prix) : null;
    this.devise = data.devise || 'DZD';

    // Médias
    this.imageUrl = BaseDTO.cleanString(data.image_url || data.imageUrl);
    this.coverUrl = BaseDTO.cleanString(data.cover_url || data.coverUrl);

    // Relations
    this.categories = BaseDTO.toArray(data.categories);
    this.tags = BaseDTO.toArray(data.tags);
  }

  /**
   * Crée un DTO depuis le corps de la requête
   */
  static fromRequest(body, userId = null) {
    const dto = new CreateOeuvreDTO(body);
    if (userId) {
      dto.idCreateur = userId;
    }
    return dto;
  }

  /**
   * Valide les données
   * @returns {{valid: boolean, errors: Array}}
   */
  validate() {
    const errors = [];

    // Titre obligatoire (au moins une langue)
    const titreFr = BaseDTO.extractMultilang(this.titre, 'fr');
    const titreAr = BaseDTO.extractMultilang(this.titre, 'ar');
    if (!titreFr && !titreAr) {
      errors.push({
        field: 'titre',
        message: 'Le titre est obligatoire (au moins en français ou arabe)'
      });
    }

    // Description obligatoire
    const descFr = BaseDTO.extractMultilang(this.description, 'fr');
    const descAr = BaseDTO.extractMultilang(this.description, 'ar');
    if (!descFr && !descAr) {
      errors.push({
        field: 'description',
        message: 'La description est obligatoire (au moins en français ou arabe)'
      });
    }

    // Type obligatoire
    if (!this.idTypeOeuvre || this.idTypeOeuvre <= 0) {
      errors.push({
        field: 'id_type_oeuvre',
        message: 'Le type d\'œuvre est obligatoire'
      });
    }

    // Créateur obligatoire
    if (!this.idCreateur || this.idCreateur <= 0) {
      errors.push({
        field: 'id_createur',
        message: 'Le créateur est obligatoire'
      });
    }

    // Validation année
    if (this.anneeCreation) {
      const currentYear = new Date().getFullYear();
      if (this.anneeCreation < 1800 || this.anneeCreation > currentYear + 1) {
        errors.push({
          field: 'annee_creation',
          message: `L'année doit être entre 1800 et ${currentYear + 1}`
        });
      }
    }

    // Validation ISBN (si fourni)
    if (this.isbn) {
      const isbnClean = this.isbn.replace(/[-\s]/g, '');
      if (!/^(\d{10}|\d{13})$/.test(isbnClean)) {
        errors.push({
          field: 'isbn',
          message: 'ISBN invalide (doit être 10 ou 13 chiffres)'
        });
      }
    }

    // Validation prix
    if (this.prix !== null && this.prix < 0) {
      errors.push({
        field: 'prix',
        message: 'Le prix ne peut pas être négatif'
      });
    }

    // Validation image URL
    if (this.imageUrl && !this._isValidImageUrl(this.imageUrl)) {
      errors.push({
        field: 'image_url',
        message: 'URL d\'image invalide'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transforme en données pour Sequelize
   */
  toEntity() {
    const entity = {
      titre: this.titre,
      description: this.description,
      id_type_oeuvre: this.idTypeOeuvre,
      id_createur: this.idCreateur,
      statut: 'brouillon' // Les nouvelles œuvres commencent en brouillon
    };

    // Champs optionnels
    if (this.resume) entity.resume = this.resume;
    if (this.idLangue) entity.id_langue = this.idLangue;
    if (this.anneeCreation) entity.annee_creation = this.anneeCreation;
    if (this.isbn) entity.isbn = this.isbn;
    if (this.editeur) entity.editeur = this.editeur;
    if (this.pages) entity.pages = this.pages;
    if (this.duree) entity.duree = this.duree;
    if (this.prix !== null) entity.prix = this.prix;
    if (this.devise) entity.devise = this.devise;
    if (this.imageUrl) entity.image_url = this.imageUrl;
    if (this.coverUrl) entity.cover_url = this.coverUrl;

    return entity;
  }

  /**
   * Retourne les IDs de catégories à associer
   */
  getCategoryIds() {
    return this.categories.filter(id => id > 0);
  }

  /**
   * Retourne les IDs de tags à associer
   */
  getTagIds() {
    return this.tags.filter(id => id > 0);
  }

  /**
   * Validation URL image
   * @private
   */
  _isValidImageUrl(url) {
    if (!url) return true;

    // URL locale
    if (url.startsWith('/uploads/')) {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      return allowedExtensions.some(ext => url.toLowerCase().endsWith(ext));
    }

    // URL externe (https)
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

module.exports = CreateOeuvreDTO;
