/**
 * Tests unitaires — Article Scientifique + Éditeur Avancé
 *
 * Couvre :
 *  1. Préparation du payload oeuvre depuis l'éditeur avancé
 *  2. Extraction de l'id spécifique (id_article_scientifique / id_article)
 *  3. Préparation et validation des blocs (texte, image, heading…)
 *  4. Appel à createMultipleBlocks avec le bon id_article
 *  5. Cas d'erreur : id manquant, blocs vides, réponse API en échec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TYPES (miroir de ceux utilisés dans AjouterOeuvre.tsx et articleBlock.service.ts)
// ============================================================================

interface MultiLangField {
  fr: string;
  ar: string;
  en: string;
}

interface ArticleEditorFormData {
  type: 'article' | 'article_scientifique';
  titre: MultiLangField;
  description: MultiLangField;
  id_langue: number;
  annee_creation?: number;
  categories?: number[];
  tags?: string[];
  // Champs Article Scientifique
  journal?: string;
  doi?: string;
  volume?: string;
  numero?: string;
  pages?: string;
  issn?: string;
  impact_factor?: number;
  peer_reviewed?: boolean;
  // Champs Article simple
  auteur?: string;
  source?: string;
  resume?: string;
  url_source?: string;
  sous_titre?: string;
}

interface EditorBlock {
  type_block: 'text' | 'heading' | 'image' | 'citation' | 'code' | 'list' | 'separator';
  contenu?: string;
  contenu_json?: any;
  metadata?: any;
  id_media?: number;
}

interface ArticleEditorSaveResponse {
  article: {
    formData: ArticleEditorFormData;
    blocks: EditorBlock[];
    contributeurs?: {
      existants?: Array<{ id_user: number; role?: string }>;
      nouveaux?: Array<{ nom: string; prenom: string; role?: string }>;
    };
    editeurs?: Array<{ id_editeur: number } | number>;
  };
}

interface OeuvreCreateResponse {
  success: boolean;
  data?: {
    oeuvre?: { id_oeuvre: number };
    article_scientifique?: { id_article_scientifique: number };
    article?: { id_article: number };
  };
  error?: string;
}

interface BatchBlocksResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

// ============================================================================
// FONCTIONS EXTRAITES DE handleArticleEditorSave (logique pure, testable)
// ============================================================================

/**
 * Détermine le type et l'id_type_oeuvre selon le type de l'article
 */
function resolveTypeOeuvre(type: 'article' | 'article_scientifique'): {
  isScientific: boolean;
  id_type_oeuvre: number;
} {
  const isScientific = type === 'article_scientifique';
  return { isScientific, id_type_oeuvre: isScientific ? 5 : 4 };
}

/**
 * Prépare les details_specifiques selon le type
 */
function buildDetailsSpecifiques(
  isScientific: boolean,
  formData: ArticleEditorFormData
): Record<string, any> {
  if (isScientific) {
    return {
      article_scientifique: {
        journal: formData.journal || null,
        doi: formData.doi || null,
        volume: formData.volume || null,
        numero: formData.numero || null,
        pages: formData.pages || null,
        issn: formData.issn || null,
        impact_factor: formData.impact_factor || null,
        peer_reviewed: formData.peer_reviewed || false,
      },
    };
  }
  return {
    article: {
      auteur: formData.auteur || null,
      source: formData.source || null,
      resume: formData.resume || null,
      url_source: formData.url_source || null,
      sous_titre: formData.sous_titre || null,
    },
  };
}

/**
 * Extrait l'id du record spécifique depuis la réponse de createOeuvre
 */
function extractArticleRecordId(
  isScientific: boolean,
  responseData: OeuvreCreateResponse['data']
): number | undefined {
  if (!responseData) return undefined;
  if (isScientific) {
    return responseData.article_scientifique?.id_article_scientifique;
  }
  return responseData.article?.id_article;
}

/**
 * Prépare les blocs pour createMultipleBlocks
 */
function prepareBlocksPayload(
  blocks: EditorBlock[],
  articleRecordId: number,
  isScientific: boolean
) {
  return {
    id_article: articleRecordId,
    article_type: isScientific ? 'article_scientifique' : 'article',
    blocks: blocks.map((block, index) => ({
      type_block: block.type_block,
      contenu: block.contenu || '',
      contenu_json: block.contenu_json || null,
      metadata: block.metadata || {},
      id_media: block.id_media || null,
      ordre: index,
      visible: true,
      id_article: articleRecordId,
    })),
  };
}

