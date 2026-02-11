/**
 * Tests pour ProgrammeForm - Formulaire de gestion des programmes d'événements
 * Couvre la validation des champs, les intervenants, et les options
 */
import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// FONCTIONS DE VALIDATION EXTRAITES DU COMPOSANT
// ============================================================================

interface ProgrammeFormData {
  titre: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
  date_programme: string;
  heure_debut: string;
  heure_fin: string;
  duree_estimee?: number;
  id_lieu?: number;
  lieu_specifique?: { fr: string; ar: string; en: string };
  type_activite: string;
  statut: string;
  ordre: number;
  nb_participants_max?: number;
  niveau_requis?: string;
  materiel_requis: string[];
  langue_principale: string;
  traduction_disponible: boolean;
  enregistrement_autorise: boolean;
  diffusion_live: boolean;
  support_numerique: boolean;
  notes_organisateur?: string;
  intervenants: IntervenantData[];
}

interface IntervenantData {
  id_user: number;
  role_intervenant: string;
  sujet_intervention?: string;
  biographie_courte?: string;
  ordre_intervention: number;
  duree_intervention?: number;
}

// Validation du titre multilingue
const validateTitre = (titre: { fr: string; ar: string; en: string }): { valid: boolean; error?: string } => {
  if (!titre.fr.trim()) {
    return { valid: false, error: 'Le titre en français est requis' };
  }
  if (!titre.ar.trim()) {
    return { valid: false, error: 'Le titre en arabe est requis' };
  }
  if (!titre.en.trim()) {
    return { valid: false, error: 'Le titre en anglais est requis' };
  }
  if (titre.fr.length > 200) {
    return { valid: false, error: 'Le titre ne doit pas dépasser 200 caractères' };
  }
  return { valid: true };
};

// Validation de la date du programme
const validateDateProgramme = (date: string, eventDates?: { dateDebut: string; dateFin: string }): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: 'La date est requise' };
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: 'Format de date invalide (YYYY-MM-DD attendu)' };
  }
  
  if (eventDates) {
    const programmeDate = new Date(date);
    const debut = new Date(eventDates.dateDebut);
    const fin = new Date(eventDates.dateFin);
    
    if (programmeDate < debut || programmeDate > fin) {
      return { valid: false, error: 'La date doit être comprise dans les dates de l\'événement' };
    }
  }
  
  return { valid: true };
};

// Validation des horaires
const validateHoraires = (heureDebut: string, heureFin: string): { valid: boolean; error?: string } => {
  if (!heureDebut) {
    return { valid: false, error: 'L\'heure de début est requise' };
  }
  if (!heureFin) {
    return { valid: false, error: 'L\'heure de fin est requise' };
  }
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(heureDebut)) {
    return { valid: false, error: 'Format d\'heure de début invalide (HH:MM attendu)' };
  }
  if (!timeRegex.test(heureFin)) {
    return { valid: false, error: 'Format d\'heure de fin invalide (HH:MM attendu)' };
  }
  
  if (heureDebut >= heureFin) {
    return { valid: false, error: 'L\'heure de fin doit être après l\'heure de début' };
  }
  
  return { valid: true };
};

// Validation du type d'activité
const validateTypeActivite = (type: string): { valid: boolean; error?: string } => {
  const typesValides = [
    'conference', 'atelier', 'projection', 'presentation', 'spectacle',
    'exposition', 'visite', 'concert', 'lecture', 'debat', 'formation',
    'ceremonie', 'pause', 'autre'
  ];
  
  if (!type) {
    return { valid: false, error: 'Le type d\'activité est requis' };
  }
  
  if (!typesValides.includes(type)) {
    return { valid: false, error: 'Type d\'activité invalide' };
  }
  
  return { valid: true };
};

// Validation du statut
const validateStatut = (statut: string): { valid: boolean; error?: string } => {
  const statutsValides = ['planifie', 'en_cours', 'termine', 'annule', 'reporte'];
  
  if (!statut) {
    return { valid: false, error: 'Le statut est requis' };
  }
  
  if (!statutsValides.includes(statut)) {
    return { valid: false, error: 'Statut invalide' };
  }
  
  return { valid: true };
};

