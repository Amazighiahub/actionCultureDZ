/**
 * patrimoineArticles.service.ts
 * ----------------------------------------------------------------------------
 * Service dedie aux blocs riches (article_block) attaches a un lieu patrimoine
 * via le mapping polymorphique :
 *   article_type      = 'patrimoine'
 *   id_article        = id_lieu
 *   section_patrimoine = 'histoire' | 'architecture' | ...
 *
 * Endpoints backend (backend/routes/patrimoineRoutes.js) :
 *   GET    /patrimoine/:id/articles?section=...   (public)
 *   POST   /patrimoine/:id/articles               (auth)
 *   DELETE /patrimoine/:id/articles/:blockId      (auth)
 *
 * Note : ce service est volontairement separe de articleBlock.service.ts
 * (qui gere les blocs lies aux Oeuvres Article/ArticleScientifique) pour
 * eviter toute regression sur le flow d'edition d'oeuvres.
 * ----------------------------------------------------------------------------
 */
import { ApiResponse, API_ENDPOINTS } from '@/config/api';
import { httpClient } from './httpClient';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sections culturelles documentees pour un lieu patrimoine.
 * Doit rester strictement aligne avec la validation backend
 * (backend/routes/patrimoineRoutes.js, isIn([...])).
 */
export const PATRIMOINE_SECTIONS = [
  'histoire',
  'architecture',
  'traditions',
  'gastronomie',
  'artisanat_local',
  'personnalites',
  'infos_pratiques',
  'referencesHistoriques',
] as const;

export type PatrimoineSection = (typeof PATRIMOINE_SECTIONS)[number];

/**
 * Types de blocs riches supportes (alignes avec ENUM article_block.type_block).
 */
export type PatrimoineBlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'citation'
  | 'code'
  | 'list'
  | 'table'
  | 'separator'
  | 'embed';

/**
 * Bloc tel que renvoye par le backend.
 */
export interface PatrimoineBlock {
  id_block: number;
  id_article: number;            // = id_lieu
  article_type: 'patrimoine';
  section_patrimoine: PatrimoineSection;
  type_block: PatrimoineBlockType;
  contenu?: string | null;
  contenu_json?: Record<string, unknown> | unknown[] | null;
  id_media?: number | null;
  ordre: number;
  metadata?: Record<string, unknown> | null;
  visible: boolean;
  date_creation?: string;
  date_modification?: string;
  media?: {
    id_media: number;
    url: string;
    titre?: string;
    description?: string;
  } | null;
}

/**
 * Payload pour creer un nouveau bloc dans une section.
 * Le backend deduit automatiquement :
 *   - id_article = parseInt(req.params.id) (id_lieu)
 *   - article_type = 'patrimoine'
 *   - ordre = max(ordre) + 1
 *   - visible = true
 *   - sanitization XSS via sanitizeBlockContent()
 */
