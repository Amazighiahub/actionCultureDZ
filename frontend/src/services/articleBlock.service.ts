// services/articleBlock.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiResponse, API_ENDPOINTS } from '@/config/api';
import { httpClient } from './httpClient';
import { Oeuvre } from '@/types/models/oeuvre.types';
import { oeuvreService } from './oeuvre.service';

export interface ArticleBlock {
  id_block?: number;
  id_article: number;
  article_type: 'article' | 'article_scientifique';
  type_block: 'text' | 'heading' | 'image' | 'video' | 'citation' | 'code' | 'list' | 'table' | 'separator' | 'embed';
  contenu?: string;
  contenu_json?: any;
  id_media?: number;
  ordre: number;
  metadata?: any;
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
  metadata?: any;
}

export interface CreateBlockDTO {
  id_article: number;
  article_type?: 'article' | 'article_scientifique';
  type_block: ArticleBlock['type_block'];
  contenu?: string;
  contenu_json?: any;
  metadata?: any;
  id_media?: number;
}

export interface UpdateBlockDTO {
  contenu?: string;
  contenu_json?: any;
  metadata?: any;
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
      console.log('🔍 Récupération des blocs pour l\'article:', articleId);
      
      return await httpClient.get<ArticleBlock[]>(
        API_ENDPOINTS.articleBlocks.getByArticle(articleId, articleType)
      );
    } catch (error) {
      console.error('❌ Erreur récupération blocs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Créer un nouveau bloc
   */
  async createBlock(data: CreateBlockDTO): Promise<ApiResponse<ArticleBlock>> {
    try {
      console.log('📝 Création d\'un nouveau bloc:', data.type_block);
      
      return await httpClient.post<ArticleBlock>(
        API_ENDPOINTS.articleBlocks.create, 
        data
      );
    } catch (error) {
      console.error('❌ Erreur création bloc:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Créer plusieurs blocs en une fois
   */
  async createMultipleBlocks(data: BatchCreateBlocksDTO): Promise<ApiResponse<ArticleBlock[]>> {
    try {
      console.log('📝 Création de', data.blocks.length, 'blocs');
      
      return await httpClient.post<ArticleBlock[]>(
        API_ENDPOINTS.articleBlocks.createBatch, 
        data
      );
    } catch (error) {
      console.error('❌ Erreur création multiple:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Mettre à jour un bloc
   */
  async updateBlock(blockId: number, data: UpdateBlockDTO): Promise<ApiResponse<ArticleBlock>> {
    try {
      console.log('✏️ Mise à jour du bloc:', blockId);
      
      return await httpClient.put<ArticleBlock>(
        API_ENDPOINTS.articleBlocks.update(blockId), 
        data
      );
    } catch (error) {
      console.error('❌ Erreur mise à jour bloc:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Supprimer un bloc
   */
  async deleteBlock(blockId: number): Promise<ApiResponse<void>> {
    try {
      console.log('🗑️ Suppression du bloc:', blockId);
      
      return await httpClient.delete<void>(
        API_ENDPOINTS.articleBlocks.delete(blockId)
      );
    } catch (error) {
      console.error('❌ Erreur suppression bloc:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Réorganiser les blocs
   */
  async reorderBlocks(articleId: number, blockIds: number[]): Promise<ApiResponse<void>> {
    try {
      console.log('🔄 Réorganisation des blocs pour l\'article:', articleId);
      
      return await httpClient.put<void>(
        API_ENDPOINTS.articleBlocks.reorder(articleId),
        { blockIds }
      );
    } catch (error) {
      console.error('❌ Erreur réorganisation blocs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Dupliquer un bloc
   */
  async duplicateBlock(blockId: number): Promise<ApiResponse<ArticleBlock>> {
    try {
      console.log('📋 Duplication du bloc:', blockId);
      
      return await httpClient.post<ArticleBlock>(
        API_ENDPOINTS.articleBlocks.duplicate(blockId)
      );
    } catch (error) {
      console.error('❌ Erreur duplication bloc:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Uploader une image pour un bloc
   */
  

  /**
   * Récupérer les templates de blocs
   */
  async getBlockTemplates(): Promise<ApiResponse<BlockTemplate[]>> {
    try {
      console.log('📋 Récupération des templates de blocs');
      
      return await httpClient.get<BlockTemplate[]>(
        API_ENDPOINTS.articleBlocks.templates
      );
    } catch (error) {
      console.error('❌ Erreur récupération templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Sauvegarder l'article complet avec ses blocs
   */
  async saveArticleWithBlocks(
    articleData: any,
    blocks: Omit<CreateBlockDTO, 'id_article' | 'article_type'>[]
  ): Promise<ApiResponse<any>> {
    try {
      console.log('💾 Sauvegarde article complet avec blocs');
      
      // D'abord créer/mettre à jour l'article via l'API oeuvre
      const oeuvreResponse = await httpClient.post<any>(
        API_ENDPOINTS.oeuvres.create, 
        articleData
      );

      if (!oeuvreResponse.success || !oeuvreResponse.data?.oeuvre?.id_oeuvre) {
        throw new Error('Erreur lors de la création de l\'article');
      }

      const articleId = oeuvreResponse.data.oeuvre.id_oeuvre;
      console.log('✅ Article créé avec ID:', articleId);

      // Ensuite sauvegarder les blocs
      const blocksData: BatchCreateBlocksDTO = {
        id_article: articleId,
        article_type: articleData.type === 'article_scientifique' ? 'article_scientifique' : 'article',
        blocks: blocks.map((block, index) => ({
          ...block,
          id_article: articleId,
          ordre: index
        }))
      };

      const blocksResponse = await this.createMultipleBlocks(blocksData);
      
      if (!blocksResponse.success) {
        throw new Error('Erreur lors de la sauvegarde des blocs');
      }

      console.log('✅ Blocs sauvegardés avec succès');

      return {
        success: true,
        data: {
          article: oeuvreResponse.data.oeuvre,
          blocks: blocksResponse.data
        }
      };

    } catch (error) {
      console.error('❌ Erreur sauvegarde article complet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  /**
 * Sauvegarder les blocs pour un article existant
 * (Version compatible avec les composants créés)
 */
async saveBlocksForArticle(
  articleId: number,
  articleType: 'article' | 'article_scientifique',
  blocks: Omit<ArticleBlock, 'id_block' | 'id_article'>[]
): Promise<ApiResponse<ArticleBlock[]>> {
  try {
    console.log('💾 Sauvegarde des blocs pour l\'article:', articleId);
    
    // D'abord supprimer les anciens blocs
    const deleteResponse = await httpClient.delete<void>(
      `/articles/${articleId}/blocks`
    );
    
    if (!deleteResponse.success) {
      console.warn('⚠️ Impossible de supprimer les anciens blocs');
    }
    
    // Puis créer les nouveaux blocs
    const blocksData: BatchCreateBlocksDTO = {
      id_article: articleId,
      article_type: articleType,
      blocks: blocks.map((block, index) => ({
        id_article: articleId,
        article_type: articleType,
        type_block: block.type_block,
        contenu: block.contenu,
        contenu_json: block.contenu_json,
        metadata: block.metadata,
        id_media: block.id_media,
        ordre: block.ordre ?? index,
        visible: block.visible ?? true
      }))
    };
    
    return await this.createMultipleBlocks(blocksData);
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde blocs:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la sauvegarde des blocs'
    };
  }
}

/**
 * Upload une image pour un bloc spécifique
 */
async uploadBlockImage(
  articleId: number,
  blockId: number,
  file: File
): Promise<ApiResponse<{
  url: string;
  media_id: number;
  media: any;
}>> {
  try {
    console.log('📤 Upload image pour bloc:', blockId);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('article_id', articleId.toString());
    formData.append('block_id', blockId.toString());
    
    return await httpClient.postFormData<{
      url: string;
      media_id: number;
      media: any;
    }>(
      `/article-blocks/${blockId}/upload-image`,
      formData
    );
  } catch (error: any) {
    console.error('❌ Erreur upload image bloc:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'upload'
    };
  }
}

/**
 * Upload une vidéo pour un bloc
 */
async uploadBlockVideo(
  articleId: number,
  blockId: number,
  file: File
): Promise<ApiResponse<{
  url: string;
  media_id: number;
  media: any;
}>> {
  try {
    console.log('📤 Upload vidéo pour bloc:', blockId);
    
    const formData = new FormData();
    formData.append('video', file);
    formData.append('article_id', articleId.toString());
    formData.append('block_id', blockId.toString());
    
    // Timeout plus long pour les vidéos
    return await httpClient.postFormData<{
      url: string;
      media_id: number;
      media: any;
    }>(
      `/article-blocks/${blockId}/upload-video`,
      formData,
      { timeout: 300000 } // 5 minutes
    );
  } catch (error: any) {
    console.error('❌ Erreur upload vidéo bloc:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'upload de la vidéo'
    };
  }
}

/**
 * Exporter les blocs en markdown
 */
async exportToMarkdown(articleId: number): Promise<ApiResponse<string>> {
  try {
    console.log('📄 Export markdown pour article:', articleId);
    
    const response = await httpClient.get<{ markdown: string }>(
      `/articles/${articleId}/blocks/export/markdown`
    );
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.markdown
      };
    }
    
    return {
      success: false,
      error: 'Erreur lors de l\'export'
    };
  } catch (error: any) {
    console.error('❌ Erreur export markdown:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'export'
    };
  }
}

/**
 * Importer des blocs depuis du markdown
 */
async importFromMarkdown(
  articleId: number,
  markdown: string
): Promise<ApiResponse<ArticleBlock[]>> {
  try {
    console.log('📄 Import markdown pour article:', articleId);
    
    return await httpClient.post<ArticleBlock[]>(
      `/articles/${articleId}/blocks/import/markdown`,
      { markdown }
    );
  } catch (error: any) {
    console.error('❌ Erreur import markdown:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'import'
    };
  }
}

/**
 * Rechercher des blocs dans un article
 */
async searchBlocks(
  articleId: number,
  query: string
): Promise<ApiResponse<ArticleBlock[]>> {
  try {
    console.log('🔍 Recherche blocs pour:', query);
    
    return await httpClient.get<ArticleBlock[]>(
      `/articles/${articleId}/blocks/search`,
      { q: query }
    );
  } catch (error: any) {
    console.error('❌ Erreur recherche blocs:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la recherche'
    };
  }
}

/**
 * Obtenir les statistiques des blocs
 */
async getBlocksStats(articleId: number): Promise<ApiResponse<{
  total: number;
  byType: Record<string, number>;
  totalWords: number;
  totalImages: number;
  totalVideos: number;
}>> {
  try {
    console.log('📊 Récupération stats pour article:', articleId);
    
    return await httpClient.get<{
      total: number;
      byType: Record<string, number>;
      totalWords: number;
      totalImages: number;
      totalVideos: number;
    }>(`/articles/${articleId}/blocks/stats`);
  } catch (error: any) {
    console.error('❌ Erreur stats blocs:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des statistiques'
    };
  }
}

// ============================================
// ALTERNATIVE POUR getOeuvresByType
// ============================================

// Si votre API ne supporte pas un tableau de types,
// vous pouvez faire plusieurs appels et combiner les résultats :

async getOeuvresByType(types: number[]): Promise<ApiResponse<Oeuvre[]>> {
  try {
    console.log('🔍 Récupération œuvres par types:', types);
    
    // Faire un appel pour chaque type
    const promises = types.map(type => 
     oeuvreService.getOeuvres({ type, limit: 100 })
    );
    
    const results = await Promise.all(promises);
    
    // Combiner tous les résultats
    const allOeuvres: Oeuvre[] = [];
    
    for (const result of results) {
      if (result.success && result.data?.oeuvres) {
        allOeuvres.push(...result.data.oeuvres);
      }
    }
    
    // Éliminer les doublons (au cas où)
    const uniqueOeuvres = allOeuvres.filter((oeuvre, index, self) =>
      index === self.findIndex(o => o.id_oeuvre === oeuvre.id_oeuvre)
    );
    
    return {
      success: true,
      data: uniqueOeuvres
    };
  } catch (error: any) {
    console.error('❌ Erreur récupération œuvres par types:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération'
    };
  }
}
}

// Export singleton
export const articleBlockService = new ArticleBlockService();