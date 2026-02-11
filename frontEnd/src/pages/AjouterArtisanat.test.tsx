/**
 * Tests pour AjouterArtisanat - Formulaire de création d'artisanat
 * Couvre la validation des champs, prix, et tags
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// INTERFACES
// ============================================================================

interface ArtisanatFormData {
  nom: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
  id_materiau: number;
  id_technique: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande: boolean;
  en_stock?: number;
  tags: string[];
}

// ============================================================================
// FONCTIONS DE VALIDATION
// ============================================================================

// Validation du nom multilingue
const validateNom = (nom: { fr: string; ar: string; en?: string }): { valid: boolean; error?: string } => {
  if (!nom.fr.trim() && !nom.ar.trim()) {
    return { valid: false, error: 'Le nom est requis (FR ou AR)' };
  }
  if (nom.fr && nom.fr.length > 200) {
    return { valid: false, error: 'Le nom ne doit pas dépasser 200 caractères' };
  }
  return { valid: true };
};

// Validation du matériau
const validateMateriau = (id: number): { valid: boolean; error?: string } => {
  if (!id || id <= 0) {
    return { valid: false, error: 'Le matériau est requis' };
  }
  return { valid: true };
};

// Validation de la technique
const validateTechnique = (id: number): { valid: boolean; error?: string } => {
  if (!id || id <= 0) {
    return { valid: false, error: 'La technique est requise' };
  }
  return { valid: true };
};

// Validation des prix
const validatePrix = (prixMin?: number, prixMax?: number): { valid: boolean; error?: string } => {
  if (prixMin !== undefined && prixMin < 0) {
    return { valid: false, error: 'Le prix minimum ne peut pas être négatif' };
  }
  if (prixMax !== undefined && prixMax < 0) {
    return { valid: false, error: 'Le prix maximum ne peut pas être négatif' };
  }
  if (prixMin !== undefined && prixMax !== undefined && prixMin > prixMax) {
    return { valid: false, error: 'Le prix minimum doit être inférieur au prix maximum' };
  }
  if (prixMax !== undefined && prixMax > 10000000) {
    return { valid: false, error: 'Le prix semble trop élevé' };
  }
  return { valid: true };
};

// Validation du délai de fabrication
const validateDelai = (delai?: number): { valid: boolean; error?: string } => {
  if (delai === undefined) return { valid: true };
  if (delai < 1) {
    return { valid: false, error: 'Le délai doit être d\'au moins 1 jour' };
  }
  if (delai > 365) {
    return { valid: false, error: 'Le délai ne peut pas dépasser 365 jours' };
  }
  return { valid: true };
};

// Validation du stock
const validateStock = (stock?: number): { valid: boolean; error?: string } => {
  if (stock === undefined) return { valid: true };
  if (stock < 0) {
    return { valid: false, error: 'Le stock ne peut pas être négatif' };
  }
  if (!Number.isInteger(stock)) {
    return { valid: false, error: 'Le stock doit être un nombre entier' };
  }
  return { valid: true };
};

// Validation des tags
const validateTags = (tags: string[]): { valid: boolean; error?: string } => {
  if (tags.some(tag => tag.length > 50)) {
    return { valid: false, error: 'Un tag ne peut pas dépasser 50 caractères' };
  }
  if (tags.length > 20) {
    return { valid: false, error: 'Maximum 20 tags autorisés' };
  }
  return { valid: true };
};

// Validation complète du formulaire
const validateArtisanatForm = (data: ArtisanatFormData): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  const nomResult = validateNom(data.nom);
  if (!nomResult.valid) errors.nom = nomResult.error!;

  const materiauResult = validateMateriau(data.id_materiau);
  if (!materiauResult.valid) errors.id_materiau = materiauResult.error!;

  const techniqueResult = validateTechnique(data.id_technique);
  if (!techniqueResult.valid) errors.id_technique = techniqueResult.error!;

  const prixResult = validatePrix(data.prix_min, data.prix_max);
  if (!prixResult.valid) errors.prix = prixResult.error!;

  const delaiResult = validateDelai(data.delai_fabrication);
  if (!delaiResult.valid) errors.delai_fabrication = delaiResult.error!;

  const stockResult = validateStock(data.en_stock);
  if (!stockResult.valid) errors.en_stock = stockResult.error!;

  const tagsResult = validateTags(data.tags);
  if (!tagsResult.valid) errors.tags = tagsResult.error!;

  return { valid: Object.keys(errors).length === 0, errors };
};

// ============================================================================
// TESTS
// ============================================================================

describe('AjouterArtisanat - Validation', () => {

  describe('validateNom', () => {
    it('devrait valider un nom en français', () => {
      const result = validateNom({ fr: 'Tapis berbère', ar: '' });
      expect(result.valid).toBe(true);
    });

    it('devrait valider un nom en arabe', () => {
      const result = validateNom({ fr: '', ar: 'سجاد أمازيغي' });
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un nom vide', () => {
      const result = validateNom({ fr: '', ar: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requis');
    });

    it('devrait rejeter un nom trop long', () => {
      const result = validateNom({ fr: 'A'.repeat(201), ar: '' });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateMateriau', () => {
    it('devrait valider un matériau valide', () => {
      expect(validateMateriau(1).valid).toBe(true);
    });

    it('devrait rejeter un matériau à 0', () => {
      expect(validateMateriau(0).valid).toBe(false);
    });

    it('devrait rejeter un matériau négatif', () => {
      expect(validateMateriau(-1).valid).toBe(false);
    });
  });

  describe('validateTechnique', () => {
    it('devrait valider une technique valide', () => {
      expect(validateTechnique(1).valid).toBe(true);
    });

    it('devrait rejeter une technique à 0', () => {
      expect(validateTechnique(0).valid).toBe(false);
    });
  });

  describe('validatePrix', () => {
    it('devrait valider des prix valides', () => {
      const result = validatePrix(1000, 5000);
      expect(result.valid).toBe(true);
    });

    it('devrait valider des prix undefined', () => {
      const result = validatePrix(undefined, undefined);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter un prix min négatif', () => {
      const result = validatePrix(-100, 5000);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter un prix max négatif', () => {
      const result = validatePrix(1000, -5000);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter si prix min > prix max', () => {
      const result = validatePrix(5000, 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inférieur');
    });

    it('devrait rejeter un prix trop élevé', () => {
      const result = validatePrix(0, 20000000);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDelai', () => {
    it('devrait valider un délai valide', () => {
      expect(validateDelai(7).valid).toBe(true);
    });

    it('devrait valider undefined', () => {
      expect(validateDelai(undefined).valid).toBe(true);
    });

    it('devrait rejeter un délai de 0', () => {
      expect(validateDelai(0).valid).toBe(false);
    });

    it('devrait rejeter un délai trop long', () => {
      expect(validateDelai(400).valid).toBe(false);
    });
  });

  describe('validateStock', () => {
    it('devrait valider un stock positif', () => {
      expect(validateStock(10).valid).toBe(true);
    });

    it('devrait valider un stock de 0', () => {
      expect(validateStock(0).valid).toBe(true);
    });

    it('devrait valider undefined', () => {
      expect(validateStock(undefined).valid).toBe(true);
    });

    it('devrait rejeter un stock négatif', () => {
      expect(validateStock(-5).valid).toBe(false);
    });

    it('devrait rejeter un stock décimal', () => {
      expect(validateStock(5.5).valid).toBe(false);
    });
  });

  describe('validateTags', () => {
    it('devrait valider des tags valides', () => {
      const result = validateTags(['berbère', 'traditionnel', 'artisanal']);
      expect(result.valid).toBe(true);
    });

    it('devrait valider un tableau vide', () => {
      expect(validateTags([]).valid).toBe(true);
    });

    it('devrait rejeter un tag trop long', () => {
      const result = validateTags(['A'.repeat(51)]);
      expect(result.valid).toBe(false);
    });

    it('devrait rejeter trop de tags', () => {
      const tags = Array(21).fill('tag');
      expect(validateTags(tags).valid).toBe(false);
    });
  });

  describe('validateArtisanatForm', () => {
    const validData: ArtisanatFormData = {
      nom: { fr: 'Tapis berbère', ar: 'سجاد', en: 'Berber carpet' },
      description: { fr: 'Description', ar: 'وصف', en: 'Description' },
      id_materiau: 1,
      id_technique: 1,
      prix_min: 5000,
      prix_max: 10000,
      delai_fabrication: 7,
      sur_commande: true,
      en_stock: 5,
      tags: ['berbère', 'traditionnel']
    };

    it('devrait valider un formulaire complet', () => {
      const result = validateArtisanatForm(validData);
      expect(result.valid).toBe(true);
    });

    it('devrait rejeter sans nom', () => {
      const data = { ...validData, nom: { fr: '', ar: '', en: '' } };
      const result = validateArtisanatForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.nom).toBeDefined();
    });

    it('devrait rejeter sans matériau', () => {
      const data = { ...validData, id_materiau: 0 };
      const result = validateArtisanatForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.id_materiau).toBeDefined();
    });

    it('devrait rejeter sans technique', () => {
      const data = { ...validData, id_technique: 0 };
      const result = validateArtisanatForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.id_technique).toBeDefined();
    });

    it('devrait rejeter avec prix invalides', () => {
      const data = { ...validData, prix_min: 10000, prix_max: 5000 };
      const result = validateArtisanatForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.prix).toBeDefined();
    });
  });
});