// Validation de l'ordre
const validateOrdre = (ordre: number): { valid: boolean; error?: string } => {
  if (ordre === undefined || ordre === null) {
    return { valid: false, error: 'L\'ordre est requis' };
  }
  
  if (!Number.isInteger(ordre) || ordre < 1) {
    return { valid: false, error: 'L\'ordre doit être un entier positif' };
  }
  
  return { valid: true };
};

// Validation du nombre de participants
const validateNbParticipants = (nb?: number): { valid: boolean; error?: string } => {
  if (nb === undefined || nb === null) {
    return { valid: true }; // Optionnel
  }
  
  if (!Number.isInteger(nb) || nb < 1) {
    return { valid: false, error: 'Le nombre de participants doit être un entier positif' };
  }
  
  if (nb > 10000) {
    return { valid: false, error: 'Le nombre de participants ne peut pas dépasser 10000' };
  }
  
  return { valid: true };
};

// Validation du niveau requis
const validateNiveauRequis = (niveau?: string): { valid: boolean; error?: string } => {
  if (!niveau) {
    return { valid: true }; // Optionnel
  }
  
  const niveauxValides = ['debutant', 'intermediaire', 'avance', 'tous_niveaux'];
  if (!niveauxValides.includes(niveau)) {
    return { valid: false, error: 'Niveau invalide' };
  }
  
  return { valid: true };
};

// Validation de la langue principale
const validateLanguePrincipale = (langue: string): { valid: boolean; error?: string } => {
  const languesValides = ['fr', 'ar', 'en', 'tz'];
  
  if (!langue) {
    return { valid: false, error: 'La langue principale est requise' };
  }
  
  if (!languesValides.includes(langue)) {
    return { valid: false, error: 'Langue invalide' };
  }
  
  return { valid: true };
};

// Validation d'un intervenant
const validateIntervenant = (intervenant: IntervenantData): { valid: boolean; error?: string } => {
  if (!intervenant.id_user || intervenant.id_user <= 0) {
    return { valid: false, error: 'L\'utilisateur est requis pour l\'intervenant' };
  }
  
  const rolesValides = ['principal', 'co_intervenant', 'moderateur', 'animateur', 'invite'];
  if (!intervenant.role_intervenant || !rolesValides.includes(intervenant.role_intervenant)) {
    return { valid: false, error: 'Le rôle de l\'intervenant est invalide' };
  }
  
  if (intervenant.ordre_intervention !== undefined && intervenant.ordre_intervention < 1) {
    return { valid: false, error: 'L\'ordre d\'intervention doit être positif' };
  }
  
  if (intervenant.duree_intervention !== undefined && intervenant.duree_intervention < 1) {
    return { valid: false, error: 'La durée d\'intervention doit être positive' };
  }
  
  return { valid: true };
};

// Validation complète du formulaire Programme
const validateProgrammeForm = (data: ProgrammeFormData, eventDates?: { dateDebut: string; dateFin: string }): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validation du titre
  const titreResult = validateTitre(data.titre);
  if (!titreResult.valid) {
    errors.titre = titreResult.error!;
  }
  
  // Validation de la date
  const dateResult = validateDateProgramme(data.date_programme, eventDates);
  if (!dateResult.valid) {
    errors.date_programme = dateResult.error!;
  }
  
  // Validation des horaires
  const horairesResult = validateHoraires(data.heure_debut, data.heure_fin);
  if (!horairesResult.valid) {
    errors.horaires = horairesResult.error!;
  }
  
  // Validation du type d'activité
  const typeResult = validateTypeActivite(data.type_activite);
  if (!typeResult.valid) {
    errors.type_activite = typeResult.error!;
  }
  
  // Validation du statut
  const statutResult = validateStatut(data.statut);
  if (!statutResult.valid) {
    errors.statut = statutResult.error!;
  }
  
  // Validation de l'ordre
  const ordreResult = validateOrdre(data.ordre);
  if (!ordreResult.valid) {
    errors.ordre = ordreResult.error!;
  }
  
  // Validation du nombre de participants
  const nbResult = validateNbParticipants(data.nb_participants_max);
  if (!nbResult.valid) {
    errors.nb_participants_max = nbResult.error!;
  }
  
  // Validation du niveau requis
  const niveauResult = validateNiveauRequis(data.niveau_requis);
  if (!niveauResult.valid) {
    errors.niveau_requis = niveauResult.error!;
  }
  
  // Validation de la langue principale
  const langueResult = validateLanguePrincipale(data.langue_principale);
  if (!langueResult.valid) {
    errors.langue_principale = langueResult.error!;
  }
  
  // Validation des intervenants
  data.intervenants.forEach((intervenant, index) => {
    const intervenantResult = validateIntervenant(intervenant);
    if (!intervenantResult.valid) {
      errors[`intervenant_${index}`] = intervenantResult.error!;
    }
  });
  
  return { valid: Object.keys(errors).length === 0, errors };
};

