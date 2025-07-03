// types/article.types.ts

// ============================================================================
// TYPES DE BASE
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ArticleBlock {
    id_block?: number;
    id_article?: number;
    article_type?: 'article' | 'article_scientifique';
    type_block: 'text' | 'heading' | 'image' | 'video' | 'citation' | 'code' | 'list' | 'table' | 'separator' | 'embed';
    contenu?: string;
    contenu_json?: any;
    metadata?: BlockMetadata;
    id_media?: number;
    media?: MediaInfo;
    ordre?: number;
    visible?: boolean;
    date_creation?: string;
    date_modification?: string;
  }
  
  export interface BlockMetadata {
    level?: number | string;
    layout?: 'full-width' | 'float-left' | 'float-right' | 'centered';
    caption?: string;
    language?: string;
    listType?: 'ordered' | 'unordered';
    alignment?: 'left' | 'center' | 'right' | 'justify';
    style?: Record<string, any>;
    [key: string]: any;
  }
  
  export interface MediaInfo {
    id_media?: number;
    url: string;
    titre?: string;
    description?: string;
    thumbnail_url?: string;
    type_media?: string;
    taille_fichier?: number;
    mime_type?: string;
  }
  
  // ============================================================================
  // TYPES POUR LES FORMULAIRES
  // ============================================================================
  
  export interface ArticleFormData {
    // Champs communs
    titre: string;
    description: string;
    id_langue: number;
    annee_creation?: number;
    categories: number[];
    tags: string[];
    
    // Type d'article
    type: 'article' | 'article_scientifique';
    
    // Champs spécifiques Article
    auteur?: string;
    source?: string;
    resume?: string;
    url_source?: string;
    sous_titre?: string;
    
    // Champs spécifiques Article Scientifique
    journal?: string;
    doi?: string;
    pages?: string;
    volume?: string;
    numero?: string;
    peer_reviewed?: boolean;
    issn?: string;
    impact_factor?: number;
  }
  
  // ============================================================================
  // PROPS DES COMPOSANTS
  // ============================================================================
  
  export interface ArticleEditorProps {
    articleId?: string | number;
    initialData?: Partial<ArticleFormData>;
    onBack?: () => void;
    onSave?: (data: ArticleSaveResponse) => void;
  }
  
  export interface ArticleBlockEditorProps {
    block: ArticleBlock;
    index: number;
    onUpdate: (index: number, updates: Partial<ArticleBlock>) => void;
    onDelete: (index: number) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDuplicate: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }
  
  export interface ArticlePreviewProps {
    formData: ArticleFormData;
    blocks: ArticleBlock[];
  }
  
  // ============================================================================
  // TYPES API
  // ============================================================================
  
  export interface CreateArticleDTO {
    titre: string;
    description: string;
    id_type_oeuvre: number;
    id_langue: number;
    annee_creation?: number;
    categories: number[];
    tags: string[];
    details_specifiques: {
      article?: {
        auteur?: string;
        source?: string;
        resume?: string;
        url_source?: string;
      };
      article_scientifique?: {
        journal?: string;
        doi?: string;
        pages?: string;
        volume?: string;
        numero?: string;
        peer_reviewed?: boolean;
      };
    };
  }
  
  export interface CreateBlockDTO {
    id_article: number;
    article_type?: 'article' | 'article_scientifique';
    type_block: ArticleBlock['type_block'];
    contenu?: string;
    contenu_json?: any;
    metadata?: BlockMetadata;
    id_media?: number;
  }
  
  export interface UpdateBlockDTO {
    contenu?: string;
    contenu_json?: any;
    metadata?: BlockMetadata;
    id_media?: number;
    visible?: boolean;
    type_block?: ArticleBlock['type_block'];
  }
  
  export interface BatchCreateBlocksDTO {
    id_article: number;
    article_type?: 'article' | 'article_scientifique';
    blocks: Omit<CreateBlockDTO, 'id_article' | 'article_type'>[];
  }
  
  // ============================================================================
  // TYPES DE RÉPONSE
  // ============================================================================
  
  export interface ArticleSaveResponse {
    article: {
      id_oeuvre: number;
      titre: string;
      [key: string]: any;
    };
    blocks?: ArticleBlock[];
  }
  
  export interface BlockTemplate {
    id: string;
    name: string;
    type_block: ArticleBlock['type_block'];
    icon: string;
    metadata?: BlockMetadata;
    defaultContent?: string;
  }
  
  // ============================================================================
  // ENUMS ET CONSTANTES
  // ============================================================================
  
  export enum BlockType {
    TEXT = 'text',
    HEADING = 'heading',
    IMAGE = 'image',
    VIDEO = 'video',
    CITATION = 'citation',
    CODE = 'code',
    LIST = 'list',
    TABLE = 'table',
    SEPARATOR = 'separator',
    EMBED = 'embed'
  }
  
  export enum ArticleType {
    ARTICLE = 'article',
    ARTICLE_SCIENTIFIQUE = 'article_scientifique'
  }
  
  export enum ImageLayout {
    FULL_WIDTH = 'full-width',
    FLOAT_LEFT = 'float-left',
    FLOAT_RIGHT = 'float-right',
    CENTERED = 'centered'
  }
  
  // ============================================================================
  // TYPE GUARDS
  // ============================================================================
  
  export function isTextBlock(block: ArticleBlock): block is ArticleBlock & { contenu: string } {
    return ['text', 'heading', 'citation', 'code'].includes(block.type_block);
  }
  
  export function isMediaBlock(block: ArticleBlock): block is ArticleBlock & { media: MediaInfo } {
    return ['image', 'video'].includes(block.type_block) && !!block.media;
  }
  
  export function isListBlock(block: ArticleBlock): block is ArticleBlock & { contenu_json: string[] } {
    return block.type_block === 'list' && Array.isArray(block.contenu_json);
  }
  
  export function isTableBlock(block: ArticleBlock): block is ArticleBlock & { contenu_json: { headers: string[], rows: string[][] } } {
    return block.type_block === 'table' && !!block.contenu_json?.headers && !!block.contenu_json?.rows;
  }
  
  // ============================================================================
  // UTILITAIRES
  // ============================================================================
  
  export const DEFAULT_BLOCK_CONTENT: Record<BlockType, () => Partial<ArticleBlock>> = {
    [BlockType.TEXT]: () => ({
      contenu: '',
      metadata: {}
    }),
    [BlockType.HEADING]: () => ({
      contenu: 'Nouveau titre',
      metadata: { level: 2 }
    }),
    [BlockType.IMAGE]: () => ({
      metadata: { layout: 'full-width' }
    }),
    [BlockType.VIDEO]: () => ({
      metadata: { autoplay: false, controls: true }
    }),
    [BlockType.CITATION]: () => ({
      contenu: '',
      metadata: {}
    }),
    [BlockType.CODE]: () => ({
      contenu: '',
      metadata: { language: 'javascript' }
    }),
    [BlockType.LIST]: () => ({
      contenu_json: [''],
      metadata: { listType: 'unordered' }
    }),
    [BlockType.TABLE]: () => ({
      contenu_json: { headers: ['Col 1', 'Col 2'], rows: [['', '']] },
      metadata: {}
    }),
    [BlockType.SEPARATOR]: () => ({
      metadata: {}
    }),
    [BlockType.EMBED]: () => ({
      contenu: '',
      metadata: { type: 'iframe' }
    })
  };
  
  export function createDefaultBlock(type: BlockType): ArticleBlock {
    return {
      type_block: type,
      ...DEFAULT_BLOCK_CONTENT[type]()
    };
  }