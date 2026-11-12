// services/media.service.ts - Version corrigée
import { uploadService, type UploadResponse } from './upload.service';
import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '@/config/api';
import type { ApiResponse } from '@/config/api';
import { reponseEchec } from '@/utils/erreurServeur';
import i18next from 'i18next';

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
  // Photo de profil : userService.updateProfilePhoto (route /upload/profile-photo, qui met le profil à jour)

  /**
   * Upload d'un fichier pour une œuvre
   */
  async uploadOeuvreMedia(
    file: File, 
    oeuvreId: number,
    options?: MediaUploadOptions
  ): Promise<ApiResponse<MediaUploadResponse>> {
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
      return {
        ...reponseEchec(error, i18next.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }
}

// Export de l'instance singleton
export const mediaService = new MediaService();