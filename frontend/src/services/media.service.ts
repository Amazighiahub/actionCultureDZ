// services/media.service.ts - Version corrigée
import { uploadService, type UploadResponse } from './upload.service';
import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '@/config/api';
import type { ApiResponse } from '@/config/api';
import type { Media } from '@/types/models/media.types';

interface MediaUploadResponse extends UploadResponse {
  media_id?: number;
}

interface MediaUploadOptions {
  titre?: string;
  description?: string;
  is_principal?: boolean;
  ordre?: number;
}

export class MediaService {
  /**
   * Upload d'un fichier image pour un profil utilisateur
   */
  async uploadProfilePhoto(file: File): Promise<ApiResponse<MediaUploadResponse>> {
    console.log('📸 MediaService: Upload photo de profil');
    
    // Utiliser directement uploadService pour l'upload
    const result = await uploadService.uploadProfilePhoto(file);

    if (result.success && result.data) {
      console.log('✅ Photo uploadée avec succès:', result.data.url);
      
      // Mise à jour du profil avec la nouvelle photo
      try {
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
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du profil:', error);
        // L'upload a réussi mais la mise à jour du profil a échoué
        // On retourne quand même le résultat de l'upload
        return {
          ...result,
          data: result.data as MediaUploadResponse
        };
      }
    }

    return result as ApiResponse<MediaUploadResponse>;
  }

  /**
   * Upload d'une photo de profil lors de l'inscription (sans authentification)
   */
  async uploadProfilePhotoForRegistration(file: File): Promise<ApiResponse<UploadResponse>> {
    console.log('📸 MediaService: Upload photo pour inscription (sans auth)');
    
    // Utiliser directement uploadService avec l'endpoint public
    const result = await uploadService.uploadImage(file, {
      isPublic: true,
      generateThumbnail: true,
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.9
    });

    if (result.success && result.data) {
      console.log('✅ Photo inscription uploadée:', result.data.url);
    } else {
      console.error('❌ Échec upload photo inscription:', result.error);
    }

    return result;
  }

