/**
 * Tests pour la validation du formulaire AjouterOeuvre
 * Tests unitaires pour chaque type d'œuvre : Livre, Film, Article, Article Scientifique
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// TYPES
// ============================================================================

type TypeOeuvre = 'Livre' | 'Film' | 'Article' | 'Article Scientifique' | 'Album Musical' | 'Artisanat' | 'Œuvre d\'Art';

interface MultiLangField {
  fr: string;
  ar: string;
  en: string;
}

interface OeuvreBaseData {
  titre: MultiLangField;
  description: MultiLangField;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  categories: number[];
  tags: string[];
}

interface LivreDetails {
  isbn?: string;
  nb_pages?: number;
}

interface FilmDetails {
  duree_minutes?: number;
  realisateur?: string;
  producteur?: string;
  studio?: string;
}

interface ArticleDetails {
  auteur?: string;
  source?: string;
  resume?: string;
  url_source?: string;
}

interface ArticleScientifiqueDetails {
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  peer_reviewed?: boolean;
  editeur_id?: number;
}

interface EditeurInfo {
  id_editeur: number;
  nom: string;
  role?: string;
}

// ============================================================================
// FONCTIONS DE VALIDATION - CHAMPS COMMUNS
// ============================================================================

const validateTitre = (titre: MultiLangField): string | null => {
  if (!titre.fr && !titre.ar && !titre.en) {
    return 'Le titre est requis dans au moins une langue';
  }
  return null;
};

const validateDescription = (description: MultiLangField): string | null => {
  if (!description.fr && !description.ar && !description.en) {
    return 'La description est requise dans au moins une langue';
  }
  return null;
};

const validateTypeOeuvre = (id_type_oeuvre: number): string | null => {
  if (!id_type_oeuvre || id_type_oeuvre <= 0) {
    return 'Le type d\'œuvre est requis';
  }
  return null;
};

const validateAnneeCreation = (annee?: number): string | null => {
  if (annee !== undefined) {
    const currentYear = new Date().getFullYear();
    if (annee < 1800 || annee > currentYear + 1) {
      return `L'année doit être entre 1800 et ${currentYear + 1}`;
    }
  }
  return null;
};

// ============================================================================
// FONCTIONS DE VALIDATION - LIVRE
// ============================================================================

const validateISBN = (isbn?: string): string | null => {
  if (isbn) {
    // ISBN-10 ou ISBN-13
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
      return 'ISBN invalide (doit contenir 10 ou 13 chiffres)';
    }
    if (!/^\d+$/.test(cleanISBN.slice(0, -1))) {
      return 'ISBN invalide (caractères non numériques)';
    }
  }
  return null;
};

const validateNbPages = (nb_pages?: number): string | null => {
  if (nb_pages !== undefined) {
    if (nb_pages <= 0) {
      return 'Le nombre de pages doit être positif';
    }
    if (nb_pages > 10000) {
      return 'Le nombre de pages semble incorrect';
    }
  }
  return null;
};

const validateLivre = (details: LivreDetails): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const isbnError = validateISBN(details.isbn);
  if (isbnError) errors.isbn = isbnError;
  
  const pagesError = validateNbPages(details.nb_pages);
  if (pagesError) errors.nb_pages = pagesError;
  
  return errors;
};

// ============================================================================
// FONCTIONS DE VALIDATION - FILM
// ============================================================================

const validateDureeMinutes = (duree?: number): string | null => {
  if (duree !== undefined) {
    if (duree <= 0) {
      return 'La durée doit être positive';
    }
    if (duree > 1000) {
      return 'La durée semble incorrecte (max 1000 minutes)';
    }
  }
  return null;
};

const validateRealisateur = (realisateur?: string): string | null => {
  if (realisateur && realisateur.length < 2) {
    return 'Le nom du réalisateur est trop court';
  }
  return null;
};

const validateFilm = (details: FilmDetails): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const dureeError = validateDureeMinutes(details.duree_minutes);
  if (dureeError) errors.duree_minutes = dureeError;
  
  const realisateurError = validateRealisateur(details.realisateur);
  if (realisateurError) errors.realisateur = realisateurError;
  
  return errors;
};

// ============================================================================
// FONCTIONS DE VALIDATION - ARTICLE
// ============================================================================

const validateAuteur = (auteur?: string): string | null => {
  if (auteur && auteur.length < 2) {
    return 'Le nom de l\'auteur est trop court';
  }
  return null;
};

const validateSource = (source?: string): string | null => {
  if (source && source.length < 2) {
    return 'La source est trop courte';
  }
  return null;
};

const validateUrlSource = (url?: string): string | null => {
  if (url) {
    try {
      new URL(url);
    } catch {
      return 'URL invalide';
    }
  }
  return null;
};

const validateArticle = (details: ArticleDetails): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const auteurError = validateAuteur(details.auteur);
  if (auteurError) errors.auteur = auteurError;
  
  const sourceError = validateSource(details.source);
  if (sourceError) errors.source = sourceError;
  
  const urlError = validateUrlSource(details.url_source);
  if (urlError) errors.url_source = urlError;
  
  return errors;
};

// ============================================================================
// FONCTIONS DE VALIDATION - ARTICLE SCIENTIFIQUE
// ============================================================================

const validateJournal = (journal?: string): string | null => {
  if (!journal || journal.length < 2) {
    return 'Le nom du journal est requis';
  }
  return null;
};

const validateDOI = (doi?: string): string | null => {
  if (doi) {
    // Format DOI: 10.xxxx/xxxxx
    if (!/^10\.\d{4,}\/\S+$/.test(doi)) {
      return 'Format DOI invalide (ex: 10.1234/example)';
    }
  }
  return null;
};

const validateVolume = (volume?: string): string | null => {
  if (volume && !/^\d+$/.test(volume)) {
    return 'Le volume doit être un nombre';
  }
  return null;
};

const validateNumero = (numero?: string): string | null => {
  if (numero && !/^\d+$/.test(numero)) {
    return 'Le numéro doit être un nombre';
  }
  return null;
};

const validateEditeur = (editeur_id?: number): string | null => {
  if (!editeur_id || editeur_id <= 0) {
    return 'L\'éditeur est requis pour un article scientifique';
  }
  return null;
};

const validateArticleScientifique = (details: ArticleScientifiqueDetails): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const journalError = validateJournal(details.journal);
  if (journalError) errors.journal = journalError;
  
  const doiError = validateDOI(details.doi);
  if (doiError) errors.doi = doiError;
  
  const volumeError = validateVolume(details.volume);
  if (volumeError) errors.volume = volumeError;
  
  const numeroError = validateNumero(details.numero);
  if (numeroError) errors.numero = numeroError;
  
  const editeurError = validateEditeur(details.editeur_id);
  if (editeurError) errors.editeur_id = editeurError;
  
  return errors;
};

// ============================================================================
// VALIDATION COMPLÈTE PAR TYPE
// ============================================================================

const validateOeuvreBase = (data: OeuvreBaseData): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const titreError = validateTitre(data.titre);
  if (titreError) errors.titre = titreError;
  
  const descError = validateDescription(data.description);
  if (descError) errors.description = descError;
  
  const typeError = validateTypeOeuvre(data.id_type_oeuvre);
  if (typeError) errors.id_type_oeuvre = typeError;
  
  const anneeError = validateAnneeCreation(data.annee_creation);
  if (anneeError) errors.annee_creation = anneeError;
  
  return errors;
};

// ============================================================================
// TESTS
// ============================================================================

describe('AjouterOeuvre - Validation', () => {
  
  describe('Champs communs', () => {
    describe('validateTitre', () => {
      it('retourne erreur si titre vide dans toutes les langues', () => {
        expect(validateTitre({ fr: '', ar: '', en: '' })).toBe('Le titre est requis dans au moins une langue');
      });

      it('retourne null si titre en français', () => {
        expect(validateTitre({ fr: 'Mon livre', ar: '', en: '' })).toBeNull();
      });

      it('retourne null si titre en arabe', () => {
        expect(validateTitre({ fr: '', ar: 'كتابي', en: '' })).toBeNull();
      });

      it('retourne null si titre en anglais', () => {
        expect(validateTitre({ fr: '', ar: '', en: 'My book' })).toBeNull();
      });
    });

    describe('validateDescription', () => {
      it('retourne erreur si description vide', () => {
        expect(validateDescription({ fr: '', ar: '', en: '' })).toBe('La description est requise dans au moins une langue');
      });

      it('retourne null si description fournie', () => {
        expect(validateDescription({ fr: 'Une description', ar: '', en: '' })).toBeNull();
      });
    });

    describe('validateTypeOeuvre', () => {
      it('retourne erreur si type non sélectionné', () => {
        expect(validateTypeOeuvre(0)).toBe('Le type d\'œuvre est requis');
      });

      it('retourne null si type valide', () => {
        expect(validateTypeOeuvre(1)).toBeNull();
        expect(validateTypeOeuvre(5)).toBeNull();
      });
    });

    describe('validateAnneeCreation', () => {
      it('retourne erreur si année trop ancienne', () => {
        expect(validateAnneeCreation(1799)).toContain('L\'année doit être entre');
      });

      it('retourne erreur si année dans le futur lointain', () => {
        const futureYear = new Date().getFullYear() + 5;
        expect(validateAnneeCreation(futureYear)).toContain('L\'année doit être entre');
      });

      it('retourne null si année valide', () => {
        expect(validateAnneeCreation(2020)).toBeNull();
        expect(validateAnneeCreation(1900)).toBeNull();
      });

      it('retourne null si année non fournie', () => {
        expect(validateAnneeCreation(undefined)).toBeNull();
      });
    });
  });

  describe('Type: Livre', () => {
    describe('validateISBN', () => {
      it('retourne erreur si ISBN trop court', () => {
        expect(validateISBN('123456')).toBe('ISBN invalide (doit contenir 10 ou 13 chiffres)');
      });

      it('retourne null si ISBN-10 valide', () => {
        expect(validateISBN('0-306-40615-2')).toBeNull();
      });

      it('retourne null si ISBN-13 valide', () => {
        expect(validateISBN('978-3-16-148410-0')).toBeNull();
      });

      it('retourne null si ISBN non fourni', () => {
        expect(validateISBN(undefined)).toBeNull();
      });
    });

    describe('validateNbPages', () => {
      it('retourne erreur si nombre de pages négatif', () => {
        expect(validateNbPages(-10)).toBe('Le nombre de pages doit être positif');
      });

      it('retourne erreur si nombre de pages trop élevé', () => {
        expect(validateNbPages(15000)).toBe('Le nombre de pages semble incorrect');
      });

      it('retourne null si nombre de pages valide', () => {
        expect(validateNbPages(250)).toBeNull();
        expect(validateNbPages(1)).toBeNull();
      });
    });

    describe('validateLivre', () => {
      it('retourne objet vide si livre valide', () => {
        const errors = validateLivre({
          isbn: '978-3-16-148410-0',
          nb_pages: 350
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('détecte ISBN invalide', () => {
        const errors = validateLivre({ isbn: '123' });
        expect(errors.isbn).toBeDefined();
      });
    });
  });

  describe('Type: Film', () => {
    describe('validateDureeMinutes', () => {
      it('retourne erreur si durée négative', () => {
        expect(validateDureeMinutes(-5)).toBe('La durée doit être positive');
      });

      it('retourne erreur si durée trop longue', () => {
        expect(validateDureeMinutes(1500)).toBe('La durée semble incorrecte (max 1000 minutes)');
      });

      it('retourne null si durée valide', () => {
        expect(validateDureeMinutes(120)).toBeNull();
        expect(validateDureeMinutes(90)).toBeNull();
      });
    });

    describe('validateRealisateur', () => {
      it('retourne erreur si nom trop court', () => {
        expect(validateRealisateur('A')).toBe('Le nom du réalisateur est trop court');
      });

      it('retourne null si nom valide', () => {
        expect(validateRealisateur('Mohamed Lakhdar-Hamina')).toBeNull();
      });
    });

    describe('validateFilm', () => {
      it('retourne objet vide si film valide', () => {
        const errors = validateFilm({
          duree_minutes: 120,
          realisateur: 'Merzak Allouache'
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });
    });
  });

  describe('Type: Article', () => {
    describe('validateAuteur', () => {
      it('retourne erreur si auteur trop court', () => {
        expect(validateAuteur('A')).toBe('Le nom de l\'auteur est trop court');
      });

      it('retourne null si auteur valide', () => {
        expect(validateAuteur('Ahmed Benali')).toBeNull();
      });
    });

    describe('validateUrlSource', () => {
      it('retourne erreur si URL invalide', () => {
        expect(validateUrlSource('pas-une-url')).toBe('URL invalide');
      });

      it('retourne null si URL valide', () => {
        expect(validateUrlSource('https://example.com/article')).toBeNull();
      });

      it('retourne null si URL non fournie', () => {
        expect(validateUrlSource(undefined)).toBeNull();
      });
    });

    describe('validateArticle', () => {
      it('retourne objet vide si article valide', () => {
        const errors = validateArticle({
          auteur: 'Fatima Zohra',
          source: 'El Watan',
          url_source: 'https://elwatan.com/article'
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });
    });
  });

  describe('Type: Article Scientifique (avec éditeur)', () => {
    describe('validateJournal', () => {
      it('retourne erreur si journal non fourni', () => {
        expect(validateJournal('')).toBe('Le nom du journal est requis');
        expect(validateJournal(undefined)).toBe('Le nom du journal est requis');
      });

      it('retourne null si journal valide', () => {
        expect(validateJournal('Nature')).toBeNull();
        expect(validateJournal('Revue Algérienne des Sciences')).toBeNull();
      });
    });

    describe('validateDOI', () => {
      it('retourne erreur si DOI invalide', () => {
        expect(validateDOI('invalid-doi')).toBe('Format DOI invalide (ex: 10.1234/example)');
        expect(validateDOI('11.1234/test')).toBe('Format DOI invalide (ex: 10.1234/example)');
      });

      it('retourne null si DOI valide', () => {
        expect(validateDOI('10.1234/example.2024')).toBeNull();
        expect(validateDOI('10.1000/xyz123')).toBeNull();
      });

      it('retourne null si DOI non fourni', () => {
        expect(validateDOI(undefined)).toBeNull();
      });
    });

    describe('validateVolume', () => {
      it('retourne erreur si volume non numérique', () => {
        expect(validateVolume('abc')).toBe('Le volume doit être un nombre');
      });

      it('retourne null si volume valide', () => {
        expect(validateVolume('12')).toBeNull();
        expect(validateVolume('1')).toBeNull();
      });
    });

    describe('validateNumero', () => {
      it('retourne erreur si numéro non numérique', () => {
        expect(validateNumero('xyz')).toBe('Le numéro doit être un nombre');
      });

      it('retourne null si numéro valide', () => {
        expect(validateNumero('4')).toBeNull();
      });
    });

    describe('validateEditeur', () => {
      it('retourne erreur si éditeur non sélectionné', () => {
        expect(validateEditeur(0)).toBe('L\'éditeur est requis pour un article scientifique');
        expect(validateEditeur(undefined)).toBe('L\'éditeur est requis pour un article scientifique');
      });

      it('retourne null si éditeur valide', () => {
        expect(validateEditeur(1)).toBeNull();
        expect(validateEditeur(5)).toBeNull();
      });
    });

    describe('validateArticleScientifique', () => {
      it('retourne erreurs si champs requis manquants', () => {
        const errors = validateArticleScientifique({});
        expect(errors.journal).toBe('Le nom du journal est requis');
        expect(errors.editeur_id).toBe('L\'éditeur est requis pour un article scientifique');
      });

      it('retourne objet vide si article scientifique valide', () => {
        const errors = validateArticleScientifique({
          journal: 'Revue Algérienne de Physique',
          doi: '10.1234/rap.2024.001',
          volume: '15',
          numero: '3',
          pages: '45-67',
          peer_reviewed: true,
          editeur_id: 1
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('détecte DOI invalide', () => {
        const errors = validateArticleScientifique({
          journal: 'Nature',
          doi: 'invalid',
          editeur_id: 1
        });
        expect(errors.doi).toBe('Format DOI invalide (ex: 10.1234/example)');
        expect(errors.journal).toBeUndefined();
      });
    });
  });

  describe('validateOeuvreBase', () => {
    it('retourne erreurs pour formulaire vide', () => {
      const errors = validateOeuvreBase({
        titre: { fr: '', ar: '', en: '' },
        description: { fr: '', ar: '', en: '' },
        id_type_oeuvre: 0,
        id_langue: 1,
        categories: [],
        tags: []
      });
      
      expect(errors.titre).toBeDefined();
      expect(errors.description).toBeDefined();
      expect(errors.id_type_oeuvre).toBeDefined();
    });

    it('retourne objet vide si base valide', () => {
      const errors = validateOeuvreBase({
        titre: { fr: 'Mon œuvre', ar: '', en: '' },
        description: { fr: 'Description de mon œuvre', ar: '', en: '' },
        id_type_oeuvre: 1,
        id_langue: 1,
        annee_creation: 2024,
        categories: [1, 2],
        tags: ['culture', 'algérie']
      });
      
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  // ============================================================================
  // TESTS POUR LE CHOIX DU MODE D'ÉDITION (Article / Article Scientifique)
  // ============================================================================

  describe('Mode d\'édition - Article Scientifique', () => {
    
    // Types d'œuvres qui supportent l'éditeur avancé
    const TYPES_AVEC_EDITEUR_AVANCE = ['Article', 'Article Scientifique'];
    
    // Fonction pour vérifier si un type supporte l'éditeur avancé
    const supportsAdvancedEditor = (typeNom: string): boolean => {
      return TYPES_AVEC_EDITEUR_AVANCE.includes(typeNom);
    };

    // Validation du mode d'édition
    type EditorMode = 'classique' | 'avance';
    
    interface EditorModeConfig {
      mode: EditorMode;
      typeOeuvre: string;
    }

    const validateEditorModeSelection = (config: EditorModeConfig): { valid: boolean; error?: string } => {
      // Vérifier que le type supporte l'éditeur avancé
      if (config.mode === 'avance' && !supportsAdvancedEditor(config.typeOeuvre)) {
        return { 
          valid: false, 
          error: `Le type "${config.typeOeuvre}" ne supporte pas l'éditeur avancé` 
        };
      }
      return { valid: true };
    };

    // Validation du contenu selon le mode
    interface ArticleContent {
      mode: EditorMode;
      // Mode classique
      resume?: string;
      // Mode avancé
      blocks?: ArticleBlock[];
    }

    interface ArticleBlock {
      type: 'heading' | 'paragraph' | 'image' | 'quote' | 'list' | 'code';
      content: string;
      level?: number; // Pour les headings
    }

    const validateArticleContent = (content: ArticleContent): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (content.mode === 'classique') {
        // Mode classique: résumé simple requis
        if (!content.resume || content.resume.length < 50) {
          errors.resume = 'Le résumé doit contenir au moins 50 caractères';
        }
      } else if (content.mode === 'avance') {
        // Mode avancé: au moins un bloc de contenu requis
        if (!content.blocks || content.blocks.length === 0) {
          errors.blocks = 'Au moins un bloc de contenu est requis';
        } else {
          // Vérifier qu'il y a du contenu non vide
          const hasContent = content.blocks.some(block => block.content.trim().length > 0);
          if (!hasContent) {
            errors.blocks = 'Le contenu ne peut pas être vide';
          }
        }
      }

      return errors;
    };

    // Validation des blocs de l'éditeur avancé
    const validateArticleBlock = (block: ArticleBlock): string | null => {
      if (!block.content || block.content.trim().length === 0) {
        return 'Le contenu du bloc est requis';
      }
      
      if (block.type === 'heading') {
        if (!block.level || block.level < 1 || block.level > 6) {
          return 'Le niveau de titre doit être entre 1 et 6';
        }
      }

      if (block.type === 'image') {
        // Vérifier que c'est une URL valide ou un chemin de fichier
        if (!block.content.startsWith('http') && !block.content.startsWith('/')) {
          return 'URL ou chemin d\'image invalide';
        }
      }

      return null;
    };

    describe('supportsAdvancedEditor', () => {
      it('retourne true pour Article', () => {
        expect(supportsAdvancedEditor('Article')).toBe(true);
      });

      it('retourne true pour Article Scientifique', () => {
        expect(supportsAdvancedEditor('Article Scientifique')).toBe(true);
      });

      it('retourne false pour Livre', () => {
        expect(supportsAdvancedEditor('Livre')).toBe(false);
      });

      it('retourne false pour Film', () => {
        expect(supportsAdvancedEditor('Film')).toBe(false);
      });

      it('retourne false pour Artisanat', () => {
        expect(supportsAdvancedEditor('Artisanat')).toBe(false);
      });
    });

    describe('validateEditorModeSelection', () => {
      it('accepte mode classique pour Article Scientifique', () => {
        const result = validateEditorModeSelection({
          mode: 'classique',
          typeOeuvre: 'Article Scientifique'
        });
        expect(result.valid).toBe(true);
      });

      it('accepte mode avancé pour Article Scientifique', () => {
        const result = validateEditorModeSelection({
          mode: 'avance',
          typeOeuvre: 'Article Scientifique'
        });
        expect(result.valid).toBe(true);
      });

      it('accepte mode avancé pour Article', () => {
        const result = validateEditorModeSelection({
          mode: 'avance',
          typeOeuvre: 'Article'
        });
        expect(result.valid).toBe(true);
      });

      it('rejette mode avancé pour Livre', () => {
        const result = validateEditorModeSelection({
          mode: 'avance',
          typeOeuvre: 'Livre'
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('ne supporte pas');
      });

      it('accepte mode classique pour tout type', () => {
        expect(validateEditorModeSelection({ mode: 'classique', typeOeuvre: 'Livre' }).valid).toBe(true);
        expect(validateEditorModeSelection({ mode: 'classique', typeOeuvre: 'Film' }).valid).toBe(true);
      });
    });

    describe('validateArticleContent - Mode Classique', () => {
      it('retourne erreur si résumé trop court', () => {
        const errors = validateArticleContent({
          mode: 'classique',
          resume: 'Trop court'
        });
        expect(errors.resume).toBe('Le résumé doit contenir au moins 50 caractères');
      });

      it('retourne erreur si résumé vide', () => {
        const errors = validateArticleContent({
          mode: 'classique',
          resume: ''
        });
        expect(errors.resume).toBeDefined();
      });

      it('retourne objet vide si résumé valide', () => {
        const errors = validateArticleContent({
          mode: 'classique',
          resume: 'Ceci est un résumé suffisamment long pour être valide et contient plus de 50 caractères.'
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });
    });

    describe('validateArticleContent - Mode Avancé (Éditeur)', () => {
      it('retourne erreur si aucun bloc', () => {
        const errors = validateArticleContent({
          mode: 'avance',
          blocks: []
        });
        expect(errors.blocks).toBe('Au moins un bloc de contenu est requis');
      });

      it('retourne erreur si blocs vides', () => {
        const errors = validateArticleContent({
          mode: 'avance',
          blocks: [
            { type: 'paragraph', content: '' },
            { type: 'paragraph', content: '   ' }
          ]
        });
        expect(errors.blocks).toBe('Le contenu ne peut pas être vide');
      });

      it('retourne objet vide si blocs valides', () => {
        const errors = validateArticleContent({
          mode: 'avance',
          blocks: [
            { type: 'heading', content: 'Introduction', level: 1 },
            { type: 'paragraph', content: 'Contenu de l\'article scientifique...' }
          ]
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('accepte différents types de blocs', () => {
        const errors = validateArticleContent({
          mode: 'avance',
          blocks: [
            { type: 'heading', content: 'Titre', level: 1 },
            { type: 'paragraph', content: 'Paragraphe' },
            { type: 'quote', content: 'Citation importante' },
            { type: 'list', content: 'Item 1\nItem 2\nItem 3' },
            { type: 'code', content: 'const x = 1;' }
          ]
        });
        expect(Object.keys(errors)).toHaveLength(0);
      });
    });

    describe('validateArticleBlock', () => {
      it('retourne erreur si contenu vide', () => {
        expect(validateArticleBlock({ type: 'paragraph', content: '' })).toBe('Le contenu du bloc est requis');
      });

      it('retourne erreur si niveau heading invalide', () => {
        expect(validateArticleBlock({ type: 'heading', content: 'Titre', level: 0 })).toBe('Le niveau de titre doit être entre 1 et 6');
        expect(validateArticleBlock({ type: 'heading', content: 'Titre', level: 7 })).toBe('Le niveau de titre doit être entre 1 et 6');
      });

      it('retourne null si heading valide', () => {
        expect(validateArticleBlock({ type: 'heading', content: 'Titre', level: 1 })).toBeNull();
        expect(validateArticleBlock({ type: 'heading', content: 'Sous-titre', level: 2 })).toBeNull();
      });

      it('retourne erreur si URL image invalide', () => {
        expect(validateArticleBlock({ type: 'image', content: 'pas-une-url' })).toBe('URL ou chemin d\'image invalide');
      });

      it('retourne null si URL image valide', () => {
        expect(validateArticleBlock({ type: 'image', content: 'https://example.com/image.jpg' })).toBeNull();
        expect(validateArticleBlock({ type: 'image', content: '/uploads/image.png' })).toBeNull();
      });

      it('retourne null pour paragraphe valide', () => {
        expect(validateArticleBlock({ type: 'paragraph', content: 'Contenu du paragraphe' })).toBeNull();
      });

      it('retourne null pour citation valide', () => {
        expect(validateArticleBlock({ type: 'quote', content: 'Une citation importante' })).toBeNull();
      });

      it('retourne null pour code valide', () => {
        expect(validateArticleBlock({ type: 'code', content: 'console.log("test");' })).toBeNull();
      });
    });
  });
});
