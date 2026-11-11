/**
 * AlbumMusicalDTO - DTO pour le sous-type AlbumMusical (type « Musique »)
 * Colonnes modèle: duree, id_genre (NOT NULL), label (NOT NULL), format, nb_pistes,
 * pistes (JSON), liens_ecoute (JSON), instruments (JSON)
 */
const BaseSubtypeDTO = require('./baseSubtypeDTO');
const BaseDTO = require('../../baseDTO');

const FORMATS = ['album', 'ep', 'single', 'live', 'compilation'];
const MAX_PISTES = 100;
const MAX_LIENS = 10;
const MAX_INSTRUMENTS = 20;

/** Lien d'écoute affiché sur la page publique : https seulement (pas de « javascript: » ni de http). */
function estLienHttps(url) {
  if (typeof url !== 'string' || url.length > 500) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

const texte = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

class AlbumMusicalDTO extends BaseSubtypeDTO {
  constructor(data = {}) {
    super(data);
    this.duree = data.duree != null ? this._parseDuree(data.duree) : undefined;
    this.idGenre = data.id_genre != null ? BaseDTO.toInt(data.id_genre) : undefined;
    this.label = BaseDTO.cleanString(data.label) || 'Indépendant';
    this.format = data.format != null && data.format !== '' ? String(data.format) : undefined;
    this.nbPistes = data.nb_pistes != null && data.nb_pistes !== '' ? BaseDTO.toInt(data.nb_pistes) : undefined;
    this.pistes = data.pistes !== undefined ? data.pistes : undefined;
    this.liensEcoute = data.liens_ecoute !== undefined ? data.liens_ecoute : undefined;
    this.instruments = data.instruments !== undefined ? data.instruments : undefined;
  }

  /**
   * Parse "45:30" (mm:ss) ou "45" en minutes
   * @private
   */
  _parseDuree(duree) {
    if (duree == null || duree === '') return null;
    const num = parseInt(duree, 10);
    if (!isNaN(num)) return num;
    const parts = String(duree).split(':');
    if (parts.length >= 2) {
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return m + Math.round(s / 60);
    }
    return null;
  }

  /** Titres de l'album nettoyés ; les lignes sans titre sont ignorées. */
  static nettoyerPistes(pistes) {
    if (!Array.isArray(pistes)) return null;
    const propres = pistes
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({ titre: texte(p.titre, 200), duree: texte(p.duree, 10), compositeur: texte(p.compositeur, 200) }))
      .filter((p) => p.titre);
    return propres.length ? propres : null;
  }

  static nettoyerLiens(liens) {
    if (!Array.isArray(liens)) return null;
    const urls = liens
      .map((l) => texte(typeof l === 'string' ? l : l?.url, 500))
      .filter(Boolean);
    const uniques = [...new Set(urls)];
    return uniques.length ? uniques.map((url) => ({ url })) : null;
  }

  static nettoyerInstruments(instruments) {
    if (!Array.isArray(instruments)) return null;
    const noms = instruments.map((i) => texte(i, 50)).filter(Boolean);
    const uniques = [...new Set(noms)];
    return uniques.length ? uniques : null;
  }

  validate() {
    const errors = [];

    // Validation durée
    if (this.duree !== undefined && this.duree !== null) {
      if (this.duree <= 0) {
        errors.push({
          field: 'duree',
          message: 'La durée doit être positive'
        });
      }
      if (this.duree > 1440) {
        errors.push({
          field: 'duree',
          message: 'La durée semble excessive (max 1440 min)'
        });
      }
    }

    // Validation label (longueur max du modèle: 100)
    if (this.label && this.label.length > 100) {
      errors.push({
        field: 'label',
        message: 'Le label est trop long (max 100 caractères)'
      });
    }

    if (this.format !== undefined && !FORMATS.includes(this.format)) {
      errors.push({ field: 'format', message: 'Format inconnu' });
    }

    if (this.nbPistes !== undefined && this.nbPistes !== null && (!Number.isInteger(this.nbPistes) || this.nbPistes < 1 || this.nbPistes > 500)) {
      errors.push({ field: 'nb_pistes', message: 'Le nombre de pistes doit être compris entre 1 et 500' });
    }

    if (this.pistes != null) {
      if (!Array.isArray(this.pistes)) {
        errors.push({ field: 'pistes', message: 'La liste des titres doit être une liste' });
      } else if (this.pistes.length > MAX_PISTES) {
        errors.push({ field: 'pistes', message: `${MAX_PISTES} titres au plus` });
      }
    }

    if (this.liensEcoute != null) {
      if (!Array.isArray(this.liensEcoute)) {
        errors.push({ field: 'liens_ecoute', message: "Les liens d'écoute doivent être une liste" });
      } else {
        const liens = AlbumMusicalDTO.nettoyerLiens(this.liensEcoute) || [];
        if (liens.length > MAX_LIENS) {
          errors.push({ field: 'liens_ecoute', message: `${MAX_LIENS} liens au plus` });
        }
        if (liens.some(({ url }) => !estLienHttps(url))) {
          errors.push({ field: 'liens_ecoute', message: "Chaque lien d'écoute doit commencer par https://" });
        }
      }
    }

    if (this.instruments != null) {
      if (!Array.isArray(this.instruments)) {
        errors.push({ field: 'instruments', message: 'Les instruments doivent être une liste' });
      } else if (this.instruments.length > MAX_INSTRUMENTS) {
        errors.push({ field: 'instruments', message: `${MAX_INSTRUMENTS} instruments au plus` });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  toEntity() {
    return {
      duree: this.duree != null ? this.duree : null,
      id_genre: this.idGenre ?? 1,
      label: this.label || 'Indépendant',
      format: this.format ?? null,
      nb_pistes: this.nbPistes ?? null,
      pistes: AlbumMusicalDTO.nettoyerPistes(this.pistes),
      liens_ecoute: AlbumMusicalDTO.nettoyerLiens(this.liensEcoute),
      instruments: AlbumMusicalDTO.nettoyerInstruments(this.instruments)
    };
  }
}

AlbumMusicalDTO.FORMATS = FORMATS;

module.exports = AlbumMusicalDTO;