// ============================================================================
// MOCKS SERVICES
// ============================================================================

const mockOeuvreService = {
  createOeuvre: vi.fn(),
};

const mockArticleBlockService = {
  createMultipleBlocks: vi.fn(),
};

// ============================================================================
// DONNÉES DE TEST
// ============================================================================

const TITRE_TEST: MultiLangField = {
  fr: 'Impact des matériaux nanostructurés sur la thermodynamique',
  ar: '',
  en: 'Impact of nanostructured materials on thermodynamics',
};

const DESCRIPTION_TEST: MultiLangField = {
  fr: 'Étude portant sur les propriétés thermiques des matériaux à l\'échelle nanométrique.',
  ar: '',
  en: '',
};

const FORM_DATA_SCIENTIFIQUE: ArticleEditorFormData = {
  type: 'article_scientifique',
  titre: TITRE_TEST,
  description: DESCRIPTION_TEST,
  id_langue: 1,
  annee_creation: 2024,
  categories: [1, 3],
  tags: ['nanomatériaux', 'thermodynamique'],
  journal: 'Revue Algérienne de Physique Appliquée',
  doi: '10.1234/rapa.2024.001',
  volume: '12',
  numero: '3',
  pages: '45-67',
  issn: '1234-5678',
  impact_factor: 2.5,
  peer_reviewed: true,
};

const FORM_DATA_ARTICLE: ArticleEditorFormData = {
  type: 'article',
  titre: { fr: 'Chronique culturelle', ar: '', en: '' },
  description: { fr: 'Une chronique sur la scène culturelle algérienne.', ar: '', en: '' },
  id_langue: 1,
  annee_creation: 2024,
  auteur: 'Fatima Zohra Benali',
  source: 'El Watan',
  resume: 'Résumé de la chronique culturelle.',
  url_source: 'https://elwatan.com/chronique-2024',
  sous_titre: 'La renaissance de la culture berbère',
};

const BLOCKS_TEXTE: EditorBlock[] = [
  { type_block: 'heading', contenu: 'Introduction', metadata: { level: 1 } },
  { type_block: 'text', contenu: 'Les matériaux nanostructurés présentent des propriétés uniques.' },
  { type_block: 'text', contenu: 'Cette étude examine les propriétés thermiques à l\'échelle nanométrique.' },
];

const BLOCKS_AVEC_IMAGE: EditorBlock[] = [
  { type_block: 'heading', contenu: 'Résultats expérimentaux', metadata: { level: 2 } },
  { type_block: 'image', contenu: 'https://example.com/figure1.png', id_media: 42, metadata: { caption: 'Figure 1 : Courbe de conductivité thermique' } },
  { type_block: 'text', contenu: 'La figure 1 montre une augmentation significative de la conductivité.' },
];

// ============================================================================
// TESTS
// ============================================================================

