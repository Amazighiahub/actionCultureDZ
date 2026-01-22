/**
 * UpdateOeuvreDTO - DTO pour la mise à jour d'une œuvre
 * Gère les mises à jour partielles
 */
const BaseDTO = require('../BaseDTO');

class UpdateOeuvreDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Marquer quels champs sont présents
    this._fields = new Set();

    // Champs multilingues (merge avec existant)
    if (data.titre !== undefined) {
      this.titre = BaseDTO.normalizeMultilang(data.titre);
      this._fields.add('titre');
    }

    if (data.description !== undefined) {
      this.description = BaseDTO.normalizeMultilang(data.description);
      this._fields.add('description');
    }

    if (data.resume !== undefined) {
      this.resume = BaseDTO.normalizeMultilang(data.resume);
      this._fields.add('resume');
    }

    // Type
    if (data.id_type_oeuvre !== undefined || data.idTypeOeuvre !== undefined) {
      this.idTypeOeuvre = BaseDTO.toInt(data.id_type_oeuvre || data.idTypeOeuvre);
      this._fields.add('id_type_oeuvre');
    }

    // Langue
    if (data.id_langue !== undefined || data.idLangue !== undefined) {
      this.idLangue = BaseDTO.toInt(data.id_langue || data.idLangue);
      this._fields.add('id_langue');
    }

    // Détails
    if (data.annee_creation !== undefined || data.anneeCreation !== undefined) {
      this.anneeCreation = BaseDTO.toInt(data.annee_creation || data.anneeCreation);
      this._fields.add('annee_creation');
    }

    if (data.isbn !== undefined) {
      this.isbn = BaseDTO.cleanString(data.isbn);
      this._fields.add('isbn');
    }

    if (data.editeur !== undefined) {
      this.editeur = BaseDTO.cleanString(data.editeur);
      this._fields.add('editeur');
    }

    if (data.pages !== undefined) {
      this.pages = data.pages ? BaseDTO.toInt(data.pages) : null;
      this._fields.add('pages');
    }

    if (data.duree !== undefined) {
      this.duree = data.duree ? BaseDTO.toInt(data.duree) : null;
      this._fields.add('duree');
    }

    if (data.prix !== undefined) {
      this.prix = data.prix !== null ? BaseDTO.toFloat(data.prix) : null;
      this._fields.add('prix');
    }

    if (data.devise !== undefined) {
      this.devise = data.devise;
      this._fields.add('devise');
    }

    // Médias
    if (data.image_url !== undefined || data.imageUrl !== undefined) {
      this.imageUrl = BaseDTO.cleanString(data.image_url || data.imageUrl);
      this._fields.add('image_url');
    }

    if (data.cover_url !== undefined || data.coverUrl !== undefined) {
      this.coverUrl = BaseDTO.cleanString(data.cover_url || data.coverUrl);
      this._fields.add('cover_url');
    }

    // Statut (admin seulement)
    if (data.statut !== undefined) {
      this.statut = data.statut;
      this._fields.add('statut');
    }

    if (data.est_mis_en_avant !== undefined || data.estMisEnAvant !== undefined) {
      this.estMisEnAvant = BaseDTO.toBool(data.est_mis_en_avant ?? data.estMisEnAvant);
      this._fields.add('est_mis_en_avant');
    }

    // Relations
    if (data.categories !== undefined) {
      this.categories = BaseDTO.toArray(data.categories);
      this._fields.add('categories');
    }

    if (data.tags !== undefined) {
      this.tags = BaseDTO.toArray(data.tags);
      this._fields.add('tags');
    }
  }

  /**
   * Crée un DTO depuis le corps de la requête
   */
  static fromRequest(body) {
    return new UpdateOeuvreDTO(body);
  }

  /**
   * Vérifie si des modifications sont présentes
   */
  hasChanges() {
    return this._fields.size > 0;
  }

  /**
   * Vérifie si un champ est présent dans la mise à jour
   */
  hasField(fieldName) {
    return this._fields.has(fieldName);
  }

  /**
   * Valide les données
   */
  validate() {
    const errors = [];

    // Validation titre si fourni
    if (this.hasField('titre')) {
      const titreFr = BaseDTO.extractMultilang(this.titre, 'fr');
      const titreAr = BaseDTO.extractMultilang(this.titre, 'ar');
      if (!titreFr && !titreAr) {
        errors.push({
          field: 'titre',
          message: 'Le titre ne peut pas être vide'
        });
      }
    }

    // Validation type si fourni
    if (this.hasField('id_type_oeuvre') && (!this.idTypeOeuvre || this.idTypeOeuvre <= 0)) {
      errors.push({
        field: 'id_type_oeuvre',
        message: 'Type d\'œuvre invalide'
      });
    }

    // Validation année si fournie
    if (this.hasField('annee_creation') && this.anneeCreation) {
      const currentYear = new Date().getFullYear();
      if (this.anneeCreation < 1800 || this.anneeCreation > currentYear + 1) {
        errors.push({
          field: 'annee_creation',
          message: `L'année doit être entre 1800 et ${currentYear + 1}`
        });
      }
    }

    // Validation ISBN si fourni
    if (this.hasField('isbn') && this.isbn) {
      const isbnClean = this.isbn.replace(/[-\s]/g, '');
      if (!/^(\d{10}|\d{13})$/.test(isbnClean)) {
        errors.push({
          field: 'isbn',
          message: 'ISBN invalide'
        });
      }
    }

    // Validation prix si fourni
    if (this.hasField('prix') && this.prix !== null && this.prix < 0) {
      errors.push({
        field: 'prix',
        message: 'Le prix ne peut pas être négatif'
      });
    }

    // Validation statut si fourni
    if (this.hasField('statut')) {
      const validStatuts = ['brouillon', 'en_attente', 'publie', 'refuse', 'archive'];
      if (!validStatuts.includes(this.statut)) {
        errors.push({
          field: 'statut',
          message: `Statut invalide. Valeurs acceptées: ${validStatuts.join(', ')}`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transforme en données pour Sequelize (uniquement les champs modifiés)
   */
  toEntity() {
    const entity = {};

    if (this.hasField('titre')) entity.titre = this.titre;
    if (this.hasField('description')) entity.description = this.description;
    if (this.hasField('resume')) entity.resume = this.resume;
    if (this.hasField('id_type_oeuvre')) entity.id_type_oeuvre = this.idTypeOeuvre;
    if (this.hasField('id_langue')) entity.id_langue = this.idLangue;
    if (this.hasField('annee_creation')) entity.annee_creation = this.anneeCreation;
    if (this.hasField('isbn')) entity.isbn = this.isbn;
    if (this.hasField('editeur')) entity.editeur = this.editeur;
    if (this.hasField('pages')) entity.pages = this.pages;
    if (this.hasField('duree')) entity.duree = this.duree;
    if (this.hasField('prix')) entity.prix = this.prix;
    if (this.hasField('devise')) entity.devise = this.devise;
    if (this.hasField('image_url')) entity.image_url = this.imageUrl;
    if (this.hasField('cover_url')) entity.cover_url = this.coverUrl;
    if (this.hasField('statut')) entity.statut = this.statut;
    if (this.hasField('est_mis_en_avant')) entity.est_mis_en_avant = this.estMisEnAvant;

    // Ajouter la date de modification
    entity.date_modification = new Date();

    return entity;
  }

  /**
   * Fusionne avec les données existantes de l'œuvre
   * Utile pour les champs multilingues
   */
  mergeWithExisting(existingOeuvre) {
    if (this.hasField('titre') && existingOeuvre.titre) {
      this.titre = BaseDTO.mergeMultilang(existingOeuvre.titre, this.titre);
    }
    if (this.hasField('description') && existingOeuvre.description) {
      this.description = BaseDTO.mergeMultilang(existingOeuvre.description, this.description);
    }
    if (this.hasField('resume') && existingOeuvre.resume) {
      this.resume = BaseDTO.mergeMultilang(existingOeuvre.resume, this.resume);
    }
    return this;
  }

  /**
   * Retourne les IDs de catégories à associer
   */
  getCategoryIds() {
    if (!this.hasField('categories')) return null;
    return this.categories.filter(id => id > 0);
  }

  /**
   * Retourne les IDs de tags à associer
   */
  getTagIds() {
    if (!this.hasField('tags')) return null;
    return this.tags.filter(id => id > 0);
  }
}

module.exports = UpdateOeuvreDTO;
