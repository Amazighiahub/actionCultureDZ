// services/evenement.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';
import { Programme } from '@/types';
import { mediaService } from './media.service';
import { Evenement } from '@/types/models/evenement.types';
import { Oeuvre } from '@/types/models/oeuvre.types';



interface CreateEvenementData {
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string;
  heure_debut?: string;
  heure_fin?: string;
  lieu_id?: number;
  adresse?: string;
  latitude?: number;
  longitude?: number;
  capacite_max?: number;
  inscription_requise?: boolean;
  organisation?: {
    nom: string;
    type: string;
    description?: string;
  };
  categories?: number[];
  tags?: string[];
}

interface UpdateEvenementData extends Partial<CreateEvenementData> {
  statut?: string;
}

interface EventMedia {
  id: number;
  url: string;
  type: string;
  titre?: string;
  description?: string;
  ordre: number;
}

interface Participant {
  id: number;
  user_id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  statut: string;
  date_inscription: string;
  present?: boolean;
}

export interface PublicParticipant {
  role_participation: string;
  date_inscription: string;
  User: {
    id_user: number;
    nom: string;
    prenom: string;
    photo_url?: string;
  };
}

interface PublicParticipantsResponse {
  participants: PublicParticipant[];
  total: number;
}

interface ShareData {
  title: string;
  description: string;
  url: string;
  image?: string;
  calendar_links: {
    google: string;
    outlook: string;
    ical: string;
  };
  social_links: {
    facebook: string;
    twitter: string;
    linkedin: string;
    whatsapp: string;
  };
}

interface NotificationData {
  titre: string;
  message: string;
  type: 'info' | 'rappel' | 'modification' | 'annulation';
  destinataires?: 'tous' | 'inscrits' | 'confirmes' | number[];
}

interface SearchEvenementsParams extends FilterParams {
  q?: string;
  date_debut?: string;
  date_fin?: string;
  wilaya_id?: number;
  statut?: string;
  organisateur_id?: number;
  inscription_ouverte?: boolean;
}

class EvenementService extends BaseService<Evenement, CreateEvenementData, UpdateEvenementData> {
  constructor() {
    super(API_ENDPOINTS.evenements.list);
  }

  // Override create to support FormData (multipart upload)
  async create(data: CreateEvenementData | FormData): Promise<ApiResponse<Evenement>> {
    if (data instanceof FormData) {
      return httpClient.postFormData<Evenement>(this.baseEndpoint, data);
    }
    return httpClient.post<Evenement>(this.baseEndpoint, data);
  }

  // Recherche et listing
  async getUpcoming(params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Evenement>>> {
    return httpClient.getPaginated<Evenement>(API_ENDPOINTS.evenements.upcoming, params);
  }

  async search(params: SearchEvenementsParams): Promise<ApiResponse<PaginatedResponse<Evenement>>> {
    return httpClient.getPaginated<Evenement>(API_ENDPOINTS.evenements.list, params);
  }

  // Détails et partage
  async getDetail(id: number): Promise<ApiResponse<Evenement>> {
    return httpClient.get<Evenement>(API_ENDPOINTS.evenements.detail(id));
  }

  // Programmes d'un événement
  async getProgrammes(eventId: number): Promise<ApiResponse<{ programmes: Programme[] }>> {
    // L'endpoint correct est /programmes/evenement/:evenementId
    return httpClient.get<{ programmes: Programme[] }>(API_ENDPOINTS.programmes.byEvent(eventId));
  }

  async getShareData(id: number): Promise<ApiResponse<ShareData>> {
    return httpClient.get<ShareData>(API_ENDPOINTS.evenements.shareData(id));
  }

  // Gestion de l'événement
  async cancel(id: number, reason: string): Promise<ApiResponse<Evenement>> {
    return httpClient.post<Evenement>(API_ENDPOINTS.evenements.cancel(id), { reason });
  }

  // Participation
  async inscription(eventId: number, data?: { nombre_personnes?: number; commentaire?: string; oeuvres?: number[]; notes?: string }): Promise<ApiResponse<{ inscription: { id: number; statut: string; date_inscription: string }; oeuvres_soumises: number; reference?: string }>> {
    return httpClient.post<{ inscription: { id: number; statut: string; date_inscription: string }; oeuvres_soumises: number; reference?: string }>(API_ENDPOINTS.evenements.inscription(eventId), data);
  }

  async desinscription(eventId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.evenements.desinscription(eventId));
  }

  /**
   * Vérifier si l'utilisateur est inscrit à un événement
   */
  async checkRegistration(eventId: number): Promise<ApiResponse<{ isRegistered: boolean; status: string | null; inscription?: { id: number; statut: string; date_inscription: string } }>> {
    try {
      const response = await httpClient.get<{ isRegistered: boolean; status: string | null; inscription?: { id: number; statut: string; date_inscription: string } }>(
        `/evenements/${eventId}/mon-inscription`
      );
      return response;
    } catch (error: unknown) {
      // Si 404, l'utilisateur n'est pas inscrit
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        return {
          success: true,
          data: { isRegistered: false, status: null }
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la vérification'
      };
    }
  }

