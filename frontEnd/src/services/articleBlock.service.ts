// services/articleBlock.service.ts
import { ApiResponse, API_ENDPOINTS } from '@/config/api';
import { httpClient } from './httpClient';
import { reponseEchec } from '@/utils/erreurServeur';
import i18next from 'i18next';

export interface ArticleBlock {
  id_block?: number;
  id_article: number;
  article_type: 'article' | 'article_scientifique';
  type_block: 'text' | 'heading' | 'image' | 'video' | 'citation' | 'code' | 'list' | 'table' | 'separator' | 'embed';
  contenu?: string;
  contenu_json?: Record<string, unknown> | unknown[];
  id_media?: number;
  ordre: number;
  metadata?: Record<string, string | number | boolean | null>;
  visible?: boolean;
  media?: {
    id_media: number;
    url: string;
    titre?: string;
    description?: string;
    thumbnail_url?: string;
  };
}

export interface BlockTemplate {
  id: string;
  name: string;
  type_block: ArticleBlock['type_block'];
  icon: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CreateBlockDTO {
  id_article: number;
  article_type?: 'article' | 'article_scientifique';
  type_block: ArticleBlock['type_block'];
  contenu?: string;
  contenu_json?: Record<string, unknown> | unknown[];
  metadata?: Record<string, string | number | boolean | null>;
  id_media?: number;
}

export interface UpdateBlockDTO {
  contenu?: string;
  contenu_json?: Record<string, unknown> | unknown[];
  metadata?: Record<string, string | number | boolean | null>;
  id_media?: number;
  visible?: boolean;
  type_block?: ArticleBlock['type_block'];
}

export interface BatchCreateBlocksDTO {
  id_article: number;
  article_type?: 'article' | 'article_scientifique';
  blocks: CreateBlockDTO[];
}

class ArticleBlockService {
  /**
   * Récupérer tous les blocs d'un article
   */
  async getBlocksByArticle(
    articleId: number, 
    articleType: 'article' | 'article_scientifique' = 'article'
  ): Promise<ApiResponse<ArticleBlock[]>> {
    try {
      return await httpClient.get<ArticleBlock[]>(
        API_ENDPOINTS.articleBlocks.getByArticle(articleId, articleType)
      );
    } catch (error) {
      return {
        ...reponseEchec(error, i18next.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  /**
   * Créer plusieurs blocs en une fois
   */
  async createMultipleBlocks(data: BatchCreateBlocksDTO): Promise<ApiResponse<ArticleBlock[]>> {
    try {
      return await httpClient.post<ArticleBlock[]>(
        API_ENDPOINTS.articleBlocks.createBatch, 
        data
      );
    } catch (error) {
      return {
        ...reponseEchec(error, i18next.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }
}

// Export singleton
export const articleBlockService = new ArticleBlockService();