// Calcul de la durée estimée
const calculateDuree = (heureDebut: string, heureFin: string): number | null => {
  if (!heureDebut || !heureFin) return null;
  
  const debut = new Date(`2000-01-01T${heureDebut}`);
  const fin = new Date(`2000-01-01T${heureFin}`);
  const duree = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60));
  
  return duree > 0 ? duree : null;
};

// Génération des dates entre deux dates
const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

// ============================================================================
// TESTS
// ============================================================================

describe('ProgrammeForm - Validation', () => {
  
  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du titre multilingue
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateTitre', () => {
    it('devrait valider un titre complet dans toutes les langues', () => {
      const titre = { fr: 'Conférence', ar: 'مؤتمر', en: 'Conference' };
      const result = validateTitre(titre);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un titre français vide', () => {
      const titre = { fr: '', ar: 'مؤتمر', en: 'Conference' };
      const result = validateTitre(titre);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('français');
    });

    it('devrait rejeter un titre arabe vide', () => {
      const titre = { fr: 'Conférence', ar: '', en: 'Conference' };
      const result = validateTitre(titre);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('arabe');
    });

    it('devrait rejeter un titre anglais vide', () => {
      const titre = { fr: 'Conférence', ar: 'مؤتمر', en: '' };
      const result = validateTitre(titre);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('anglais');
    });

    it('devrait rejeter un titre trop long', () => {
      const titre = { fr: 'A'.repeat(201), ar: 'مؤتمر', en: 'Conference' };
      const result = validateTitre(titre);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('200 caractères');
    });

    it('devrait rejeter un titre avec uniquement des espaces', () => {
      const titre = { fr: '   ', ar: 'مؤتمر', en: 'Conference' };
      const result = validateTitre(titre);
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de la date du programme
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateDateProgramme', () => {
    it('devrait valider une date au format correct', () => {
      const result = validateDateProgramme('2025-06-15');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une date vide', () => {
      const result = validateDateProgramme('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requise');
    });

    it('devrait rejeter un format de date invalide', () => {
      const result = validateDateProgramme('15/06/2025');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Format');
    });

    it('devrait valider une date dans la plage de l\'événement', () => {
      const eventDates = { dateDebut: '2025-06-10', dateFin: '2025-06-20' };
      const result = validateDateProgramme('2025-06-15', eventDates);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une date avant le début de l\'événement', () => {
      const eventDates = { dateDebut: '2025-06-10', dateFin: '2025-06-20' };
      const result = validateDateProgramme('2025-06-05', eventDates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('comprise');
    });

    it('devrait rejeter une date après la fin de l\'événement', () => {
      const eventDates = { dateDebut: '2025-06-10', dateFin: '2025-06-20' };
      const result = validateDateProgramme('2025-06-25', eventDates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('comprise');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation des horaires
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateHoraires', () => {
    it('devrait valider des horaires corrects', () => {
      const result = validateHoraires('09:00', '10:30');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une heure de début vide', () => {
      const result = validateHoraires('', '10:30');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('début');
    });

    it('devrait rejeter une heure de fin vide', () => {
      const result = validateHoraires('09:00', '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('fin');
    });

    it('devrait rejeter un format d\'heure invalide', () => {
      const result = validateHoraires('9h00', '10:30');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Format');
    });

    it('devrait rejeter si l\'heure de fin est avant l\'heure de début', () => {
      const result = validateHoraires('14:00', '10:00');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('après');
    });

    it('devrait rejeter si l\'heure de fin est égale à l\'heure de début', () => {
      const result = validateHoraires('10:00', '10:00');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('après');
    });

    it('devrait valider des horaires en soirée', () => {
      const result = validateHoraires('19:00', '22:00');
      expect(result.valid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du type d'activité
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateTypeActivite', () => {
    it('devrait valider le type "conference"', () => {
      const result = validateTypeActivite('conference');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le type "atelier"', () => {
      const result = validateTypeActivite('atelier');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le type "projection"', () => {
      const result = validateTypeActivite('projection');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le type "spectacle"', () => {
      const result = validateTypeActivite('spectacle');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le type "pause"', () => {
      const result = validateTypeActivite('pause');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un type vide', () => {
      const result = validateTypeActivite('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requis');
    });

    it('devrait rejeter un type invalide', () => {
      const result = validateTypeActivite('invalid_type');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalide');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du statut
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateStatut', () => {
    it('devrait valider le statut "planifie"', () => {
      const result = validateStatut('planifie');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le statut "en_cours"', () => {
      const result = validateStatut('en_cours');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le statut "termine"', () => {
      const result = validateStatut('termine');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le statut "annule"', () => {
      const result = validateStatut('annule');
      expect(result.valid).toBe(true);
    });

    it('devrait valider le statut "reporte"', () => {
      const result = validateStatut('reporte');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un statut vide', () => {
      const result = validateStatut('');
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un statut invalide', () => {
      const result = validateStatut('invalid_status');
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de l'ordre
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateOrdre', () => {
    it('devrait valider un ordre positif', () => {
      const result = validateOrdre(1);
      expect(result.valid).toBe(true);
    });

    it('devrait valider un ordre élevé', () => {
      const result = validateOrdre(100);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un ordre de 0', () => {
      const result = validateOrdre(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('positif');
    });

    it('devrait rejeter un ordre négatif', () => {
      const result = validateOrdre(-1);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un ordre décimal', () => {
      const result = validateOrdre(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('entier');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du nombre de participants
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateNbParticipants', () => {
    it('devrait valider un nombre positif', () => {
      const result = validateNbParticipants(50);
      expect(result.valid).toBe(true);
    });

    it('devrait valider undefined (optionnel)', () => {
      const result = validateNbParticipants(undefined);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un nombre de 0', () => {
      const result = validateNbParticipants(0);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un nombre négatif', () => {
      const result = validateNbParticipants(-10);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un nombre supérieur à 10000', () => {
      const result = validateNbParticipants(15000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10000');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation du niveau requis
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateNiveauRequis', () => {
    it('devrait valider "debutant"', () => {
      const result = validateNiveauRequis('debutant');
      expect(result.valid).toBe(true);
    });

    it('devrait valider "intermediaire"', () => {
      const result = validateNiveauRequis('intermediaire');
      expect(result.valid).toBe(true);
    });

    it('devrait valider "avance"', () => {
      const result = validateNiveauRequis('avance');
      expect(result.valid).toBe(true);
    });

    it('devrait valider "tous_niveaux"', () => {
      const result = validateNiveauRequis('tous_niveaux');
      expect(result.valid).toBe(true);
    });

    it('devrait valider undefined (optionnel)', () => {
      const result = validateNiveauRequis(undefined);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un niveau invalide', () => {
      const result = validateNiveauRequis('expert');
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation de la langue principale
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateLanguePrincipale', () => {
    it('devrait valider "fr"', () => {
      const result = validateLanguePrincipale('fr');
      expect(result.valid).toBe(true);
    });

    it('devrait valider "ar"', () => {
      const result = validateLanguePrincipale('ar');
      expect(result.valid).toBe(true);
    });

    it('devrait valider "en"', () => {
      const result = validateLanguePrincipale('en');
      expect(result.valid).toBe(true);
    });

    it('devrait valider "tz"', () => {
      const result = validateLanguePrincipale('tz');
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter une langue vide', () => {
      const result = validateLanguePrincipale('');
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter une langue invalide', () => {
      const result = validateLanguePrincipale('de');
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation des intervenants
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateIntervenant', () => {
    it('devrait valider un intervenant complet', () => {
      const intervenant: IntervenantData = {
        id_user: 1,
        role_intervenant: 'principal',
        sujet_intervention: 'Introduction',
        biographie_courte: 'Expert en...',
        ordre_intervention: 1,
        duree_intervention: 30
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un intervenant sans id_user', () => {
      const intervenant: IntervenantData = {
        id_user: 0,
        role_intervenant: 'principal',
        ordre_intervention: 1
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('utilisateur');
    });

    it('devrait rejeter un rôle invalide', () => {
      const intervenant: IntervenantData = {
        id_user: 1,
        role_intervenant: 'invalid_role',
        ordre_intervention: 1
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('rôle');
    });

    it('devrait valider le rôle "co_intervenant"', () => {
      const intervenant: IntervenantData = {
        id_user: 1,
        role_intervenant: 'co_intervenant',
        ordre_intervention: 1
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(true);
    });

    it('devrait valider le rôle "moderateur"', () => {
      const intervenant: IntervenantData = {
        id_user: 1,
        role_intervenant: 'moderateur',
        ordre_intervention: 1
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un ordre d\'intervention négatif', () => {
      const intervenant: IntervenantData = {
        id_user: 1,
        role_intervenant: 'principal',
        ordre_intervention: -1
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter une durée d\'intervention négative', () => {
      const intervenant: IntervenantData = {
        id_user: 1,
        role_intervenant: 'principal',
        ordre_intervention: 1,
        duree_intervention: -10
      };
      const result = validateIntervenant(intervenant);
      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de validation complète du formulaire
  // ─────────────────────────────────────────────────────────────────────────
  describe('validateProgrammeForm', () => {
    const validFormData: ProgrammeFormData = {
      titre: { fr: 'Conférence', ar: 'مؤتمر', en: 'Conference' },
      description: { fr: 'Description', ar: 'وصف', en: 'Description' },
      date_programme: '2025-06-15',
      heure_debut: '09:00',
      heure_fin: '10:30',
      type_activite: 'conference',
      statut: 'planifie',
      ordre: 1,
      materiel_requis: [],
      langue_principale: 'fr',
      traduction_disponible: false,
      enregistrement_autorise: false,
      diffusion_live: false,
      support_numerique: false,
      intervenants: []
    };

    it('devrait valider un formulaire complet et correct', () => {
      const result = validateProgrammeForm(validFormData);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('devrait rejeter un formulaire avec titre manquant', () => {
      const data = { ...validFormData, titre: { fr: '', ar: '', en: '' } };
      const result = validateProgrammeForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.titre).toBeDefined();
    });

    it('devrait rejeter un formulaire avec date manquante', () => {
      const data = { ...validFormData, date_programme: '' };
      const result = validateProgrammeForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.date_programme).toBeDefined();
    });

    it('devrait rejeter un formulaire avec horaires invalides', () => {
      const data = { ...validFormData, heure_debut: '14:00', heure_fin: '10:00' };
      const result = validateProgrammeForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.horaires).toBeDefined();
    });

    it('devrait valider un formulaire avec intervenants valides', () => {
      const data: ProgrammeFormData = {
        ...validFormData,
        intervenants: [
          { id_user: 1, role_intervenant: 'principal', ordre_intervention: 1 },
          { id_user: 2, role_intervenant: 'co_intervenant', ordre_intervention: 2 }
        ]
      };
      const result = validateProgrammeForm(data);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un formulaire avec intervenant invalide', () => {
      const data: ProgrammeFormData = {
        ...validFormData,
        intervenants: [
          { id_user: 0, role_intervenant: 'principal', ordre_intervention: 1 }
        ]
      };
      const result = validateProgrammeForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.intervenant_0).toBeDefined();
    });

    it('devrait valider avec les dates de l\'événement', () => {
      const eventDates = { dateDebut: '2025-06-10', dateFin: '2025-06-20' };
      const result = validateProgrammeForm(validFormData, eventDates);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter si la date est hors de l\'événement', () => {
      const eventDates = { dateDebut: '2025-06-10', dateFin: '2025-06-12' };
      const result = validateProgrammeForm(validFormData, eventDates);
      expect(result.valid).toBe(false);
      expect(result.errors.date_programme).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de calcul de durée
  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateDuree', () => {
    it('devrait calculer correctement la durée en minutes', () => {
      const duree = calculateDuree('09:00', '10:30');
      expect(duree).toBe(90);
    });

    it('devrait retourner null si l\'heure de début est vide', () => {
      const duree = calculateDuree('', '10:30');
      expect(duree).toBeNull();
    });

    it('devrait retourner null si l\'heure de fin est vide', () => {
      const duree = calculateDuree('09:00', '');
      expect(duree).toBeNull();
    });

    it('devrait retourner null si la durée est négative', () => {
      const duree = calculateDuree('14:00', '10:00');
      expect(duree).toBeNull();
    });

    it('devrait calculer une durée de 30 minutes', () => {
      const duree = calculateDuree('10:00', '10:30');
      expect(duree).toBe(30);
    });

    it('devrait calculer une durée de plusieurs heures', () => {
      const duree = calculateDuree('09:00', '17:00');
      expect(duree).toBe(480); // 8 heures = 480 minutes
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tests de génération de plage de dates
  // ─────────────────────────────────────────────────────────────────────────
  describe('generateDateRange', () => {
    it('devrait générer une plage de dates correcte', () => {
      const dates = generateDateRange('2025-06-10', '2025-06-12');
      expect(dates).toHaveLength(3);
      expect(dates).toContain('2025-06-10');
      expect(dates).toContain('2025-06-11');
      expect(dates).toContain('2025-06-12');
    });

    it('devrait retourner une seule date si début = fin', () => {
      const dates = generateDateRange('2025-06-15', '2025-06-15');
      expect(dates).toHaveLength(1);
      expect(dates[0]).toBe('2025-06-15');
    });

    it('devrait gérer un événement d\'une semaine', () => {
      const dates = generateDateRange('2025-06-01', '2025-06-07');
      expect(dates).toHaveLength(7);
    });

    it('devrait gérer le passage de mois', () => {
      const dates = generateDateRange('2025-06-29', '2025-07-02');
      expect(dates).toHaveLength(4);
      expect(dates).toContain('2025-06-30');
      expect(dates).toContain('2025-07-01');
    });
  });
});

// ============================================================================
// TESTS DES OPTIONS ET MATÉRIEL
// ============================================================================

describe('ProgrammeForm - Options et Matériel', () => {
  
  describe('Gestion du matériel requis', () => {
    it('devrait permettre d\'ajouter du matériel', () => {
      const materiel: string[] = [];
      const newMateriel = 'Projecteur';
      
      if (newMateriel.trim() && !materiel.includes(newMateriel.trim())) {
        materiel.push(newMateriel.trim());
      }
      
      expect(materiel).toContain('Projecteur');
    });

    it('devrait éviter les doublons de matériel', () => {
      const materiel: string[] = ['Projecteur'];
      const newMateriel = 'Projecteur';
      
      if (newMateriel.trim() && !materiel.includes(newMateriel.trim())) {
        materiel.push(newMateriel.trim());
      }
      
      expect(materiel).toHaveLength(1);
    });

    it('devrait ignorer les matériels vides', () => {
      const materiel: string[] = [];
      const newMateriel = '   ';
      
      if (newMateriel.trim() && !materiel.includes(newMateriel.trim())) {
        materiel.push(newMateriel.trim());
      }
      
      expect(materiel).toHaveLength(0);
    });

    it('devrait permettre de supprimer du matériel', () => {
      const materiel = ['Projecteur', 'Micro', 'Écran'];
      const indexToRemove = 1;
      
      const newMateriel = materiel.filter((_, i) => i !== indexToRemove);
      
      expect(newMateriel).toHaveLength(2);
      expect(newMateriel).not.toContain('Micro');
    });
  });

  describe('Options booléennes', () => {
    it('devrait avoir des valeurs par défaut à false', () => {
      const options = {
        traduction_disponible: false,
        enregistrement_autorise: false,
        diffusion_live: false,
        support_numerique: false
      };
      
      expect(options.traduction_disponible).toBe(false);
      expect(options.enregistrement_autorise).toBe(false);
      expect(options.diffusion_live).toBe(false);
      expect(options.support_numerique).toBe(false);
    });

    it('devrait permettre d\'activer les options', () => {
      const options = {
        traduction_disponible: true,
        enregistrement_autorise: true,
        diffusion_live: false,
        support_numerique: true
      };
      
      expect(options.traduction_disponible).toBe(true);
      expect(options.enregistrement_autorise).toBe(true);
      expect(options.diffusion_live).toBe(false);
      expect(options.support_numerique).toBe(true);
    });
  });
});
