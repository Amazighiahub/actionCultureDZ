/**
 * ArticleDTO - DTO pour le sous-type Article
 * Colonnes modèle: id_genre, auteur, source, sous_titre, date_publication,
 *   date_derniere_modification, resume, contenu_complet, url_source, url_archive,
 *   statut, langue_contenu, nb_mots, temps_lecture, niveau_credibilite,
 *   fact_checked, paywall, nb_vues, nb_partages, note_qualite, commentaires_moderation
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class ArticleDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.idGenre = data.id_genre != null ? BaseDTO.toInt(data.id_genre) : undefined;
    this.auteur = BaseDTO.cleanString(data.auteur);
    this.source = BaseDTO.cleanString(data.source);
    this.sousTitre = BaseDTO.cleanString(data.sous_titre);
    this.resume = BaseDTO.cleanString(data.resume);
    this.contenuComplet = BaseDTO.cleanString(data.contenu_complet);
    this.urlSource = BaseDTO.cleanString(data.url_source);
    this.urlArchive = BaseDTO.cleanString(data.url_archive);
    this.statut = data.statut || 'brouillon';
    this.langueContenu = BaseDTO.cleanString(data.langue_contenu);
    this.nbMots = data.nb_mots != null ? BaseDTO.toInt(data.nb_mots) : undefined;
    this.tempsLecture = data.temps_lecture != null ? BaseDTO.toInt(data.temps_lecture) : undefined;
    this.niveauCredibilite = data.niveau_credibilite || undefined;
    this.factChecked = data.fact_checked != null ? BaseDTO.toBool(data.fact_checked) : undefined;
    this.paywall = data.paywall != null ? BaseDTO.toBool(data.paywall) : undefined;
  }

  validate() {
    const errors = [];

    // Validation auteur (longueur max)
    if (this.auteur && this.auteur.length > 255) {
      errors.push({
        field: 'auteur',
        message: 'Le nom de l\'auteur est trop long (max 255 caractères)'
      });
    }

    // Validation source (longueur max)
    if (this.source && this.source.length > 255) {
      errors.push({
        field: 'source',
        message: 'La source est trop longue (max 255 caractères)'
      });
    }

    // Validation sous_titre (longueur max 500)
    if (this.sousTitre && this.sousTitre.length > 500) {
      errors.push({
        field: 'sous_titre',
        message: 'Le sous-titre est trop long (max 500 caractères)'
      });
    }

    // Validation URL source
    if (this.urlSource && this.urlSource.length > 500) {
      errors.push({
        field: 'url_source',
        message: 'L\'URL source est trop longue (max 500 caractères)'
      });
    }

    // Validation URL archive
    if (this.urlArchive && this.urlArchive.length > 500) {
      errors.push({
        field: 'url_archive',
        message: 'L\'URL archive est trop longue (max 500 caractères)'
      });
    }

    // Validation statut
    if (this.statut) {
      const validStatuts = ['brouillon', 'publie', 'archive', 'supprime'];
      if (!validStatuts.includes(this.statut)) {
        errors.push({
          field: 'statut',
          message: `Statut invalide. Valeurs acceptées: ${validStatuts.join(', ')}`
        });
      }
    }

    // Validation niveau_credibilite
    if (this.niveauCredibilite) {
      const validNiveaux = ['tres_fiable', 'fiable', 'moyen', 'peu_fiable', 'non_verifie'];
      if (!validNiveaux.includes(this.niveauCredibilite)) {
        errors.push({
          field: 'niveau_credibilite',
          message: `Niveau de crédibilité invalide. Valeurs acceptées: ${validNiveaux.join(', ')}`
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      id_genre: this.idGenre || null,
      auteur: this.auteur || null,
      source: this.source || null,
      sous_titre: this.sousTitre || null,
      resume: this.resume || null,
      contenu_complet: this.contenuComplet || null,
      url_source: this.urlSource || null,
      url_archive: this.urlArchive || null,
      statut: this.statut || 'brouillon',
      langue_contenu: this.langueContenu || null,
      nb_mots: this.nbMots != null ? this.nbMots : null,
      temps_lecture: this.tempsLecture != null ? this.tempsLecture : null,
      niveau_credibilite: this.niveauCredibilite || 'non_verifie',
      fact_checked: this.factChecked != null ? this.factChecked : false,
      paywall: this.paywall != null ? this.paywall : false
    };
  }
}

module.exports = ArticleDTO;
