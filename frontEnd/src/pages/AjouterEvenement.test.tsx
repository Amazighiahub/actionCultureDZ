/**
 * Tests pour AjouterEvenement - Formulaire de création d'événements
 * Couvre la validation des champs pour événements en présentiel et virtuels
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// INTERFACES
// ============================================================================

interface EvenementFormData {
  nom: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
  typeEvenement: string;
  dateDebut: string;
  dateFin: string;
  heureDebut: string;
  heureFin: string;
  maxParticipants: string;
  tarif: string;
  urlVirtuel: string;
}

// ============================================================================
// FONCTIONS DE VALIDATION
// ============================================================================

// Validation du nom de l'événement (multilingue)
const validateNomEvenement = (nom: { fr: string; ar: string; en?: string }): { valid: boolean; error?: string } => {
  if (!nom.fr.trim() && !nom.ar.trim()) {
    return { valid: false, error: 'Le nom de l\'événement est requis (FR ou AR)' };
  }
  if (nom.fr && nom.fr.length > 200) {
    return { valid: false, error: 'Le nom ne doit pas dépasser 200 caractères' };
  }
  return { valid: true };
};

// Validation du type d'événement
const validateTypeEvenement = (type: string): { valid: boolean; error?: string } => {
  const typesValides = [
    'exposition', 'concert', 'projection', 'conference', 'atelier',
    'festival', 'spectacle', 'rencontre_litteraire', 'webinaire', 'streaming'
  ];
  
  if (!type) {
    return { valid: false, error: 'Le type d\'événement est requis' };
  }
  
  if (!typesValides.includes(type)) {
    return { valid: false, error: 'Type d\'événement invalide' };
  }
  
  return { valid: true };
};

// Validation de la date de début
const validateDateDebut = (date: string): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: 'La date de début est requise' };
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: 'Format de date invalide (YYYY-MM-DD attendu)' };
  }
  
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dateObj < today) {
    return { valid: false, error: 'La date de début ne peut pas être dans le passé' };
  }
  
  return { valid: true };
};

// Validation de la date de fin
const validateDateFin = (dateFin: string, dateDebut: string): { valid: boolean; error?: string } => {
  if (!dateFin) {
    return { valid: true }; // Optionnel
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateFin)) {
    return { valid: false, error: 'Format de date invalide' };
  }
  
  if (dateDebut && dateFin < dateDebut) {
    return { valid: false, error: 'La date de fin doit être après la date de début' };
  }
  
  return { valid: true };
};

// Validation des horaires
const validateHoraires = (heureDebut: string, heureFin: string): { valid: boolean; error?: string } => {
  if (!heureDebut && !heureFin) {
    return { valid: true }; // Les deux sont optionnels
  }
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (heureDebut && !timeRegex.test(heureDebut)) {
    return { valid: false, error: 'Format d\'heure de début invalide' };
  }
  
  if (heureFin && !timeRegex.test(heureFin)) {
    return { valid: false, error: 'Format d\'heure de fin invalide' };
  }
  
  if (heureDebut && heureFin && heureDebut >= heureFin) {
    return { valid: false, error: 'L\'heure de fin doit être après l\'heure de début' };
  }
  
  return { valid: true };
};

// Validation du nombre de participants
const validateMaxParticipants = (max: string): { valid: boolean; error?: string } => {
  if (!max) {
    return { valid: true }; // Optionnel
  }
  
  const num = parseInt(max);
  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Le nombre de participants doit être positif' };
  }
  
  if (num > 100000) {
    return { valid: false, error: 'Le nombre de participants ne peut pas dépasser 100000' };
  }
  
  return { valid: true };
};

// Validation du tarif
const validateTarif = (tarif: string, gratuit: boolean): { valid: boolean; error?: string } => {
  if (gratuit) {
    return { valid: true }; // Pas de tarif si gratuit
  }
  
  if (!tarif) {
    return { valid: true }; // Optionnel si non gratuit
  }
  
  const num = parseFloat(tarif);
  if (isNaN(num) || num < 0) {
    return { valid: false, error: 'Le tarif doit être un nombre positif' };
  }
  
  if (num > 1000000) {
    return { valid: false, error: 'Le tarif semble trop élevé' };
  }
  
  return { valid: true };
};

// Validation de l'URL virtuel
const validateUrlVirtuel = (url: string, isVirtual: boolean): { valid: boolean; error?: string } => {
  if (!isVirtual) {
    return { valid: true }; // Pas requis pour présentiel
  }
  
  if (!url) {
    return { valid: false, error: 'Le lien de l\'événement virtuel est requis' };
  }
  
  const urlRegex = /^https?:\/\/.+/i;
  if (!urlRegex.test(url)) {
    return { valid: false, error: 'L\'URL doit commencer par http:// ou https://' };
  }
  
  return { valid: true };
};

// Validation du lieu (pour présentiel)
const validateLieu = (lieuId: number | undefined, isVirtual: boolean): { valid: boolean; error?: string } => {
  if (isVirtual) {
    return { valid: true }; // Pas requis pour virtuel
  }
  
  if (!lieuId) {
    return { valid: false, error: 'Le lieu est requis pour un événement en présentiel' };
  }
  
  return { valid: true };
};

// Validation de l'organisation (pour présentiel)
const validateOrganisation = (orgId: number | undefined, isVirtual: boolean): { valid: boolean; error?: string } => {
  if (isVirtual) {
    return { valid: true }; // Pas requis pour virtuel
  }
  
  if (!orgId) {
    return { valid: false, error: 'Une organisation est requise pour un événement en présentiel' };
  }
  
  return { valid: true };
};

// Validation de l'affiche
const validateAffiche = (affiche: File | null): { valid: boolean; error?: string } => {
  if (!affiche) {
    return { valid: false, error: 'L\'image de l\'événement est requise' };
  }
  
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(affiche.type)) {
    return { valid: false, error: 'Format d\'image non supporté (JPG, PNG, GIF, WebP)' };
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (affiche.size > maxSize) {
    return { valid: false, error: 'L\'image ne doit pas dépasser 5MB' };
  }
  
  return { valid: true };
};

// Validation complète du formulaire événement
const validateEvenementForm = (
  data: EvenementFormData,
  isVirtual: boolean,
  gratuit: boolean,
  lieuId?: number,
  organisationId?: number,
  affiche?: File | null
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Nom
  const nomResult = validateNomEvenement(data.nom);
  if (!nomResult.valid) errors.nom = nomResult.error!;
  
  // Type
  const typeResult = validateTypeEvenement(data.typeEvenement);
  if (!typeResult.valid) errors.typeEvenement = typeResult.error!;
  
  // Date début
  const dateDebutResult = validateDateDebut(data.dateDebut);
  if (!dateDebutResult.valid) errors.dateDebut = dateDebutResult.error!;
  
  // Date fin
  const dateFinResult = validateDateFin(data.dateFin, data.dateDebut);
  if (!dateFinResult.valid) errors.dateFin = dateFinResult.error!;
  
  // Horaires
  const horairesResult = validateHoraires(data.heureDebut, data.heureFin);
  if (!horairesResult.valid) errors.horaires = horairesResult.error!;
  
  // Max participants
  const maxResult = validateMaxParticipants(data.maxParticipants);
  if (!maxResult.valid) errors.maxParticipants = maxResult.error!;
  
  // Tarif
  const tarifResult = validateTarif(data.tarif, gratuit);
  if (!tarifResult.valid) errors.tarif = tarifResult.error!;
  
  // URL virtuel
  const urlResult = validateUrlVirtuel(data.urlVirtuel, isVirtual);
  if (!urlResult.valid) errors.urlVirtuel = urlResult.error!;
  
  // Lieu
  const lieuResult = validateLieu(lieuId, isVirtual);
  if (!lieuResult.valid) errors.lieu = lieuResult.error!;
  
  // Organisation
  const orgResult = validateOrganisation(organisationId, isVirtual);
  if (!orgResult.valid) errors.organisation = orgResult.error!;
  
  // Affiche
  if (affiche !== undefined) {
    const afficheResult = validateAffiche(affiche);
    if (!afficheResult.valid) errors.affiche = afficheResult.error!;
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
};

// ============================================================================
// TESTS
// ============================================================================

describe('AjouterEvenement - Validation', () => {
  
  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du nom
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateNomEvenement', () => {
    it('devrait valider un nom en français', () => {
      const result = validateNomEvenement({ fr: 'Festival de musique', ar: '' });
      expect(result.valid).toBe(true);
    });

    it('devrait valider un nom en arabe', () => {
      const result = validateNomEvenement({ fr: '', ar: 'مهرجان الموسيقى' });
      expect(result.valid).toBe(true);
    });

    it('devrait valider un nom dans les deux langues', () => {
      const result = validateNomEvenement({ fr: 'Festival', ar: 'مهرجان' });
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un nom vide dans toutes les langues', () => {
      const result = validateNomEvenement({ fr: '', ar: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requis');
    });

    it('devrait rejeter un nom avec uniquement des espaces', () => {
      const result = validateNomEvenement({ fr: '   ', ar: '   ' });
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un nom trop long', () => {
      const result = validateNomEvenement({ fr: 'A'.repeat(201), ar: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('200 caractères');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du type d'événement
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateTypeEvenement', () => {
    it('devrait valider "exposition"', () => {
      expect(validateTypeEvenement('exposition').valid).toBe(true);
    });

    it('devrait valider "concert"', () => {
      expect(validateTypeEvenement('concert').valid).toBe(true);
    });

    it('devrait valider "projection"', () => {
      expect(validateTypeEvenement('projection').valid).toBe(true);
    });

    it('devrait valider "conference"', () => {
      expect(validateTypeEvenement('conference').valid).toBe(true);
    });

    it('devrait valider "atelier"', () => {
      expect(validateTypeEvenement('atelier').valid).toBe(true);
    });

    it('devrait valider "festival"', () => {
      expect(validateTypeEvenement('festival').valid).toBe(true);
    });

    it('devrait valider "spectacle"', () => {
      expect(validateTypeEvenement('spectacle').valid).toBe(true);
    });

    it('devrait valider "webinaire"', () => {
      expect(validateTypeEvenement('webinaire').valid).toBe(true);
    });

    it('devrait valider "streaming"', () => {
      expect(validateTypeEvenement('streaming').valid).toBe(true);
    });

    it('devrait rejeter un type vide', () => {
      const result = validateTypeEvenement('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requis');
    });

    it('devrait rejeter un type invalide', () => {
      const result = validateTypeEvenement('invalid_type');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalide');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de la date de début
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateDateDebut', () => {
    it('devrait valider une date future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateStr = futureDate.toISOString().split('T')[0];
      const result = validateDateDebut(dateStr);
      expect(result.valid).toBe(true);
    });

    it('devrait valider la date d\'aujourd\'hui', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = validateDateDebut(today);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une date vide', () => {
      const result = validateDateDebut('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requise');
    });

    it('devrait rejeter un format de date invalide', () => {
      const result = validateDateDebut('15/06/2025');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Format');
    });

    it('devrait rejeter une date dans le passé', () => {
      const result = validateDateDebut('2020-01-01');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('passé');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de la date de fin
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateDateFin', () => {
    it('devrait valider une date de fin après la date de début', () => {
      const result = validateDateFin('2025-06-20', '2025-06-15');
      expect(result.valid).toBe(true);
    });

    it('devrait valider une date de fin vide (optionnel)', () => {
      const result = validateDateFin('', '2025-06-15');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une date de fin avant la date de début', () => {
      const result = validateDateFin('2025-06-10', '2025-06-15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('après');
    });

    it('devrait rejeter un format invalide', () => {
      const result = validateDateFin('20/06/2025', '2025-06-15');
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation des horaires
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateHoraires', () => {
    it('devrait valider des horaires corrects', () => {
      const result = validateHoraires('09:00', '18:00');
      expect(result.valid).toBe(true);
    });

    it('devrait valider des horaires vides (optionnels)', () => {
      const result = validateHoraires('', '');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter si heure fin avant heure début', () => {
      const result = validateHoraires('18:00', '09:00');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('après');
    });

    it('devrait rejeter un format d\'heure invalide', () => {
      const result = validateHoraires('9h00', '18:00');
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du nombre de participants
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateMaxParticipants', () => {
    it('devrait valider un nombre positif', () => {
      const result = validateMaxParticipants('100');
      expect(result.valid).toBe(true);
    });

    it('devrait valider une valeur vide (optionnel)', () => {
      const result = validateMaxParticipants('');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un nombre négatif', () => {
      const result = validateMaxParticipants('-10');
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un nombre trop grand', () => {
      const result = validateMaxParticipants('200000');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100000');
    });

    it('devrait rejeter une valeur non numérique', () => {
      const result = validateMaxParticipants('abc');
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du tarif
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateTarif', () => {
    it('devrait valider un tarif positif', () => {
      const result = validateTarif('500', false);
      expect(result.valid).toBe(true);
    });

    it('devrait valider un tarif vide si gratuit', () => {
      const result = validateTarif('', true);
      expect(result.valid).toBe(true);
    });

    it('devrait valider un tarif vide même si non gratuit (optionnel)', () => {
      const result = validateTarif('', false);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un tarif négatif', () => {
      const result = validateTarif('-100', false);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un tarif trop élevé', () => {
      const result = validateTarif('2000000', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('élevé');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de l'URL virtuel
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateUrlVirtuel', () => {
    it('devrait valider une URL HTTPS', () => {
      const result = validateUrlVirtuel('https://zoom.us/j/123456', true);
      expect(result.valid).toBe(true);
    });

    it('devrait valider une URL HTTP', () => {
      const result = validateUrlVirtuel('http://meet.google.com/abc', true);
      expect(result.valid).toBe(true);
    });

    it('devrait valider une URL vide si non virtuel', () => {
      const result = validateUrlVirtuel('', false);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une URL vide si virtuel', () => {
      const result = validateUrlVirtuel('', true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requis');
    });

    it('devrait rejeter une URL sans protocole', () => {
      const result = validateUrlVirtuel('zoom.us/j/123456', true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('http');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du lieu
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateLieu', () => {
    it('devrait valider un lieu pour présentiel', () => {
      const result = validateLieu(1, false);
      expect(result.valid).toBe(true);
    });

    it('devrait valider l\'absence de lieu pour virtuel', () => {
      const result = validateLieu(undefined, true);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter l\'absence de lieu pour présentiel', () => {
      const result = validateLieu(undefined, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requis');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de l'organisation
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateOrganisation', () => {
    it('devrait valider une organisation pour présentiel', () => {
      const result = validateOrganisation(1, false);
      expect(result.valid).toBe(true);
    });

    it('devrait valider l\'absence d\'organisation pour virtuel', () => {
      const result = validateOrganisation(undefined, true);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter l\'absence d\'organisation pour présentiel', () => {
      const result = validateOrganisation(undefined, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requise');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de l'affiche
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateAffiche', () => {
    it('devrait valider une image JPEG', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = validateAffiche(file);
      expect(result.valid).toBe(true);
    });

    it('devrait valider une image PNG', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const result = validateAffiche(file);
      expect(result.valid).toBe(true);
    });

    it('devrait valider une image WebP', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' });
      const result = validateAffiche(file);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter l\'absence d\'affiche', () => {
      const result = validateAffiche(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requise');
    });

    it('devrait rejeter un format non supporté', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      const result = validateAffiche(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Format');
    });

    it('devrait rejeter une image trop grande', () => {
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = validateAffiche(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation complète du formulaire
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateEvenementForm', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const validFormData: EvenementFormData = {
      nom: { fr: 'Festival de musique', ar: 'مهرجان الموسيقى', en: 'Music Festival' },
      description: { fr: 'Description', ar: 'وصف', en: 'Description' },
      typeEvenement: 'festival',
      dateDebut: futureDateStr,
      dateFin: '',
      heureDebut: '09:00',
      heureFin: '18:00',
      maxParticipants: '500',
      tarif: '1000',
      urlVirtuel: ''
    };

    it('devrait valider un événement présentiel complet', () => {
      const result = validateEvenementForm(validFormData, false, false, 1, 1);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('devrait valider un événement virtuel complet', () => {
      const virtualData = { ...validFormData, urlVirtuel: 'https://zoom.us/j/123' };
      const result = validateEvenementForm(virtualData, true, false);
      expect(result.valid).toBe(true);
    });

    it('devrait valider un événement gratuit', () => {
      const gratuitData = { ...validFormData, tarif: '' };
      const result = validateEvenementForm(gratuitData, false, true, 1, 1);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un événement présentiel sans lieu', () => {
      const result = validateEvenementForm(validFormData, false, false, undefined, 1);
      expect(result.valid).toBe(false);
      expect(result.errors.lieu).toBeDefined();
    });

    it('devrait rejeter un événement présentiel sans organisation', () => {
      const result = validateEvenementForm(validFormData, false, false, 1, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.organisation).toBeDefined();
    });

    it('devrait rejeter un événement virtuel sans URL', () => {
      const result = validateEvenementForm(validFormData, true, false);
      expect(result.valid).toBe(false);
      expect(result.errors.urlVirtuel).toBeDefined();
    });

    it('devrait rejeter un événement sans nom', () => {
      const noNameData = { ...validFormData, nom: { fr: '', ar: '', en: '' } };
      const result = validateEvenementForm(noNameData, false, false, 1, 1);
      expect(result.valid).toBe(false);
      expect(result.errors.nom).toBeDefined();
    });

    it('devrait rejeter un événement sans type', () => {
      const noTypeData = { ...validFormData, typeEvenement: '' };
      const result = validateEvenementForm(noTypeData, false, false, 1, 1);
      expect(result.valid).toBe(false);
      expect(result.errors.typeEvenement).toBeDefined();
    });

    it('devrait rejeter un événement sans date de début', () => {
      const noDateData = { ...validFormData, dateDebut: '' };
      const result = validateEvenementForm(noDateData, false, false, 1, 1);
      expect(result.valid).toBe(false);
      expect(result.errors.dateDebut).toBeDefined();
    });
  });
});

// ============================================================================
// TESTS DES TYPES D'ÉVÉNEMENTS
// ============================================================================

describe('AjouterEvenement - Types d\'événements', () => {
  
  describe('Événements en présentiel', () => {
    it('devrait nécessiter un lieu', () => {
      const result = validateLieu(undefined, false);
      expect(result.valid).toBe(false);
    });

    it('devrait nécessiter une organisation', () => {
      const result = validateOrganisation(undefined, false);
      expect(result.valid).toBe(false);
    });

    it('devrait accepter sans URL virtuel', () => {
      const result = validateUrlVirtuel('', false);
      expect(result.valid).toBe(true);
    });
  });

  describe('Événements virtuels', () => {
    it('devrait nécessiter une URL', () => {
      const result = validateUrlVirtuel('', true);
      expect(result.valid).toBe(false);
    });

    it('devrait accepter sans lieu', () => {
      const result = validateLieu(undefined, true);
      expect(result.valid).toBe(true);
    });

    it('devrait accepter sans organisation', () => {
      const result = validateOrganisation(undefined, true);
      expect(result.valid).toBe(true);
    });

    it('devrait valider les URLs Zoom', () => {
      const result = validateUrlVirtuel('https://zoom.us/j/1234567890', true);
      expect(result.valid).toBe(true);
    });

    it('devrait valider les URLs Google Meet', () => {
      const result = validateUrlVirtuel('https://meet.google.com/abc-defg-hij', true);
      expect(result.valid).toBe(true);
    });

    it('devrait valider les URLs YouTube Live', () => {
      const result = validateUrlVirtuel('https://www.youtube.com/watch?v=abc123', true);
      expect(result.valid).toBe(true);
    });
  });
});
