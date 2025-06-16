// services/upload.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  API_ENDPOINTS, 
  ApiResponse, 
  UploadProgress, 
  API_BASE_URL,
  UploadOptions as ApiUploadOptions
} from '@/config/api';
import { httpClient } from './httpClient';

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type?: string;
  mimetype?: string;
  originalName?: string;
  thumbnail_url?: string;
}

interface ChunkUploadResponse {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
}

interface CompleteChunkUploadData {
  uploadId: string;
  filename: string;
  fileType: string;
}

interface UploadInfo {
  limits: {
    image: string;
    document: string;
    video: string;
    audio: string;
    chunk: string;
  };
  supportedFormats: {
    image: string[];
    document: string[];
    video: string[];
    audio: string[];
  };
}

export interface ServiceUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  isPublic?: boolean;
  generateThumbnail?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

class UploadService {
  private uploadInfo?: UploadInfo;

  /**
   * Helper pour construire l'URL complète à partir d'un chemin relatif
   * @param path Chemin relatif retourné par le backend (ex: /uploads/images/file.jpg)
   * @returns URL complète (ex: http://localhost:3001/uploads/images/file.jpg)
   */
  // 1. CORRECTION dans upload.service.ts - buildFullUrl
private buildFullUrl(path: string): string {
  if (!path) return '';
  
  // Si l'URL est déjà complète, la retourner
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // IMPORTANT: Pour les uploads, l'URL de base est SANS /api
  // Car les fichiers statiques sont servis depuis la racine
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  
  // S'assurer qu'il n'y a pas de double slash
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  
  console.log('🔗 Building full URL:', {
    API_BASE_URL,
    baseUrl,
    path,
    cleanPath,
    result: `${baseUrl}${cleanPath}`
  });
  
  return `${baseUrl}${cleanPath}`;
}

  /**
   * Transforme la réponse d'upload pour inclure l'URL complète
   */
  private transformUploadResponse(response: UploadResponse): UploadResponse {
    return {
      ...response,
      url: this.buildFullUrl(response.url),
      thumbnail_url: response.thumbnail_url ? this.buildFullUrl(response.thumbnail_url) : undefined
    };
  }

  // Récupération des informations d'upload
  async getUploadInfo(): Promise<ApiResponse<UploadInfo>> {
    const response = await httpClient.get<UploadInfo>(API_ENDPOINTS.upload.info);
    if (response.success && response.data) {
      this.uploadInfo = response.data;
    }
    return response;
  }

  // Upload simple d'image
  async uploadImage(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    const endpoint = options?.isPublic 
      ? API_ENDPOINTS.upload.imagePublic 
      : API_ENDPOINTS.upload.image;

    console.log('🖼️ Upload image:', {
      endpoint,
      fileName: file.name,
      fileSize: file.size,
      isPublic: options?.isPublic
    });

    const uploadOptions: ApiUploadOptions<any> = {
      fieldName: 'image',
      onProgress: options?.onProgress,
      additionalData: {
        generate_thumbnail: options?.generateThumbnail,
        max_width: options?.maxWidth,
        max_height: options?.maxHeight,
        quality: options?.quality
      }
    };

    const result = await httpClient.upload<UploadResponse>(endpoint, file, uploadOptions);
    
    // Transformer la réponse pour avoir l'URL complète
    if (result.success && result.data) {
      console.log('📦 Réponse upload brute:', result.data);
      result.data = this.transformUploadResponse(result.data);
      console.log('🔗 URL complète construite:', result.data.url);
    }
    
    return result;
  }

  // Upload de document
  async uploadDocument(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    const uploadOptions: ApiUploadOptions<any> = {
      fieldName: 'document',
      onProgress: options?.onProgress
    };
    
    const result = await httpClient.upload<UploadResponse>(
      API_ENDPOINTS.upload.document, 
      file,
      uploadOptions
    );
    
    // Transformer la réponse
    if (result.success && result.data) {
      result.data = this.transformUploadResponse(result.data);
    }
    
    return result;
  }

  // Upload de vidéo
  async uploadVideo(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    const uploadOptions: ApiUploadOptions<any> = {
      fieldName: 'video',
      onProgress: options?.onProgress
    };
    
    const result = await httpClient.upload<UploadResponse>(
      API_ENDPOINTS.upload.video, 
      file,
      uploadOptions
    );
    
    // Transformer la réponse
    if (result.success && result.data) {
      result.data = this.transformUploadResponse(result.data);
    }
    
    return result;
  }

  // Upload d'audio
  async uploadAudio(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    const uploadOptions: ApiUploadOptions<any> = {
      fieldName: 'audio',
      onProgress: options?.onProgress
    };
    
    const result = await httpClient.upload<UploadResponse>(
      API_ENDPOINTS.upload.audio, 
      file,
      uploadOptions
    );
    
    // Transformer la réponse
    if (result.success && result.data) {
      result.data = this.transformUploadResponse(result.data);
    }
    
    return result;
  }