  /**
   * Upload d'un fichier pour une œuvre
   */
  async uploadOeuvreMedia(
    file: File, 
    oeuvreId: number,
    options?: MediaUploadOptions
  ): Promise<ApiResponse<MediaUploadResponse>> {
    console.log('🎨 MediaService: Upload média pour œuvre', oeuvreId);
    
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
    
    try {
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
            type: uploadResult.data.type || fileType,
            titre: options?.titre,
            description: options?.description,
            is_principal: options?.is_principal,
            ordre: options?.ordre
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
    } catch (error) {
      console.error('❌ Erreur upload média œuvre:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  /**
   * Upload d'un fichier pour un événement
   */
  async uploadEvenementMedia(
    file: File, 
    evenementId: number,
    options?: MediaUploadOptions
  ): Promise<ApiResponse<MediaUploadResponse>> {
    console.log('🎭 MediaService: Upload média pour événement', evenementId);
    
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

    try {
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
            type: uploadResult.data.type || fileType,
            titre: options?.titre,
            description: options?.description,
            is_principal: options?.is_principal,
            ordre: options?.ordre
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
    } catch (error) {
      console.error('❌ Erreur upload média événement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
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
    console.log(`📦 MediaService: Upload multiple pour ${entityType} ${entityId}`);
    
    const results: MediaUploadResponse[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPrincipal = i === 0; // Premier fichier principal par défaut
      
      try {
        let result: ApiResponse<MediaUploadResponse>;
        
        switch (entityType) {
          case 'oeuvre':
            result = await this.uploadOeuvreMedia(file, entityId, { is_principal: isPrincipal });
            break;
          case 'evenement':
            result = await this.uploadEvenementMedia(file, entityId, { is_principal: isPrincipal });
            break;
          case 'patrimoine':
            result = await this.uploadPatrimoineMedia(file, entityId, { is_principal: isPrincipal });
            break;
          case 'artisanat':
            result = await this.uploadArtisanatMedia(file, entityId, { is_principal: isPrincipal });
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

    console.log(`✅ Upload multiple terminé: ${results.length} succès, ${errors.length} erreurs`);

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * Upload pour patrimoine
   */
  async uploadPatrimoineMedia(
    file: File, 
    siteId: number,
    options?: MediaUploadOptions
  ): Promise<ApiResponse<MediaUploadResponse>> {
    console.log('🏛️ MediaService: Upload média pour patrimoine', siteId);
    
    const fileType = uploadService.getFileType(file);
    
    if (fileType !== 'image') {
      return {
        success: false,
        error: 'Seules les images sont autorisées pour les sites patrimoniaux'
      };
    }

    try {
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
            type: 'image',
            titre: options?.titre,
            description: options?.description,
            is_principal: options?.is_principal,
            ordre: options?.ordre
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
    } catch (error) {
      console.error('❌ Erreur upload média patrimoine:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  /**
   * Upload pour artisanat
   */
  async uploadArtisanatMedia(
    file: File, 
    artisanatId: number,
    options?: MediaUploadOptions
  ): Promise<ApiResponse<MediaUploadResponse>> {
    console.log('🎨 MediaService: Upload média pour artisanat', artisanatId);
    
    const fileType = uploadService.getFileType(file);
    
    if (fileType !== 'image') {
      return {
        success: false,
        error: 'Seules les images sont autorisées pour l\'artisanat'
      };
    }

    try {
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
            type: 'image',
            titre: options?.titre,
            description: options?.description,
            is_principal: options?.is_principal,
            ordre: options?.ordre
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
    } catch (error) {
      console.error('❌ Erreur upload média artisanat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  /**
   * Supprimer un média selon son contexte
   */
  async deleteMedia(
    mediaId: number, 
    entityType: 'oeuvre' | 'evenement' | 'patrimoine' | 'artisanat',
    entityId: number
  ): Promise<ApiResponse<void>> {
    console.log(`🗑️ MediaService: Suppression média ${mediaId} de ${entityType} ${entityId}`);
    
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

    try {
      const result = await httpClient.delete<void>(endpoint);
      if (result.success) {
        console.log('✅ Média supprimé avec succès');
      }
      return result;
    } catch (error) {
      console.error('❌ Erreur suppression média:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la suppression'
      };
    }
  }

  /**
   * Obtenir les médias d'une entité
   */
  async getEntityMedias(
    entityType: 'oeuvre' | 'evenement' | 'patrimoine',
    entityId: number
  ): Promise<ApiResponse<Media[]>> {
    console.log(`📂 MediaService: Récupération médias de ${entityType} ${entityId}`);
    
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

    try {
      return await httpClient.get<Media[]>(endpoint);
    } catch (error) {
      console.error('❌ Erreur récupération médias:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération'
      };
    }
  }

  /**
   * Valider le type et la taille d'un fichier
   */
  validateFile(file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }): { valid: boolean; error?: string } {
    const { 
      maxSize = 10 * 1024 * 1024, // 10MB par défaut
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] 
    } = options || {};
    
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
      
      if (!ctx) {
        reject(new Error('Impossible de créer le contexte canvas'));
        return;
      }
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Calculer les nouvelles dimensions en gardant le ratio
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
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Impossible de redimensionner l\'image'));
          }
        }, file.type, 0.9);
      };
      
      img.onerror = () => {
        reject(new Error('Impossible de charger l\'image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Obtenir une preview d'image
   */
  async getImagePreview(file: File, maxSize?: number): Promise<string> {
    if (maxSize && file.size > maxSize) {
      // Redimensionner si nécessaire
      const resizedBlob = await this.resizeImage(file, 800, 800);
      return this.fileToBase64(new File([resizedBlob], file.name, { type: file.type }));
    }
    
    return this.fileToBase64(file);
  }
}

// Export de l'instance singleton
export const mediaService = new MediaService();