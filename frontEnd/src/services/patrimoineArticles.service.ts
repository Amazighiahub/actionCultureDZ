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