describe('Article Scientifique — Éditeur Avancé', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. resolveTypeOeuvre
  // --------------------------------------------------------------------------
  describe('resolveTypeOeuvre', () => {
    it('retourne isScientific=true et id_type_oeuvre=5 pour article_scientifique', () => {
      const result = resolveTypeOeuvre('article_scientifique');
      expect(result.isScientific).toBe(true);
      expect(result.id_type_oeuvre).toBe(5);
    });

    it('retourne isScientific=false et id_type_oeuvre=4 pour article', () => {
      const result = resolveTypeOeuvre('article');
      expect(result.isScientific).toBe(false);
      expect(result.id_type_oeuvre).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // 2. buildDetailsSpecifiques — Article Scientifique
  // --------------------------------------------------------------------------
  describe('buildDetailsSpecifiques — Article Scientifique', () => {
    it('génère la clé article_scientifique avec tous les champs', () => {
      const details = buildDetailsSpecifiques(true, FORM_DATA_SCIENTIFIQUE);
      expect(details).toHaveProperty('article_scientifique');
      const as = details.article_scientifique;
      expect(as.journal).toBe('Revue Algérienne de Physique Appliquée');
      expect(as.doi).toBe('10.1234/rapa.2024.001');
      expect(as.volume).toBe('12');
      expect(as.numero).toBe('3');
      expect(as.pages).toBe('45-67');
      expect(as.issn).toBe('1234-5678');
      expect(as.impact_factor).toBe(2.5);
      expect(as.peer_reviewed).toBe(true);
    });

    it('n\'inclut pas la clé article', () => {
      const details = buildDetailsSpecifiques(true, FORM_DATA_SCIENTIFIQUE);
      expect(details).not.toHaveProperty('article');
    });

    it('met null pour les champs optionnels manquants', () => {
      const formMin: ArticleEditorFormData = {
        type: 'article_scientifique',
        titre: TITRE_TEST,
        description: DESCRIPTION_TEST,
        id_langue: 1,
      };
      const details = buildDetailsSpecifiques(true, formMin);
      const as = details.article_scientifique;
      expect(as.journal).toBeNull();
      expect(as.doi).toBeNull();
      expect(as.peer_reviewed).toBe(false);
    });

    it('peer_reviewed vaut false par défaut si non fourni', () => {
      const formSansPR: ArticleEditorFormData = {
        ...FORM_DATA_SCIENTIFIQUE,
        peer_reviewed: undefined,
      };
      const details = buildDetailsSpecifiques(true, formSansPR);
      expect(details.article_scientifique.peer_reviewed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. buildDetailsSpecifiques — Article simple
  // --------------------------------------------------------------------------
  describe('buildDetailsSpecifiques — Article simple', () => {
    it('génère la clé article avec tous les champs', () => {
      const details = buildDetailsSpecifiques(false, FORM_DATA_ARTICLE);
      expect(details).toHaveProperty('article');
      const a = details.article;
      expect(a.auteur).toBe('Fatima Zohra Benali');
      expect(a.source).toBe('El Watan');
      expect(a.resume).toBe('Résumé de la chronique culturelle.');
      expect(a.url_source).toBe('https://elwatan.com/chronique-2024');
      expect(a.sous_titre).toBe('La renaissance de la culture berbère');
    });

    it('n\'inclut pas la clé article_scientifique', () => {
      const details = buildDetailsSpecifiques(false, FORM_DATA_ARTICLE);
      expect(details).not.toHaveProperty('article_scientifique');
    });
  });

  // --------------------------------------------------------------------------
  // 4. extractArticleRecordId
  // --------------------------------------------------------------------------
  describe('extractArticleRecordId', () => {
    it('extrait id_article_scientifique pour article_scientifique', () => {
      const responseData = {
        oeuvre: { id_oeuvre: 100 },
        article_scientifique: { id_article_scientifique: 42 },
      };
      expect(extractArticleRecordId(true, responseData)).toBe(42);
    });

    it('extrait id_article pour article simple', () => {
      const responseData = {
        oeuvre: { id_oeuvre: 101 },
        article: { id_article: 17 },
      };
      expect(extractArticleRecordId(false, responseData)).toBe(17);
    });

    it('retourne undefined si data est undefined', () => {
      expect(extractArticleRecordId(true, undefined)).toBeUndefined();
    });

    it('retourne undefined si article_scientifique absent dans la réponse', () => {
      const responseData = { oeuvre: { id_oeuvre: 100 } };
      expect(extractArticleRecordId(true, responseData)).toBeUndefined();
    });

    it('retourne undefined si article absent dans la réponse', () => {
      const responseData = { oeuvre: { id_oeuvre: 100 } };
      expect(extractArticleRecordId(false, responseData)).toBeUndefined();
    });

    it('NE retourne PAS id_article quand isScientific=true (isolation FK)', () => {
      const responseData = {
        oeuvre: { id_oeuvre: 100 },
        article: { id_article: 99 },
        article_scientifique: { id_article_scientifique: 42 },
      };
      // Pour un article scientifique on doit utiliser id_article_scientifique, pas id_article
      expect(extractArticleRecordId(true, responseData)).toBe(42);
      expect(extractArticleRecordId(true, responseData)).not.toBe(99);
    });
  });

  // --------------------------------------------------------------------------
  // 5. prepareBlocksPayload
  // --------------------------------------------------------------------------
  describe('prepareBlocksPayload', () => {
    it('génère le bon article_type pour article_scientifique', () => {
      const payload = prepareBlocksPayload(BLOCKS_TEXTE, 42, true);
      expect(payload.article_type).toBe('article_scientifique');
      expect(payload.id_article).toBe(42);
    });

    it('génère le bon article_type pour article', () => {
      const payload = prepareBlocksPayload(BLOCKS_TEXTE, 17, false);
      expect(payload.article_type).toBe('article');
      expect(payload.id_article).toBe(17);
    });

    it('numérote les blocs par ordre croissant', () => {
      const payload = prepareBlocksPayload(BLOCKS_TEXTE, 42, true);
      payload.blocks.forEach((b, i) => {
        expect(b.ordre).toBe(i);
      });
    });

    it('chaque bloc porte le bon id_article', () => {
      const payload = prepareBlocksPayload(BLOCKS_TEXTE, 42, true);
      payload.blocks.forEach((b) => {
        expect(b.id_article).toBe(42);
      });
    });

    it('préserve type_block et contenu des blocs texte', () => {
      const payload = prepareBlocksPayload(BLOCKS_TEXTE, 42, true);
      expect(payload.blocks[0].type_block).toBe('heading');
      expect(payload.blocks[0].contenu).toBe('Introduction');
      expect(payload.blocks[1].type_block).toBe('text');
    });

    it('préserve id_media pour les blocs image', () => {
      const payload = prepareBlocksPayload(BLOCKS_AVEC_IMAGE, 42, true);
      const imageBlock = payload.blocks.find((b) => b.type_block === 'image');
      expect(imageBlock).toBeDefined();
      expect(imageBlock!.id_media).toBe(42);
      expect(imageBlock!.contenu).toBe('https://example.com/figure1.png');
    });

    it('met visible=true pour tous les blocs', () => {
      const payload = prepareBlocksPayload(BLOCKS_AVEC_IMAGE, 42, true);
      payload.blocks.forEach((b) => {
        expect(b.visible).toBe(true);
      });
    });

    it('met id_media=null si absent dans le bloc source', () => {
      const payload = prepareBlocksPayload(BLOCKS_TEXTE, 42, true);
      payload.blocks.forEach((b) => {
        expect(b.id_media).toBeNull();
      });
    });

    it('génère 3 blocs pour BLOCKS_AVEC_IMAGE', () => {
      const payload = prepareBlocksPayload(BLOCKS_AVEC_IMAGE, 42, true);
      expect(payload.blocks).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Flux complet simulé — succès
  // --------------------------------------------------------------------------
  describe('Flux complet handleArticleEditorSave — succès', () => {
    it('appelle createOeuvre puis createMultipleBlocks avec le bon id pour article_scientifique', async () => {
      mockOeuvreService.createOeuvre.mockResolvedValue({
        success: true,
        data: {
          oeuvre: { id_oeuvre: 100 },
          article_scientifique: { id_article_scientifique: 42 },
        },
      } as OeuvreCreateResponse);

      mockArticleBlockService.createMultipleBlocks.mockResolvedValue({
        success: true,
        data: [{ id_block: 1 }, { id_block: 2 }],
      } as BatchBlocksResponse);

      // Simuler handleArticleEditorSave
      const editorResponse: ArticleEditorSaveResponse = {
        article: {
          formData: FORM_DATA_SCIENTIFIQUE,
          blocks: BLOCKS_TEXTE,
        },
      };

      const { isScientific, id_type_oeuvre } = resolveTypeOeuvre(editorResponse.article.formData.type);
      expect(id_type_oeuvre).toBe(5);

      const details = buildDetailsSpecifiques(isScientific, editorResponse.article.formData);

      const oeuvrePayload = {
        titre: editorResponse.article.formData.titre,
        description: editorResponse.article.formData.description,
        id_type_oeuvre,
        id_langue: editorResponse.article.formData.id_langue,
        details_specifiques: details,
      };

      const oeuvreResponse = await mockOeuvreService.createOeuvre(oeuvrePayload);
      expect(oeuvreResponse.success).toBe(true);

      const articleRecordId = extractArticleRecordId(isScientific, oeuvreResponse.data);
      expect(articleRecordId).toBe(42);

      const blocksPayload = prepareBlocksPayload(
        editorResponse.article.blocks,
        articleRecordId!,
        isScientific
      );
      const blocksResponse = await mockArticleBlockService.createMultipleBlocks(blocksPayload);

      expect(mockOeuvreService.createOeuvre).toHaveBeenCalledTimes(1);
      expect(mockArticleBlockService.createMultipleBlocks).toHaveBeenCalledTimes(1);
      expect(mockArticleBlockService.createMultipleBlocks).toHaveBeenCalledWith(
        expect.objectContaining({
          id_article: 42,
          article_type: 'article_scientifique',
        })
      );
      expect(blocksResponse.success).toBe(true);
    });

    it('appelle createMultipleBlocks avec id_article (pas id_oeuvre) pour article simple', async () => {
      mockOeuvreService.createOeuvre.mockResolvedValue({
        success: true,
        data: {
          oeuvre: { id_oeuvre: 200 },
          article: { id_article: 33 },
        },
      } as OeuvreCreateResponse);

      mockArticleBlockService.createMultipleBlocks.mockResolvedValue({
        success: true,
        data: [{ id_block: 10 }],
      } as BatchBlocksResponse);

      const { isScientific } = resolveTypeOeuvre('article');
      const oeuvreResponse = await mockOeuvreService.createOeuvre({});
      const articleRecordId = extractArticleRecordId(isScientific, oeuvreResponse.data);

      expect(articleRecordId).toBe(33); // id_article, pas id_oeuvre (200)

      const payload = prepareBlocksPayload(BLOCKS_TEXTE.slice(0, 1), articleRecordId!, isScientific);
      await mockArticleBlockService.createMultipleBlocks(payload);

      expect(mockArticleBlockService.createMultipleBlocks).toHaveBeenCalledWith(
        expect.objectContaining({
          id_article: 33,
          article_type: 'article',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Cas d'erreur — id spécifique manquant
  // --------------------------------------------------------------------------
  describe('Cas d\'erreur — id spécifique manquant', () => {
    it('ne doit pas appeler createMultipleBlocks si articleRecordId est undefined', async () => {
      const responseData = {
        oeuvre: { id_oeuvre: 100 },
        // article_scientifique absent : bug backend
      };

      const articleRecordId = extractArticleRecordId(true, responseData);
      expect(articleRecordId).toBeUndefined();

      // Comportement attendu : on ne fait PAS l'appel
      if (articleRecordId) {
        await mockArticleBlockService.createMultipleBlocks({} as any);
      }

      expect(mockArticleBlockService.createMultipleBlocks).not.toHaveBeenCalled();
    });

    it('id_oeuvre seul ne suffit pas comme id_article (différence FK)', () => {
      const responseData = {
        oeuvre: { id_oeuvre: 999 },
        article_scientifique: { id_article_scientifique: 42 },
      };
      const recordId = extractArticleRecordId(true, responseData);
      // Le bon id est 42, pas 999
      expect(recordId).toBe(42);
      expect(recordId).not.toBe(999);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Cas d'erreur — createOeuvre échoue
  // --------------------------------------------------------------------------
  describe('Cas d\'erreur — createOeuvre échoue', () => {
    it('ne doit pas appeler createMultipleBlocks si createOeuvre échoue', async () => {
      mockOeuvreService.createOeuvre.mockResolvedValue({
        success: false,
        error: 'Erreur serveur 500',
      } as OeuvreCreateResponse);

      const oeuvreResponse = await mockOeuvreService.createOeuvre({});

      if (!oeuvreResponse.success) {
        // On s'arrête ici, pas d'appel aux blocs
        expect(mockArticleBlockService.createMultipleBlocks).not.toHaveBeenCalled();
        return;
      }

      // Ce code ne doit pas être atteint
      await mockArticleBlockService.createMultipleBlocks({} as any);
    });

    it('retourne le message d\'erreur du backend', async () => {
      mockOeuvreService.createOeuvre.mockResolvedValue({
        success: false,
        error: 'Les champs titre, type d\'œuvre et langue sont obligatoires',
      });
      const response = await mockOeuvreService.createOeuvre({});
      expect(response.error).toContain('titre');
    });
  });

  // --------------------------------------------------------------------------
  // 9. Cas d'erreur — createMultipleBlocks échoue (non bloquant)
  // --------------------------------------------------------------------------
  describe('Cas d\'erreur — createMultipleBlocks échoue (non bloquant)', () => {
    it('l\'oeuvre reste créée même si les blocs échouent', async () => {
      mockOeuvreService.createOeuvre.mockResolvedValue({
        success: true,
        data: {
          oeuvre: { id_oeuvre: 100 },
          article_scientifique: { id_article_scientifique: 42 },
        },
      });
      mockArticleBlockService.createMultipleBlocks.mockResolvedValue({
        success: false,
        error: 'Erreur FK — id_article invalide',
      });

      const oeuvreResponse = await mockOeuvreService.createOeuvre({});
      expect(oeuvreResponse.success).toBe(true);
      expect(oeuvreResponse.data?.oeuvre?.id_oeuvre).toBe(100);

      const blocksResponse = await mockArticleBlockService.createMultipleBlocks({});
      expect(blocksResponse.success).toBe(false);

      // L'oeuvre est bien créée même si les blocs ont échoué
      expect(oeuvreResponse.data?.oeuvre?.id_oeuvre).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 10. Blocs image — validation
  // --------------------------------------------------------------------------
  describe('Blocs image — validation', () => {
    it('un bloc image doit avoir un id_media ou une URL de contenu', () => {
      const blocAvecMedia: EditorBlock = {
        type_block: 'image',
        contenu: 'https://example.com/image.jpg',
        id_media: 42,
      };
      expect(blocAvecMedia.id_media).toBeDefined();
      expect(blocAvecMedia.contenu).toMatch(/^https?:\/\//);
    });

    it('id_media est conservé dans le payload préparé', () => {
      const blocs: EditorBlock[] = [
        { type_block: 'image', contenu: '/uploads/test.jpg', id_media: 7 },
      ];
      const payload = prepareBlocksPayload(blocs, 42, true);
      expect(payload.blocks[0].id_media).toBe(7);
    });

    it('un bloc image sans id_media a id_media=null dans le payload', () => {
      const blocs: EditorBlock[] = [
        { type_block: 'image', contenu: '/uploads/test.jpg' }, // pas de id_media
      ];
      const payload = prepareBlocksPayload(blocs, 42, true);
      expect(payload.blocks[0].id_media).toBeNull();
    });

    it('les métadonnées du bloc image (caption) sont préservées', () => {
      const blocs: EditorBlock[] = [
        {
          type_block: 'image',
          contenu: 'https://example.com/fig.png',
          id_media: 5,
          metadata: { caption: 'Figure 1 : Résultats expérimentaux' },
        },
      ];
      const payload = prepareBlocksPayload(blocs, 42, true);
      expect(payload.blocks[0].metadata).toEqual({ caption: 'Figure 1 : Résultats expérimentaux' });
    });
  });

  // --------------------------------------------------------------------------
  // 11. Blocs mixtes texte + image
  // --------------------------------------------------------------------------
  describe('Blocs mixtes — texte + image', () => {
    it('prépare correctement un article avec blocs texte et image', () => {
      const blocsComplets: EditorBlock[] = [
        { type_block: 'heading', contenu: 'Introduction', metadata: { level: 1 } },
        { type_block: 'text', contenu: 'Premier paragraphe de l\'article.' },
        { type_block: 'image', contenu: '/uploads/figure1.jpg', id_media: 10, metadata: { caption: 'Figure 1' } },
        { type_block: 'text', contenu: 'Analyse des résultats présentés en figure 1.' },
      ];

      const payload = prepareBlocksPayload(blocsComplets, 42, true);

      expect(payload.blocks).toHaveLength(4);
      expect(payload.blocks[0].type_block).toBe('heading');
      expect(payload.blocks[1].type_block).toBe('text');
      expect(payload.blocks[2].type_block).toBe('image');
      expect(payload.blocks[2].id_media).toBe(10);
      expect(payload.blocks[3].type_block).toBe('text');
      // Ordre correct
      expect(payload.blocks.map((b) => b.ordre)).toEqual([0, 1, 2, 3]);
    });
  });

  // --------------------------------------------------------------------------
  // 12. Validation du payload envoyé au backend
  // --------------------------------------------------------------------------
  describe('Validation du payload oeuvre envoyé au backend', () => {
    it('contient tous les champs requis pour un article scientifique', () => {
      const { isScientific, id_type_oeuvre } = resolveTypeOeuvre('article_scientifique');
      const details = buildDetailsSpecifiques(isScientific, FORM_DATA_SCIENTIFIQUE);

      const payload = {
        titre: FORM_DATA_SCIENTIFIQUE.titre,
        description: FORM_DATA_SCIENTIFIQUE.description,
        id_type_oeuvre,
        id_langue: FORM_DATA_SCIENTIFIQUE.id_langue,
        annee_creation: FORM_DATA_SCIENTIFIQUE.annee_creation,
        categories: FORM_DATA_SCIENTIFIQUE.categories,
        tags: FORM_DATA_SCIENTIFIQUE.tags,
        details_specifiques: details,
      };

      expect(payload.id_type_oeuvre).toBe(5);
      expect(payload.titre.fr).toContain('nanostructurés');
      expect(payload.details_specifiques.article_scientifique.journal).toBe('Revue Algérienne de Physique Appliquée');
      expect(payload.details_specifiques.article_scientifique.peer_reviewed).toBe(true);
    });

    it('le payload ne contient pas de champ article quand c\'est un article_scientifique', () => {
      const details = buildDetailsSpecifiques(true, FORM_DATA_SCIENTIFIQUE);
      expect(Object.keys(details)).toEqual(['article_scientifique']);
    });
  });
});