export interface CreatePatrimoineBlockPayload {
  type_block: PatrimoineBlockType;
  section_patrimoine: PatrimoineSection;
  contenu?: string;
  contenu_json?: Record<string, unknown> | unknown[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SERVICE
// ============================================================================

class PatrimoineArticlesService {
  /**
   * Recupere les blocs d'un lieu, optionnellement filtres par section.
   *
   * Cote backend, les blocs sont tries (section ASC, ordre ASC) et incluent
   * la relation media. Aucune authentification requise.
   */
  async getBlocks(
    lieuId: number,
    section?: PatrimoineSection
  ): Promise<ApiResponse<PatrimoineBlock[]>> {
    try {
      const params = section ? { section } : undefined;
      return await httpClient.get<PatrimoineBlock[]>(
        API_ENDPOINTS.patrimoine.sectionArticles(lieuId),
        params
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Cree un nouveau bloc dans une section donnee.
   *
   * Necessite une authentification. Le backend incremente automatiquement
   * `nb_contributions` et met a jour `id_dernier_contributeur` sur DetailLieu.
   */
  async createBlock(
    lieuId: number,
    payload: CreatePatrimoineBlockPayload
  ): Promise<ApiResponse<PatrimoineBlock>> {
    try {
      return await httpClient.post<PatrimoineBlock>(
        API_ENDPOINTS.patrimoine.sectionArticles(lieuId),
        payload
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Supprime un bloc. Le backend verifie que le bloc appartient bien
   * au lieu indique et qu'il a article_type='patrimoine'.
   */
  async deleteBlock(
    lieuId: number,
    blockId: number
  ): Promise<ApiResponse<void>> {
    try {
      return await httpClient.delete<void>(
        API_ENDPOINTS.patrimoine.sectionArticleDelete(lieuId, blockId)
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Helper : cree plusieurs blocs en sequence (le backend n'a pas de batch
   * pour le patrimoine, contrairement aux oeuvres).
   *
   * Renvoie la liste des resultats individuels. Si un bloc echoue, les
   * suivants ne sont pas crees (fail-fast pour eviter les ordres incoherents).
   */
  async createBlocksSequential(
    lieuId: number,
    blocks: CreatePatrimoineBlockPayload[]
  ): Promise<ApiResponse<PatrimoineBlock[]>> {
    const created: PatrimoineBlock[] = [];

    for (const block of blocks) {
      const result = await this.createBlock(lieuId, block);
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Erreur lors de la creation d\'un bloc',
          data: created.length > 0 ? created : undefined,
        };
      }
      created.push(result.data);
    }

    return { success: true, data: created };
  }
}

export const patrimoineArticlesService = new PatrimoineArticlesService();

// ============================================================================
// PAGES DÉTAILLÉES : articles de l'éditeur avancé reliés à une section
// ============================================================================

type TexteMulti = string | Record<string, string | undefined> | null;

/** Carte « En savoir plus » : article relié à une page (lieu ou personnalité) */
export interface CarteArticle {
  /** Identifiant du lien (pour le retirer de la page) */
  id_lien: number;
  id_oeuvre: number;
  id_type_oeuvre: number;
  titre: TexteMulti;
  resume: TexteMulti;
  image: string | null;
  statut: 'publie' | 'brouillon' | 'en_attente' | 'rejete' | string;
  peut_retirer: boolean;
}

/** Article relié à une section du lieu (GET /patrimoine/:id/pages) */
export interface PagePatrimoine extends CarteArticle {
  section_patrimoine: PatrimoineSection;
}

/** Pages visibles par la personne connectée (publiées, ou les siennes en attente) */
export async function getPagesPatrimoine(lieuId: number): Promise<PagePatrimoine[]> {
  try {
    const res = await httpClient.get<PagePatrimoine[]>(`/patrimoine/${lieuId}/pages`);
    return res.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export function retirerPagePatrimoine(lieuId: number, lieuOeuvreId: number): Promise<ApiResponse<void>> {
  return httpClient.delete<void>(`/patrimoine/${lieuId}/pages/${lieuOeuvreId}`);
}

/** Éditeur avancé, pour un article qui sera relié à cette section du lieu */
export const lienEcrirePage = (lieuId: number, section: PatrimoineSection) =>
  `/ajouter-oeuvre?lieu=${lieuId}&section=${section}`;

// ============================================================================
// PAGE D'UNE PERSONNALITÉ : fiche, lieux liés, articles qui lui sont consacrés
// ============================================================================

export interface PagePersonnaliteData {
  intervenant: {
    id_intervenant: number;
    nom: TexteMulti;
    prenom: TexteMulti;
    titre_professionnel?: string | null;
    biographie?: TexteMulti;
    photo_url?: string | null;
    wikipedia_url?: string | null;
    date_naissance?: string | null;
    lieu_naissance?: string | null;
    date_deces?: string | null;
    lieu_deces?: string | null;
  };
  lieux: Array<{ id_lieu: number; nom: TexteMulti; typePatrimoine?: string; role_sur_site?: string | null; periode?: string | null; contexte?: string | null }>;
  articles: CarteArticle[];
}

export function getPagePersonnalite(id: number): Promise<ApiResponse<PagePersonnaliteData>> {
  return httpClient.get<PagePersonnaliteData>(`/intervenants/${id}/page`);
}

export function retirerArticlePersonnalite(id: number, lienId: number): Promise<ApiResponse<void>> {
  return httpClient.delete<void>(`/intervenants/${id}/articles/${lienId}`);
}

/** Éditeur avancé, pour un article qui sera publié sur la page de cette personnalité */
export const lienEcrireArticlePersonnalite = (id: number) => `/ajouter-oeuvre?personnalite=${id}`;

/** Lieux et personnalités auxquels un article est relié (fil de la page de l'article) */
export interface ContexteArticle {
  lieux: Array<{ id_lieu: number; nom: TexteMulti; section_patrimoine: PatrimoineSection }>;
  personnalites: Array<{ id_intervenant: number; nom: TexteMulti; prenom: TexteMulti; photo_url?: string | null }>;
}

export async function getContexteArticle(idOeuvre: number): Promise<ContexteArticle | null> {
  try {
    const res = await httpClient.get<ContexteArticle>(`/patrimoine/article-contexte/${idOeuvre}`);
    return res.success && res.data ? res.data : null;
  } catch {
    return null;
  }
}