  // Upload par chunks pour les gros fichiers
  async uploadChunk(
    file: Blob, 
    uploadId: string, 
    chunkIndex: number, 
    totalChunks: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<ChunkUploadResponse>> {
    const chunkFile = new File([file], `chunk-${chunkIndex}`, { 
      type: 'application/octet-stream' 
    });
    
    const uploadOptions: ApiUploadOptions<any> = {
      fieldName: 'chunk',
      additionalData: {
        uploadId,
        chunkIndex: String(chunkIndex),
        totalChunks: String(totalChunks),
        filename: `chunk-${chunkIndex}`
      },
      onProgress
    };
    
    return httpClient.upload<ChunkUploadResponse>(
      API_ENDPOINTS.upload.chunk,
      chunkFile,
      uploadOptions
    );
  }

  // Finaliser l'upload chunked
  async completeChunkUpload(data: CompleteChunkUploadData): Promise<ApiResponse<UploadResponse>> {
    const result = await httpClient.post<UploadResponse>(API_ENDPOINTS.upload.complete, data);
    
    // Transformer la réponse
    if (result.success && result.data) {
      result.data = this.transformUploadResponse(result.data);
    }
    
    return result;
  }

  // Upload de fichier volumineux avec chunks
  async uploadLargeFile(
    file: File, 
    options?: ServiceUploadOptions & { chunkSize?: number }
  ): Promise<ApiResponse<UploadResponse>> {
    const chunkSize = options?.chunkSize || 5 * 1024 * 1024; // 5MB par défaut
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = this.generateUploadId();

    try {
      // Upload de chaque chunk
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const chunkResponse = await this.uploadChunk(
          chunk,
          uploadId,
          i,
          totalChunks,
          options?.onProgress ? (progress) => {
            const globalProgress = ((i * chunkSize + progress.loaded) / file.size) * 100;
            options.onProgress!({
              loaded: i * chunkSize + progress.loaded,
              total: file.size,
              percentage: Math.round(globalProgress)
            });
          } : undefined
        );

        if (!chunkResponse.success) {
          throw new Error(`Échec de l'upload du chunk ${i + 1}`);
        }
      }

      // Finaliser l'upload
      return this.completeChunkUpload({
        uploadId,
        filename: file.name,
        fileType: this.getFileType(file)
      });
    } catch (error) {
      try {
        await this.cancelChunkUpload(uploadId);
      } catch (cancelError) {
        console.error('Erreur lors de l\'annulation:', cancelError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'upload"
      };
    }
  }

  // Annuler un upload chunked
  async cancelChunkUpload(uploadId: string): Promise<ApiResponse<void>> {
    return httpClient.delete(API_ENDPOINTS.upload.cancelChunk(uploadId));
  }

  // Obtenir le statut d'un upload chunked
  async getChunkUploadStatus(uploadId: string): Promise<ApiResponse<any>> {
    return httpClient.get(API_ENDPOINTS.upload.chunkStatus(uploadId));
  }

  // Validation côté client
  validateFile(file: File, type: 'image' | 'document' | 'video' | 'audio'): { valid: boolean; error?: string } {
    const maxSizes: Record<string, number> = {
      image: 10 * 1024 * 1024,      // 10MB
      document: 50 * 1024 * 1024,   // 50MB
      video: 500 * 1024 * 1024,     // 500MB
      audio: 100 * 1024 * 1024      // 100MB
    };

    const allowedExtensions: Record<string, string[]> = {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt'],
      video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
      audio: ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac']
    };

    const maxSize = maxSizes[type];
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return { valid: false, error: `Le fichier dépasse la taille maximale de ${maxSizeMB}MB` };
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions[type].includes(fileExtension)) {
      return { 
        valid: false, 
        error: `Type de fichier non autorisé. Types acceptés: ${allowedExtensions[type].join(', ')}` 
      };
    }

    return { valid: true };
  }

  // Helper pour générer un ID unique
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper pour déterminer le type de fichier
  getFileType(file: File): 'image' | 'document' | 'video' | 'audio' | 'unknown' {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return 'document';
    }
    
    return 'unknown';
  }

  // Helper pour obtenir l'URL complète (utilise maintenant buildFullUrl)
  getFullUrl(url: string): string {
    return this.buildFullUrl(url);
  }

  // Méthode spécialisée pour upload de photo de profil
  async uploadProfilePhoto(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<UploadResponse>> {
    const validation = this.validateProfilePhoto(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    console.log('📷 Upload photo de profil:', file.name);

    const response = await this.uploadImage(file, {
      isPublic: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9,
      onProgress
    });

    // L'URL est déjà transformée par uploadImage
    if (response.success && response.data) {
      console.log('✅ Photo uploadée, URL complète:', response.data.url);
    }

    return response;
  }

  // Validation spécifique pour photo de profil
  private validateProfilePhoto(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: 'La photo ne doit pas dépasser 5MB' 
      };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Format de photo non supporté. Utilisez JPG, PNG, GIF ou WebP.' 
      };
    }
    
    return { valid: true };
  }
}

export const uploadService = new UploadService();
export type { UploadResponse, ChunkUploadResponse, CompleteChunkUploadData, UploadInfo };