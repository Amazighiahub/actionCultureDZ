// services/programme.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse } from '@/config/api';
import { httpClient } from './httpClient';

interface Programme {
  id: number;
  evenement_id: number;
  titre: string;
  description?: string;
  type_activite: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu?: string;
  salle?: string;
  capacite_max?: number;
  niveau_requis?: string;
  materiel_requis?: string[];
  intervenants?: Intervenant[];
  statut: string;
  ordre: number;
  created_at: string;
  updated_at: string;
}

interface CreateProgrammeData {
  titre: string;
  description?: string;
  type_activite: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu?: string;
  salle?: string;
  capacite_max?: number;
  niveau_requis?: string;
  materiel_requis?: string[];
  intervenant_ids?: number[];
}

interface UpdateProgrammeData extends Partial<CreateProgrammeData> {
  statut?: string;
  ordre?: number;
}

interface Intervenant {
  id: number;
  nom: string;
  prenom: string;
  titre?: string;
  bio?: string;
  photo_url?: string;
  specialites?: string[];
}

interface ReorderData {
  programmes: Array<{
    id: number;
    ordre: number;
  }>;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'ical';
  include_descriptions?: boolean;
  include_intervenants?: boolean;
}

class ProgrammeService {
  // Récupération par événement
  async getByEvent(evenementId: number): Promise<ApiResponse<Programme[]>> {
    return httpClient.get<Programme[]>(API_ENDPOINTS.programmes.byEvent(evenementId));
  }

  // Détail
  async getDetail(id: number): Promise<ApiResponse<Programme>> {
    return httpClient.get<Programme>(API_ENDPOINTS.programmes.detail(id));
  }

  // CRUD
  async create(evenementId: number, data: CreateProgrammeData): Promise<ApiResponse<Programme>> {
    return httpClient.post<Programme>(API_ENDPOINTS.programmes.create(evenementId), data);
  }

  async update(id: number, data: UpdateProgrammeData): Promise<ApiResponse<Programme>> {
    return httpClient.put<Programme>(API_ENDPOINTS.programmes.update(id), data);
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(API_ENDPOINTS.programmes.delete(id));
  }

  // Actions spécifiques
  async reorder(evenementId: number, data: ReorderData): Promise<ApiResponse<Programme[]>> {
    return httpClient.put<Programme[]>(API_ENDPOINTS.programmes.reorder(evenementId), data);
  }

  async duplicate(id: number): Promise<ApiResponse<Programme>> {
    return httpClient.post<Programme>(API_ENDPOINTS.programmes.duplicate(id));
  }

  async updateStatus(id: number, statut: string): Promise<ApiResponse<Programme>> {
    return httpClient.put<Programme>(API_ENDPOINTS.programmes.updateStatus(id), { statut });
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
  groupByDate(programmes: Programme[]): Record<string, Programme[]> {
    return programmes.reduce((acc, programme) => {
      const date = programme.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(programme);
      return acc;
    }, {} as Record<string, Programme[]>);
  }

  sortByTime(programmes: Programme[]): Programme[] {
    return [...programmes].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.heure_debut}`);
      const dateB = new Date(`${b.date} ${b.heure_debut}`);
      return dateA.getTime() - dateB.getTime();
    });
  }
}

export const programmeService = new ProgrammeService();
export type { 
  Programme, CreateProgrammeData, UpdateProgrammeData, 
  Intervenant, ReorderData, ExportOptions 
};