// services/evenement.service.ts
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';
import { Programme } from '@/types';
import { Evenement } from '@/types/models/evenement.types';
import type { Reponses } from '@/utils/formulaireInscription';
import { reponseEchec } from '@/utils/erreurServeur';
import i18next from 'i18next';

/** Données d'inscription : formulaire de base et/ou réponses au formulaire du type d'événement */
export interface InscriptionPayload {
  nombre_personnes?: number;
  commentaire?: string;
  oeuvres?: number[];
  reponses?: Reponses;
}


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

/** Média d'un événement, tel que le serveur le renvoie (table media) */
interface EventMedia {
  id_media: number;
  url: string;
  type_media: 'image' | 'video' | 'document' | 'diaporama' | 'audio' | string;
  titre?: unknown;
  description?: unknown;
  credit?: string | null;
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

/** Document PDF d'un événement ; `lien` est servi par le site (/api/evenements/:id/documents/:idMedia/document.pdf) */
export interface DocumentEvenement {
  id_media: number;
  titre: string | Record<string, string>;
  lien: string;
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

  // Modification avec une nouvelle image : même envoi que la création
  async update(id: number, data: UpdateEvenementData | FormData): Promise<ApiResponse<Evenement>> {
    if (data instanceof FormData) {
      return httpClient.putFormData<Evenement>(`${this.baseEndpoint}/${id}`, data);
    }
    return httpClient.put<Evenement>(`${this.baseEndpoint}/${id}`, data);
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

  // Gestion de l'événement
  async cancel(id: number, reason: string): Promise<ApiResponse<Evenement>> {
    return httpClient.post<Evenement>(API_ENDPOINTS.evenements.cancel(id), { motif: reason });
  }

  // Participation
  async inscription(eventId: number, data?: InscriptionPayload): Promise<ApiResponse<{ inscription: { id: number; statut: string; date_inscription: string }; oeuvres_soumises: number; reference?: string }>> {
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
        ...reponseEchec(error, i18next.t('common.errorOccurred', 'Une erreur est survenue'))
      };
    }
  }

  async getPublicParticipants(eventId: number): Promise<ApiResponse<PublicParticipantsResponse>> {
    return httpClient.get<PublicParticipantsResponse>(API_ENDPOINTS.evenements.publicParticipants(eventId));
  }

  // Documents PDF de l'événement (programme complet, présentation…)
  async getDocuments(id: number): Promise<ApiResponse<DocumentEvenement[]>> {
    return httpClient.get<DocumentEvenement[]>(`/evenements/${id}/documents`);
  }

  async ajouterDocument(id: number, url: string, titre: string): Promise<ApiResponse<DocumentEvenement>> {
    return httpClient.post<DocumentEvenement>(`/evenements/${id}/documents`, { url, titre });
  }

  // Photos de l'événement (galerie) : ajoutées par l'organisateur
  async ajouterPhoto(id: number, photo: { url: string; legende?: string; credit?: string }): Promise<ApiResponse<EventMedia>> {
    return httpClient.post<EventMedia>(`/evenements/${id}/photos`, photo);
  }

  async retirerPhoto(id: number, idMedia: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/evenements/${id}/photos/${idMedia}`);
  }

  async retirerDocument(id: number, idMedia: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/evenements/${id}/documents/${idMedia}`);
  }

  // Médias
  async getMedias(id: number): Promise<ApiResponse<EventMedia[]>> {
    return httpClient.get<EventMedia[]>(API_ENDPOINTS.evenements.medias(id));
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
      ...reponseEchec(error, i18next.t('common.errorOccurred', 'Une erreur est survenue'))
    };
  }
}
}

export const evenementService = new EvenementService();
export type {
  Evenement, CreateEvenementData, UpdateEvenementData, EventMedia,
  Participant, NotificationData, SearchEvenementsParams
};