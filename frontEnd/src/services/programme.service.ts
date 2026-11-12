// services/programme.service.ts - Version adaptée pour User comme intervenant
import { dureeMinutes } from '@/utils/programmeHoraire';
import { API_ENDPOINTS, ApiResponse } from '@/config/api';
import { httpClient } from './httpClient';

// Interface pour un intervenant (qui est un User avec des infos supplémentaires)
interface IntervenantUser {
  /** Fiche intervenant (présente même sans compte sur le site) */
  id_intervenant?: number;
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
  /** Fiche intervenant existante (choisie dans les suggestions) */
  id_intervenant?: number;
  /** Compte du site, s'il en a un (facultatif : un intervenant peut ne pas avoir de compte) */
  id_user?: number;
  prenom?: string;
  nom?: string;
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
  // Texte (langue courante) ou objet multilingue { fr, ar, ... } : le serveur fusionne
  titre: string | Partial<Record<string, string>>;
  description?: string | Partial<Record<string, string>>;
  type_activite: string;
  heure_debut?: string; // facultative
  heure_fin?: string;
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

  // Toutes les langues, pour le formulaire de modification
  async getDetailPourModification(id: number): Promise<ApiResponse<Programme>> {
    return httpClient.get<Programme>(API_ENDPOINTS.programmes.detail(id), { i18n: 'all' });
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

  /** Durée en minutes (heures « 10:00:00 » renvoyées par le serveur, ou ISO) */
  getDuration(programme: Programme): number {
    return dureeMinutes(programme.heure_debut, programme.heure_fin);
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