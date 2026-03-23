/**
 * ArticleScientifiqueDTO - DTO pour le sous-type ArticleScientifique
 * Colonnes modèle: id_genre, journal, doi, pages, volume, numero, issn,
 *   impact_factor, peer_reviewed, open_access, date_soumission, date_acceptation,
 *   date_publication, resume, citation_apa, url_hal, url_arxiv
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

class ArticleScientifiqueDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.idGenre = data.id_genre != null ? BaseDTO.toInt(data.id_genre) : undefined;
    this.journal = BaseDTO.cleanString(data.journal);
    this.doi = BaseDTO.cleanString(data.doi);
    this.pages = BaseDTO.cleanString(data.pages);
    this.volume = BaseDTO.cleanString(data.volume);
    this.numero = BaseDTO.cleanString(data.numero);
    this.issn = BaseDTO.cleanString(data.issn);
    this.impactFactor = data.impact_factor != null ? BaseDTO.toFloat(data.impact_factor) : undefined;
    this.peerReviewed = data.peer_reviewed != null ? BaseDTO.toBool(data.peer_reviewed) : true;
    this.openAccess = data.open_access != null ? BaseDTO.toBool(data.open_access) : false;
    this.dateSoumission = data.date_soumission ? BaseDTO.toDate(data.date_soumission) : undefined;
    this.dateAcceptation = data.date_acceptation ? BaseDTO.toDate(data.date_acceptation) : undefined;
    this.datePublication = data.date_publication ? BaseDTO.toDate(data.date_publication) : undefined;
    this.resume = BaseDTO.cleanString(data.resume);
    this.citationApa = BaseDTO.cleanString(data.citation_apa);
    this.urlHal = BaseDTO.cleanString(data.url_hal);
    this.urlArxiv = BaseDTO.cleanString(data.url_arxiv);
  }

  validate() {
    const errors = [];

    // Validation DOI (format standard)
    if (this.doi) {
      if (!/^10\.\d{4,}\/\S+$/.test(this.doi)) {
        errors.push({
          field: 'doi',
          message: 'Format DOI invalide (ex: 10.1234/abc.123)'
        });
      }
      if (this.doi.length > 255) {
        errors.push({
          field: 'doi',
          message: 'Le DOI est trop long (max 255 caractères)'
        });
      }
    }

    // Validation ISSN (format 8 chiffres avec tiret optionnel)
    if (this.issn) {
      const issnClean = this.issn.replace(/[-\s]/g, '');
      if (!/^\d{7}[\dXx]$/.test(issnClean)) {
        errors.push({
          field: 'issn',
          message: 'ISSN invalide (doit être 8 caractères, ex: 1234-5678)'
        });
      }
    }

    // Validation impact_factor
    if (this.impactFactor !== undefined && this.impactFactor !== null) {
      if (this.impactFactor < 0) {
        errors.push({
          field: 'impact_factor',
          message: 'Le facteur d\'impact ne peut pas être négatif'
        });
      }
      if (this.impactFactor > 500) {
        errors.push({
          field: 'impact_factor',
          message: 'Le facteur d\'impact semble excessif (max 500)'
        });
      }
    }

    // Validation journal (longueur max)
    if (this.journal && this.journal.length > 255) {
      errors.push({
        field: 'journal',
        message: 'Le nom du journal est trop long (max 255 caractères)'
      });
    }

    // Validation URLs
    if (this.urlHal && this.urlHal.length > 255) {
      errors.push({ field: 'url_hal', message: 'URL HAL trop longue (max 255)' });
    }
    if (this.urlArxiv && this.urlArxiv.length > 255) {
      errors.push({ field: 'url_arxiv', message: 'URL arXiv trop longue (max 255)' });
    }

    // Validation cohérence dates
    if (this.dateSoumission && this.dateAcceptation) {
      if (this.dateAcceptation < this.dateSoumission) {
        errors.push({
          field: 'date_acceptation',
          message: 'La date d\'acceptation ne peut pas être antérieure à la soumission'
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      id_genre: this.idGenre || null,
      journal: this.journal || null,
      doi: this.doi || null,
      pages: this.pages || null,
      volume: this.volume || null,
      numero: this.numero || null,
      issn: this.issn || null,
      impact_factor: this.impactFactor != null ? this.impactFactor : null,
      peer_reviewed: this.peerReviewed !== false,
      open_access: this.openAccess === true,
      date_soumission: this.dateSoumission || null,
      date_acceptation: this.dateAcceptation || null,
      date_publication: this.datePublication || null,
      resume: this.resume || null,
      citation_apa: this.citationApa || null,
      url_hal: this.urlHal || null,
      url_arxiv: this.urlArxiv || null
    };
  }
}

module.exports = ArticleScientifiqueDTO;
