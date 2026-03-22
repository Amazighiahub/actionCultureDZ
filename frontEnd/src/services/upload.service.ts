// services/upload.service.ts - Version corrigée
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
  private baseUrlCache?: string;

  /**
   * Obtenir l'URL de base pour les fichiers statiques
   * Cache le résultat pour éviter les recalculs
   */
  private getStaticBaseUrl(): string {
    if (this.baseUrlCache) {
      return this.baseUrlCache;
    }

    // Pour les fichiers statiques, on utilise l'URL sans /api
    // Exemple: http://localhost:3001/api -> http://localhost:3001
    this.baseUrlCache = API_BASE_URL.replace(/\/api\/?$/, '');
    return this.baseUrlCache;
  }

  /**
   * Helper pour construire l'URL complète à partir d'un chemin relatif
   * @param path Chemin relatif retourné par le backend (ex: /uploads/images/file.jpg)
   * @returns URL complète (ex: http://localhost:3001/uploads/images/file.jpg)
   */
  private buildFullUrl(path: string): string {
    if (!path) return '';
    
    // Si l'URL est déjà complète, la retourner
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Obtenir l'URL de base pour les fichiers statiques
    const baseUrl = this.getStaticBaseUrl();
    
    // S'assurer qu'il n'y a pas de double slash
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const fullUrl = `${baseUrl}${cleanPath}`;
    return fullUrl;
  }

  /**
   * Transforme la réponse d'upload pour inclure l'URL complète
   */
  private transformUploadResponse(response: UploadResponse): UploadResponse {
    const transformed = {
      ...response,
      url: this.buildFullUrl(response.url),
      thumbnail_url: response.thumbnail_url ? this.buildFullUrl(response.thumbnail_url) : undefined
    };
    return transformed;
  }

  // Récupération des informations d'upload
  async getUploadInfo(): Promise<ApiResponse<UploadInfo>> {
    try {
      const response = await httpClient.get<UploadInfo>(API_ENDPOINTS.upload.info);
      if (response.success && response.data) {
        this.uploadInfo = response.data;
      }
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Impossible de récupérer les informations d\'upload'
      };
    }
  }

  // Upload simple d'image
  async uploadImage(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    const endpoint = options?.isPublic 
      ? API_ENDPOINTS.upload.imagePublic 
      : API_ENDPOINTS.upload.image;

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Ajouter les options
      if (options?.generateThumbnail !== undefined) {
        formData.append('generate_thumbnail', String(options.generateThumbnail));
      }
      if (options?.maxWidth) {
        formData.append('max_width', String(options.maxWidth));
      }
      if (options?.maxHeight) {
        formData.append('max_height', String(options.maxHeight));
      }
      if (options?.quality) {
        formData.append('quality', String(options.quality));
      }

      const result = await httpClient.upload<UploadResponse>(
        endpoint, 
        formData,
        options?.onProgress ? (progress) => options.onProgress!({
          loaded: progress,
          total: 100,
          percentage: progress
        }) : undefined
      );
      
      // Transformer la réponse pour avoir l'URL complète
      if (result.success && result.data) {
        result.data = this.transformUploadResponse(result.data);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  // Upload de document
  async uploadDocument(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      const result = await httpClient.upload<UploadResponse>(
        API_ENDPOINTS.upload.document, 
        formData,
        options?.onProgress ? (progress) => options.onProgress!({
          loaded: progress,
          total: 100,
          percentage: progress
        }) : undefined
      );
      
      // Transformer la réponse
      if (result.success && result.data) {
        result.data = this.transformUploadResponse(result.data);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  // Upload de vidéo
  async uploadVideo(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    // Pour les vidéos volumineuses, utiliser l'upload par chunks
    if (file.size > 50 * 1024 * 1024) { // Plus de 50MB
      return this.uploadLargeFile(file, options);
    }

    try {
      const formData = new FormData();
      formData.append('video', file);
      
      const result = await httpClient.upload<UploadResponse>(
        API_ENDPOINTS.upload.video, 
        formData,
        options?.onProgress ? (progress) => options.onProgress!({
          loaded: progress,
          total: 100,
          percentage: progress
        }) : undefined
      );
      
      // Transformer la réponse
      if (result.success && result.data) {
        result.data = this.transformUploadResponse(result.data);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  // Upload d'audio
  async uploadAudio(file: File, options?: ServiceUploadOptions): Promise<ApiResponse<UploadResponse>> {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      
      const result = await httpClient.upload<UploadResponse>(
        API_ENDPOINTS.upload.audio, 
        formData,
        options?.onProgress ? (progress) => options.onProgress!({
          loaded: progress,
          total: 100,
          percentage: progress
        }) : undefined
      );
      
      // Transformer la réponse
      if (result.success && result.data) {
        result.data = this.transformUploadResponse(result.data);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  // Upload par chunks pour les gros fichiers
  async uploadChunk(
    file: Blob, 
    uploadId: string, 
    chunkIndex: number, 
    totalChunks: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<ChunkUploadResponse>> {
    const formData = new FormData();
    formData.append('chunk', file);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('totalChunks', String(totalChunks));
    
    return httpClient.upload<ChunkUploadResponse>(
      API_ENDPOINTS.upload.chunk,
      formData,
      onProgress ? (progress) => onProgress({
        loaded: progress,
        total: 100,
        percentage: progress
      }) : undefined
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
            const globalProgress = ((i * chunkSize + (progress.loaded / 100 * chunkSize)) / file.size) * 100;
            options.onProgress!({
              loaded: i * chunkSize + (progress.loaded / 100 * chunkSize),
              total: file.size,
              percentage: Math.round(globalProgress)
            });
          } : undefined
        );

        if (!chunkResponse.success) {
          throw new Error(`Échec de l'upload du chunk ${i + 1}: ${chunkResponse.error}`);
        }
      }

      // Finaliser l'upload
      const result = await this.completeChunkUpload({
        uploadId,
        filename: file.name,
        fileType: this.getFileType(file)
      });

      return result;
    } catch (error) {
      // Essayer d'annuler l'upload
      try {
        await this.cancelChunkUpload(uploadId);
      } catch (_cancelError) {
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
  async getChunkUploadStatus(uploadId: string): Promise<ApiResponse<{ uploadId: string; chunksReceived: number; totalChunks: number; complete: boolean }>> {
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

    const allowedMimeTypes: Record<string, string[]> = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/vnd.oasis.opendocument.text'
      ],
      video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-flv', 'video/webm'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/flac']
    };

    // Vérifier la taille
    const maxSize = maxSizes[type];
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return { 
        valid: false, 
        error: `Le fichier dépasse la taille maximale de ${maxSizeMB}MB` 
      };
    }

    // Vérifier le type MIME
    const allowedTypes = allowedMimeTypes[type];
    if (!allowedTypes.includes(file.type)) {
      // Vérifier aussi par extension comme fallback
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions: Record<string, string[]> = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
        document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt'],
        video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
        audio: ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac']
      };
      
      if (!allowedExtensions[type].includes(fileExtension)) {
        return { 
          valid: false, 
          error: `Type de fichier non autorisé. Types acceptés: ${allowedExtensions[type].join(', ')}` 
        };
      }
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
      mimeType.includes('presentation') ||
      mimeType.includes('msword') ||
      mimeType.includes('officedocument')
    ) {
      return 'document';
    }
    
    // Vérifier par extension si le type MIME n'est pas reconnu
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(extension)) return 'image';
    if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'].includes(extension)) return 'video';
    if (['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'].includes(extension)) return 'audio';
    if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt'].includes(extension)) return 'document';
    
    return 'unknown';
  }

  // Helper pour obtenir l'URL complète
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

    return this.uploadImage(file, {
      isPublic: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9,
      generateThumbnail: true,
      onProgress
    });
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

  // Méthode pour obtenir une preview d'image
  async getImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Reset du cache d'URL (utile pour les tests)
  resetCache(): void {
    this.baseUrlCache = undefined;
    this.uploadInfo = undefined;
  }
}

export const uploadService = new UploadService();
export type { UploadResponse, ChunkUploadResponse, CompleteChunkUploadData, UploadInfo };