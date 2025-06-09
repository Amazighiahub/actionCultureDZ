// services/upload.service.ts - Service de gestion des uploads corrigé

import { apiService, ApiResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { FileUploadResult, UploadError, UploadUtils } from '../types/upload';

export interface UploadOptions {
  maxSize?: number; // En MB
  acceptedTypes?: string[];
  autoCompress?: boolean;
  compressionQuality?: number;
  additionalData?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

export interface UploadStatus {
  isUploading: boolean;
  progress: number;
  currentFile?: string;
  errors: Array<{ file: string; error: string }>;
}

export interface BatchUploadResult {
  successful: FileUploadResult[];
  failed: Array<{ filename: string; error: string }>;
  totalFiles: number;
  successCount: number;
  failCount: number;
}

export class UploadService {
  private static uploadQueue: Map<string, AbortController> = new Map();
  
  /**
   * VÉRIFICATION DU STATUT
   */
  
  /**
   * Vérifier le statut du service d'upload
   */
  static async getStatus(): Promise<ApiResponse<{
    available: boolean;
    maxFileSize: number;
    supportedTypes: string[];
    storageUsed?: number;
    storageLimit?: number;
  }>> {
    return apiService.get<any>(API_ENDPOINTS.upload.info);
  }

  /**
   * UPLOAD D'IMAGES
   */

  /**
   * Uploader une image publique (sans auth)
   */
  static async uploadImagePublic(
    file: File,
    options?: UploadOptions
  ): Promise<ApiResponse<FileUploadResult>> {
    return this.uploadFile(
      API_ENDPOINTS.upload.imagePublic,
      file,
      options
    );
  }

  /**
   * Uploader une image (avec auth)
   */
  static async uploadImage(
    file: File,
    options?: UploadOptions
  ): Promise<ApiResponse<FileUploadResult>> {
    // Compression automatique des images si demandée
    let fileToUpload = file;
    if (options?.autoCompress && file.type.startsWith('image/')) {
      fileToUpload = await UploadUtils.compressImage(
        file,
        options.compressionQuality || 0.8
      );
    }

    return this.uploadFile(
      API_ENDPOINTS.upload.image,
      fileToUpload,
      options
    );
  }

  /**
   * UPLOAD DE DOCUMENTS
   */

  /**
   * Uploader un document
   */
  static async uploadDocument(
    file: File,
    options?: UploadOptions
  ): Promise<ApiResponse<FileUploadResult>> {
    // Note: L'endpoint document n'existe pas dans les routes backend
    // On utilise l'endpoint image générique
    return this.uploadFile(
      API_ENDPOINTS.upload.image,
      file,
      options
    );
  }

  /**
   * UPLOAD DE VIDÉOS
   */

  /**
   * Uploader une vidéo
   */
  static async uploadVideo(
    file: File,
    options?: UploadOptions
  ): Promise<ApiResponse<FileUploadResult>> {
    // Note: L'endpoint video n'existe pas dans les routes backend
    // On utilise l'endpoint image générique
    return this.uploadFile(
      API_ENDPOINTS.upload.image,
      file,
      options
    );
  }

  /**
   * UPLOAD EN BATCH
   */

  /**
   * Uploader plusieurs fichiers
   */
  static async uploadMultiple(
    files: File[],
    type: 'image' | 'document' | 'video',
    options?: UploadOptions
  ): Promise<BatchUploadResult> {
    const results: BatchUploadResult = {
      successful: [],
      failed: [],
      totalFiles: files.length,
      successCount: 0,
      failCount: 0
    };

    // Déterminer la méthode d'upload selon le type
    const uploadMethod = {
      image: this.uploadImage,
      document: this.uploadDocument,
      video: this.uploadVideo
    }[type];

    // Uploader les fichiers en parallèle (max 3 à la fois)
    const chunks = this.chunkArray(files, 3);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (file) => {
        try {
          const response = await uploadMethod.call(this, file, options);
          if (response.success && response.data) {
            results.successful.push(response.data);
            results.successCount++;
          } else {
            results.failed.push({
              filename: file.name,
              error: response.error || 'Erreur inconnue'
            });
            results.failCount++;
          }
        } catch (error) {
          results.failed.push({
            filename: file.name,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          });
          results.failCount++;
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * MÉTHODE PRINCIPALE D'UPLOAD
   */

  private static async uploadFile(
    endpoint: string,
    file: File,
    options?: UploadOptions
  ): Promise<ApiResponse<FileUploadResult>> {
    // Validation du fichier
    const validation = this.validateFile(file, options);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Créer un AbortController pour pouvoir annuler
    const abortController = new AbortController();
    const uploadId = `${Date.now()}-${file.name}`;
    this.uploadQueue.set(uploadId, abortController);

    try {
      // Si on a une callback de progression, on doit utiliser une approche custom
      if (options?.onProgress) {
        return await this.uploadWithProgress(
          endpoint,
          file,
          {
            signal: abortController.signal,
            onProgress: options.onProgress,
            additionalData: options.additionalData
          }
        );
      } else {
        // Sinon, utiliser la méthode upload d'apiService
        return await apiService.upload<FileUploadResult>(
          endpoint,
          file,
          options?.additionalData
        );
      }
    } finally {
      this.uploadQueue.delete(uploadId);
    }
  }

  /**
   * Upload avec suivi de progression
   */
  private static async uploadWithProgress(
    endpoint: string,
    file: File,
    options: {
      signal?: AbortSignal;
      onProgress?: (progress: number) => void;
      additionalData?: Record<string, any>;
    }
  ): Promise<ApiResponse<FileUploadResult>> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const token = apiService.getToken();
      const formData = new FormData();
      
      // Ajouter le fichier
      const fieldName = endpoint.includes('image') ? 'image' : 'file';
      formData.append(fieldName, file);
      
      // Ajouter les données additionnelles
      if (options.additionalData) {
        Object.entries(options.additionalData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
      }

      // Écouter la progression
      if (options.onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            options.onProgress!(progress);
          }
        });
      }

      // Écouter la fin
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              data: response
            });
          } else {
            resolve({
              success: false,
              error: response.error || response.message || 'Erreur d\'upload'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: 'Erreur de traitement de la réponse'
          });
        }
      });

      // Écouter les erreurs
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Erreur réseau lors de l\'upload'
        });
      });

      // Écouter l'annulation
      xhr.addEventListener('abort', () => {
        resolve({
          success: false,
          error: 'Upload annulé'
        });
      });

      // Gérer l'annulation via AbortSignal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Configurer et envoyer la requête
      xhr.open('POST', `${apiService.getBaseURL()}${endpoint}`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * GESTION DES UPLOADS
   */

  /**
   * Annuler un upload en cours
   */
  static cancelUpload(uploadId: string): void {
    const controller = this.uploadQueue.get(uploadId);
    if (controller) {
      controller.abort();
      this.uploadQueue.delete(uploadId);
    }
  }

  /**
   * Annuler tous les uploads en cours
   */
  static cancelAllUploads(): void {
    this.uploadQueue.forEach(controller => controller.abort());
    this.uploadQueue.clear();
  }

  /**
   * VALIDATION
   */

  /**
   * Valider un fichier avant l'upload
   */
  private static validateFile(
    file: File,
    options?: UploadOptions
  ): { valid: boolean; error?: string } {
    // Vérifier la taille
    const maxSizeBytes = (options?.maxSize || 50) * 1024 * 1024; // Par défaut 50MB
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Le fichier est trop volumineux (max: ${options?.maxSize || 50}MB)`
      };
    }

    // Vérifier le type
    if (options?.acceptedTypes && options.acceptedTypes.length > 0) {
      const isTypeAccepted = options.acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });

      if (!isTypeAccepted) {
        return {
          valid: false,
          error: `Type de fichier non accepté (${file.type})`
        };
      }
    }

    // Vérifier le nom du fichier
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(file.name)) {
      return {
        valid: false,
        error: 'Le nom du fichier contient des caractères non valides'
      };
    }

    return { valid: true };
  }

  /**
   * HELPERS
   */

  /**
   * Diviser un tableau en chunks
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Obtenir l'extension d'un fichier
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Générer un nom unique pour un fichier
   */
  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Créer une preview pour un fichier
   */
  static async createPreview(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Obtenir l'icône selon le type de fichier
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    return '📎';
  }

  /**
   * Obtenir les types acceptés par catégorie
   */
  static getAcceptedTypes(category: 'image' | 'document' | 'video' | 'audio'): string[] {
    const types = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ],
      video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac']
    };

    return types[category] || [];
  }

  /**
   * Obtenir la configuration par défaut selon le type
   */
  static getDefaultConfig(type: 'image' | 'document' | 'video'): UploadOptions {
    const configs = {
      image: {
        maxSize: 10, // 10MB
        acceptedTypes: this.getAcceptedTypes('image'),
        autoCompress: true,
        compressionQuality: 0.8
      },
      document: {
        maxSize: 50, // 50MB
        acceptedTypes: this.getAcceptedTypes('document'),
        autoCompress: false
      },
      video: {
        maxSize: 500, // 500MB
        acceptedTypes: this.getAcceptedTypes('video'),
        autoCompress: false
      }
    };

    return configs[type];
  }

  /**
   * Convertir un blob en fichier
   */
  static blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, {
      type: blob.type,
      lastModified: Date.now()
    });
  }

  /**
   * Télécharger un fichier depuis une URL
   */
  static async downloadFromUrl(url: string, filename?: string): Promise<File> {
    const response = await fetch(url);
    const blob = await response.blob();
    const name = filename || url.split('/').pop() || 'download';
    
    return this.blobToFile(blob, name);
  }
}

export default UploadService;