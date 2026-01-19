// services/programme.service.ts - Version adaptée pour User comme intervenant
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse } from '@/config/api';
import { httpClient } from './httpClient';

// Interface pour un intervenant (qui est un User avec des infos supplémentaires)
interface IntervenantUser {
  id_user: number;
  nom: string;
  prenom: string;
  email: string;
  type_user: string;
  photo_url?: string;
  entreprise?: string;
  biographie?: string;
  // Infos spécifiques à l'intervention via ProgrammeIntervenant
  ProgrammeIntervenant?: {
    role_intervenant: 'principal' | 'co_intervenant' | 'moderateur' | 'invite' | 'animateur';
    statut_confirmation: 'en_attente' | 'confirme' | 'decline' | 'annule';
    sujet_intervention?: string;
    ordre_intervention?: number;
    duree_intervention?: number;
    biographie_courte?: string;
    honoraires?: number;
    frais_deplacement?: number;
  };
}

interface Programme {
  id_programme: number;
  id_evenement: number;
  titre: string;
  description?: string;
  type_activite: string;
  heure_debut: string;
  heure_fin: string;
  id_lieu?: number;
  lieu_specifique?: string;
  nb_participants_max?: number;
  niveau_requis?: string;
  materiel_requis?: string[];
  statut: 'planifie' | 'en_cours' | 'termine' | 'annule' | 'reporte';
  ordre: number;
  // Relations
  Lieu?: {
    nom: string;
    adresse?: string;
    latitude?: number;
    longitude?: number;
  };
  Intervenants?: IntervenantUser[];
  date_creation: string;
  date_modification: string;
}

// Données pour créer/modifier une association intervenant
interface IntervenantData {
  id_user: number;
  role_intervenant?: 'principal' | 'co_intervenant' | 'moderateur' | 'invite' | 'animateur';
  sujet_intervention?: string;
  biographie_courte?: string;
  ordre_intervention?: number;
  duree_intervention?: number;
  honoraires?: number;
  frais_deplacement?: number;
  logement_requis?: boolean;
  materiel_technique?: string[];
}

interface CreateProgrammeData {
  titre: string;
  description?: string;
  type_activite: string;
  heure_debut: string;
  heure_fin: string;
  id_lieu?: number;
  lieu_specifique?: string;
  nb_participants_max?: number;
  niveau_requis?: string;
  materiel_requis?: string[];
  notes_organisateur?: string;
  // Intervenants avec leurs détails
  intervenants?: IntervenantData[];
}

interface UpdateProgrammeData extends Partial<CreateProgrammeData> {
  statut?: 'planifie' | 'en_cours' | 'termine' | 'annule' | 'reporte';
  ordre?: number;
}

interface ReorderData {
  programmes: Array<{
    id: number;
    ordre: number;
  }>;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  include_descriptions?: boolean;
  include_intervenants?: boolean;
}

interface ProgrammesByDay {
  [date: string]: Programme[];
}

interface ProgrammeListResponse {
  programmes: Programme[];
  byDay: ProgrammesByDay;
  total: number;
}