  async getParticipants(eventId: number, params?: FilterParams): Promise<ApiResponse<PaginatedResponse<Participant>>> {
    return httpClient.getPaginated<Participant>(API_ENDPOINTS.evenements.participants(eventId), params);
  }

  async getPublicParticipants(eventId: number): Promise<ApiResponse<PublicParticipantsResponse>> {
    return httpClient.get<PublicParticipantsResponse>(API_ENDPOINTS.evenements.publicParticipants(eventId));
  }

  async validateParticipation(eventId: number, userId: number, validated: boolean): Promise<ApiResponse<void>> {
    return httpClient.put<void>(
      API_ENDPOINTS.evenements.validateParticipation(eventId, userId),
      { validated }
    );
  }

  async getProfessionnelsEnAttente(eventId: number): Promise<ApiResponse<Participant[]>> {
    return httpClient.get<Participant[]>(API_ENDPOINTS.evenements.professionnelsEnAttente(eventId));
  }

  // Médias
  async getMedias(id: number): Promise<ApiResponse<EventMedia[]>> {
    return httpClient.get<EventMedia[]>(API_ENDPOINTS.evenements.medias(id));
  }

  async addMedias(eventId: number, files: File[]): Promise<ApiResponse<EventMedia[]>> {
    // Utiliser mediaService pour upload multiple
    const uploadResult = await mediaService.uploadMultiple(files, 'evenement', eventId);

    if (uploadResult.success && uploadResult.data) {
      // Transformer la réponse pour correspondre au type EventMedia[]
      const eventMedias: EventMedia[] = uploadResult.data.map((media, index) => ({
        id: media.media_id || 0,
        url: media.url,
        type: media.type || 'image',
        titre: media.filename,
        description: '',
        ordre: index
      }));

      return {
        success: true,
        data: eventMedias
      };
    }

    return {
      success: false,
      error: uploadResult.error || 'Erreur lors de l\'upload des médias'
    };
  }

  async deleteMedia(eventId: number, mediaId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.evenements.deleteMedia(eventId, mediaId));
  }

  // Espace professionnel
  async getMesOeuvres(eventId: number): Promise<ApiResponse<Oeuvre[]>> {
    return httpClient.get<Oeuvre[]>(API_ENDPOINTS.evenements.mesOeuvres(eventId));
  }

  async addOeuvre(eventId: number, oeuvreId: number): Promise<ApiResponse<void>> {
    return httpClient.post<void>(API_ENDPOINTS.evenements.addOeuvre(eventId), { id_oeuvre: oeuvreId });
  }

  async removeOeuvre(eventId: number, oeuvreId: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.evenements.removeOeuvre(eventId, oeuvreId));
  }

  // Export
  async exportParticipants(eventId: number, format: 'excel' | 'pdf' | 'csv' = 'excel'): Promise<ApiResponse<Blob>> {
    return httpClient.download(
      `${API_ENDPOINTS.evenements.export(eventId)}?format=${format}`,
      `participants_${eventId}.${format}`
    );
  }

  // Statistiques
  async getStatistics(): Promise<ApiResponse<{
    total_evenements: number;
    evenements_by_status: Record<string, number>;
    participants_total: number;
    upcoming_count: number;
    top_locations: Array<{ wilaya: string; count: number }>;
  }>> {
    return httpClient.get<{ total_evenements: number; evenements_by_status: Record<string, number>; participants_total: number; upcoming_count: number; top_locations: Array<{ wilaya: string; count: number }> }>(API_ENDPOINTS.evenements.statistics);
  }

  
/**
 * Récupérer les événements où une œuvre est présentée
 */
async getQRCode(eventId: number, size = 300): Promise<ApiResponse<{ qr_data_url: string; event_url: string; event_id: number }>> {
  return httpClient.get<{ qr_data_url: string; event_url: string; event_id: number }>(
    `${API_ENDPOINTS.evenements.qrcode(eventId)}?size=${size}`
  );
}

async getByOeuvre(oeuvreId: number): Promise<ApiResponse<Evenement[]>> {
  try {
    const response = await httpClient.get<Evenement[]>(
      `/evenements/oeuvre/${oeuvreId}`
    );

    if (response.success && response.data) {
      return response;
    }
    
    return {
      success: false,
      error: response.error || 'Aucun événement trouvé'
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des événements'
    };
  }
}
}

export const evenementService = new EvenementService();
export type {
  Evenement, CreateEvenementData, UpdateEvenementData, EventMedia,
  Participant, ShareData, NotificationData, SearchEvenementsParams
};