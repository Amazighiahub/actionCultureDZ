// services/media.service.ts
import { uploadService, type UploadResponse } from './upload.service';
import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '@/config/api';
import type { ApiResponse } from '@/config/api';
import type { Media } from '@/types/models/media.types';

interface MediaUploadResponse extends UploadResponse {
  media_id?: number;
}

export class MediaService {
  /**
   * Upload d'un fichier image pour un profil utilisateur
   */
  async uploadProfilePhoto(file: File): Promise<ApiResponse<MediaUploadResponse>> {
    // Valider le fichier
    const validation = uploadService.validateFile(file, 'image');
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Utiliser uploadService pour l'upload
    const result = await uploadService.uploadImage(file, {
      isPublic: false,
      generateThumbnail: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9
    });

    if (result.success && result.data) {
      // Mise à jour du profil avec la nouvelle photo
      const updateResult = await httpClient.put<{ media_id: number }>(
        API_ENDPOINTS.auth.updatePhoto,
        { photo_url: result.data.url }
      );

      return {
        ...result,
        data: {
          ...result.data,
          media_id: updateResult.data?.media_id
        } as MediaUploadResponse
      };
    }

    return result as ApiResponse<MediaUploadResponse>;
  }

  /**
   * Upload d'un fichier pour une œuvre
   */
  async uploadOeuvreMedia(file: File, oeuvreId: number): Promise<ApiResponse<MediaUploadResponse>> {
    // Déterminer le type de fichier
    const fileType = uploadService.getFileType(file);
    
    if (fileType === 'unknown') {
      return {
        success: false,
        error: 'Type de fichier non supporté'
      };
    }

    // Valider le fichier
    const validation = uploadService.validateFile(file, fileType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Upload selon le type
    let uploadResult: ApiResponse<UploadResponse>;
    
    switch (fileType) {
      case 'image':
        uploadResult = await uploadService.uploadImage(file, {
          generateThumbnail: true,
          maxWidth: 1920,
          maxHeight: 1080
        });
        break;
      case 'video':
        uploadResult = await uploadService.uploadVideo(file);
        break;
      case 'audio':
        uploadResult = await uploadService.uploadAudio(file);
        break;
      case 'document':
        uploadResult = await uploadService.uploadDocument(file);
        break;
      default:
        return {
          success: false,
          error: 'Type de fichier non supporté'
        };
    }

    if (uploadResult.success && uploadResult.data) {
      // Associer le média à l'œuvre via l'API
      const associateResult = await httpClient.post<{ media_id: number }>(
        API_ENDPOINTS.oeuvres.uploadMedia(oeuvreId),
        {
          url: uploadResult.data.url,
          filename: uploadResult.data.filename,
          size: uploadResult.data.size,
          type: uploadResult.data.type
        }
      );

      return {
        ...uploadResult,
        data: {
          ...uploadResult.data,
          media_id: associateResult.data?.media_id
        } as MediaUploadResponse
      };
    }

    return uploadResult as ApiResponse<MediaUploadResponse>;
  }

  /**
   * Upload d'un fichier pour un événement
   */
  async uploadEvenementMedia(file: File, evenementId: number): Promise<ApiResponse<MediaUploadResponse>> {
    // Même logique que pour les œuvres
    const fileType = uploadService.getFileType(file);
    
    if (fileType === 'unknown') {
      return {
        success: false,
        error: 'Type de fichier non supporté'
      };
    }

    const validation = uploadService.validateFile(file, fileType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    let uploadResult: ApiResponse<UploadResponse>;
    
    switch (fileType) {
      case 'image':
        uploadResult = await uploadService.uploadImage(file, {
          generateThumbnail: true,
          maxWidth: 1920,
          maxHeight: 1080
        });
        break;
      case 'video':
        uploadResult = await uploadService.uploadVideo(file);
        break;
      case 'audio':
        uploadResult = await uploadService.uploadAudio(file);
        break;
      case 'document':
        uploadResult = await uploadService.uploadDocument(file);
        break;
      default:
        return {
          success: false,
          error: 'Type de fichier non supporté'
        };
    }

    if (uploadResult.success && uploadResult.data) {
      // Associer le média à l'événement
      const associateResult = await httpClient.post<{ media_id: number }>(
        API_ENDPOINTS.evenements.addMedias(evenementId),
        {
          url: uploadResult.data.url,
          filename: uploadResult.data.filename,
          size: uploadResult.data.size,
          type: uploadResult.data.type
        }
      );

      return {
        ...uploadResult,
        data: {
          ...uploadResult.data,
          media_id: associateResult.data?.media_id
        } as MediaUploadResponse
      };
    }

    return uploadResult as ApiResponse<MediaUploadResponse>;
  }

  /**
   * Upload multiple de fichiers
   */
  async uploadMultiple(
    files: File[], 
    entityType: 'oeuvre' | 'evenement' | 'patrimoine' | 'artisanat', 
    entityId: number,
    onProgress?: (progress: { file: string; percentage: number }) => void
  ): Promise<ApiResponse<MediaUploadResponse[]>> {
    const results: MediaUploadResponse[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        let result: ApiResponse<MediaUploadResponse>;
        
        switch (entityType) {
          case 'oeuvre':
            result = await this.uploadOeuvreMedia(file, entityId);
            break;
          case 'evenement':
            result = await this.uploadEvenementMedia(file, entityId);
            break;
          case 'patrimoine':
            result = await this.uploadPatrimoineMedia(file, entityId);
            break;
          case 'artisanat':
            result = await this.uploadArtisanatMedia(file, entityId);
            break;
        }

        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push(`${file.name}: ${result.error || 'Erreur inconnue'}`);
        }

        if (onProgress) {
          onProgress({
            file: file.name,
            percentage: ((i + 1) / files.length) * 100
          });
        }
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * Upload pour patrimoine
   */
  async uploadPatrimoineMedia(file: File, siteId: number): Promise<ApiResponse<MediaUploadResponse>> {
    const fileType = uploadService.getFileType(file);
    
    if (fileType !== 'image') {
      return {
        success: false,
        error: 'Seules les images sont autorisées pour les sites patrimoniaux'
      };
    }

    const uploadResult = await uploadService.uploadImage(file, {
      generateThumbnail: true,
      maxWidth: 1920,
      maxHeight: 1080
    });

    if (uploadResult.success && uploadResult.data) {
      const associateResult = await httpClient.post<{ media_id: number }>(
        API_ENDPOINTS.patrimoine.uploadMedias(siteId),
        {
          url: uploadResult.data.url,
          filename: uploadResult.data.filename,
          size: uploadResult.data.size,
          type: uploadResult.data.type
        }
      );

      return {
        ...uploadResult,
        data: {
          ...uploadResult.data,
          media_id: associateResult.data?.media_id
        } as MediaUploadResponse
      };
    }

    return uploadResult as ApiResponse<MediaUploadResponse>;
  }

  /**
   * Upload pour artisanat
   */
  async uploadArtisanatMedia(file: File, artisanatId: number): Promise<ApiResponse<MediaUploadResponse>> {
    const fileType = uploadService.getFileType(file);
    
    if (fileType !== 'image') {
      return {
        success: false,
        error: 'Seules les images sont autorisées pour l\'artisanat'
      };
    }

    const uploadResult = await uploadService.uploadImage(file, {
      generateThumbnail: true,
      maxWidth: 1920,
      maxHeight: 1080
    });

    if (uploadResult.success && uploadResult.data) {
      const associateResult = await httpClient.post<{ media_id: number }>(
        API_ENDPOINTS.artisanat.uploadMedias(artisanatId),
        {
          url: uploadResult.data.url,
          filename: uploadResult.data.filename,
          size: uploadResult.data.size,
          type: uploadResult.data.type
        }
      );

      return {
        ...uploadResult,
        data: {
          ...uploadResult.data,
          media_id: associateResult.data?.media_id
        } as MediaUploadResponse
      };
    }

    return uploadResult as ApiResponse<MediaUploadResponse>;
  }

  /**
   * Supprimer un média selon son contexte
   */
  async deleteMedia(
    mediaId: number, 
    entityType: 'oeuvre' | 'evenement' | 'patrimoine' | 'artisanat',
    entityId: number
  ): Promise<ApiResponse<void>> {
    let endpoint: string;
    
    switch (entityType) {
      case 'oeuvre':
        endpoint = API_ENDPOINTS.oeuvres.deleteMedia(entityId, mediaId);
        break;
      case 'evenement':
        endpoint = API_ENDPOINTS.evenements.deleteMedia(entityId, mediaId);
        break;
      case 'patrimoine':
        endpoint = API_ENDPOINTS.patrimoine.deleteMedia(entityId, mediaId);
        break;
      case 'artisanat':
        // À ajouter dans api.ts si nécessaire
        endpoint = `/artisanat/${entityId}/medias/${mediaId}`;
        break;
    }

    return httpClient.delete<void>(endpoint);
  }

  /**
   * Obtenir les médias d'une entité
   */
  async getEntityMedias(
    entityType: 'oeuvre' | 'evenement' | 'patrimoine',
    entityId: number
  ): Promise<ApiResponse<Media[]>> {
    let endpoint: string;
    
    switch (entityType) {
      case 'oeuvre':
        endpoint = API_ENDPOINTS.oeuvres.medias(entityId);
        break;
      case 'evenement':
        endpoint = API_ENDPOINTS.evenements.medias(entityId);
        break;
      case 'patrimoine':
        endpoint = API_ENDPOINTS.patrimoine.galerie(entityId);
        break;
    }

    return httpClient.get<Media[]>(endpoint);
  }

  /**
   * Valider le type et la taille d'un fichier (gardé pour compatibilité)
   */
  validateFile(file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }): { valid: boolean; error?: string } {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'] } = options || {};
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Le fichier est trop volumineux. Taille max: ${(maxSize / 1024 / 1024).toFixed(1)}MB`
      };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Convertir un fichier en base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Redimensionner une image avant upload
   */
  async resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Impossible de redimensionner l\'image'));
          }
        }, file.type);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
 * Upload d'une photo de profil lors de l'inscription (sans authentification)
 * Cette méthode est différente de uploadProfilePhoto car elle n'essaie pas
 * de mettre à jour le profil (qui n'existe pas encore)
 */
async uploadProfilePhotoForRegistration(file: File): Promise<ApiResponse<UploadResponse>> {
  // Validation
  const validation = uploadService.validateFile(file, 'image');
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  console.log('📷 Upload photo pour inscription:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    fileType: file.type,
    endpoint: 'PUBLIC (sans auth)'
  });

  try {
    // Upload PUBLIC
    const result = await uploadService.uploadImage(file, {
      isPublic: true,
      generateThumbnail: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9
    });

    if (result.success && result.data) {
      console.log('✅ Upload réussi:', {
        url: result.data.url,
        isFullUrl: result.data.url.startsWith('http'),
        filename: result.data.filename
      });
      
      // Vérifier que l'URL est complète
      if (!result.data.url.startsWith('http')) {
        console.warn('⚠️ URL retournée n\'est pas complète:', result.data.url);
      }
    } else {
      console.error('❌ Échec upload:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Exception upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}
}

// Export de l'instance singleton
export const mediaService = new MediaService();