class ProgrammeService {
  // Récupération par événement
  async getByEvent(
    evenementId: number, 
    filters?: { date?: string; type_activite?: string }
  ): Promise<ApiResponse<ProgrammeListResponse>> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.type_activite) params.append('type_activite', filters.type_activite);
    
    const url = params.toString() 
      ? `${API_ENDPOINTS.programmes.byEvent(evenementId)}?${params}`
      : API_ENDPOINTS.programmes.byEvent(evenementId);
      
    return httpClient.get<ProgrammeListResponse>(url);
  }

  // Détail d'un programme
  async getDetail(id: number): Promise<ApiResponse<Programme>> {
    return httpClient.get<Programme>(API_ENDPOINTS.programmes.detail(id));
  }

  // Créer un programme
  async create(evenementId: number, data: CreateProgrammeData): Promise<ApiResponse<Programme>> {
    return httpClient.post<Programme>(
      API_ENDPOINTS.programmes.create(evenementId), 
      data
    );
  }

  // Mettre à jour un programme
  async update(id: number, data: UpdateProgrammeData): Promise<ApiResponse<Programme>> {
    return httpClient.put<Programme>(API_ENDPOINTS.programmes.update(id), data);
  }

  // Supprimer un programme
  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.programmes.delete(id));
  }

  // Réorganiser l'ordre des programmes
  async reorder(evenementId: number, data: ReorderData): Promise<ApiResponse<Programme[]>> {
    return httpClient.put<Programme[]>(
      API_ENDPOINTS.programmes.reorder(evenementId), 
      data
    );
  }

  // Dupliquer un programme
  async duplicate(
    id: number, 
    newTimes?: { heure_debut: string; heure_fin: string }
  ): Promise<ApiResponse<Programme>> {
    return httpClient.post<Programme>(
      API_ENDPOINTS.programmes.duplicate(id),
      newTimes || {}
    );
  }

  // Mettre à jour le statut
  async updateStatus(
    id: number, 
    statut: 'planifie' | 'en_cours' | 'termine' | 'annule' | 'reporte'
  ): Promise<ApiResponse<Programme>> {
    return httpClient.patch<Programme>(
      API_ENDPOINTS.programmes.updateStatus(id), 
      { statut }
    );
  }

  // Confirmer/décliner un intervenant
  async updateIntervenantStatus(
    programmeId: number,
    userId: number,
    statut: 'confirme' | 'decline',
    raison?: string
  ): Promise<ApiResponse<void>> {
    return httpClient.patch<void>(
      `/api/programmes/${programmeId}/intervenant/${userId}/statut`,
      { statut, raison }
    );
  }

  // Export
  async export(evenementId: number, options: ExportOptions): Promise<ApiResponse<Blob>> {
    const params = new URLSearchParams({
      format: options.format,
      include_descriptions: String(options.include_descriptions || false),
      include_intervenants: String(options.include_intervenants || false)
    });

    return httpClient.download(
      `${API_ENDPOINTS.programmes.export(evenementId)}?${params}`,
      `programme_${evenementId}.${options.format}`
    );
  }

  // Helpers
  formatProgrammeTime(programme: Programme): string {
    const debut = new Date(programme.heure_debut).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const fin = new Date(programme.heure_fin).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${debut} - ${fin}`;
  }

  getDuration(programme: Programme): number {
    const debut = new Date(programme.heure_debut);
    const fin = new Date(programme.heure_fin);
    return Math.round((fin.getTime() - debut.getTime()) / (1000 * 60)); // en minutes
  }

  isProgrammeActive(programme: Programme): boolean {
    const now = new Date();
    const debut = new Date(programme.heure_debut);
    const fin = new Date(programme.heure_fin);
    return now >= debut && now <= fin;
  }

  isProgrammeUpcoming(programme: Programme): boolean {
    const now = new Date();
    const debut = new Date(programme.heure_debut);
    return debut > now;
  }

  isProgrammePast(programme: Programme): boolean {
    const now = new Date();
    const fin = new Date(programme.heure_fin);
    return fin < now;
  }

  getIntervenantsNames(programme: Programme): string {
    if (!programme.Intervenants || programme.Intervenants.length === 0) {
      return 'Aucun intervenant';
    }
    return programme.Intervenants
      .map(i => `${i.prenom} ${i.nom}`)
      .join(', ');
  }

  getConfirmedIntervenants(programme: Programme): IntervenantUser[] {
    if (!programme.Intervenants) return [];
    return programme.Intervenants.filter(
      i => i.ProgrammeIntervenant?.statut_confirmation === 'confirme'
    );
  }
}

export const programmeService = new ProgrammeService();
export type { 
  Programme, 
  CreateProgrammeData, 
  UpdateProgrammeData, 
  IntervenantUser,
  IntervenantData,
  ReorderData, 
  ExportOptions,
  ProgrammeListResponse,
  ProgrammesByDay
};