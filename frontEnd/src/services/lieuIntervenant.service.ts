import { httpClient } from './httpClient';
import type { TranslatableValue } from '@/types/common/multilingual.types';

export interface LieuIntervenant {
  id_lieu_intervenant: number;
  id_lieu: number;
  id_intervenant: number;
  role_sur_site?: string | null;
  periode?: string | null;
  contexte?: string | null;
  ordre: number;
  id_contributeur?: number | null;
  date_creation: string;
  date_modification: string;
  Intervenant?: {
    id_intervenant: number;
    nom: string | TranslatableValue;
    prenom: string | TranslatableValue;
    titre_professionnel?: string;
    photo_url?: string;
    specialites?: string[];
    biographie?: string | TranslatableValue;
    wikipedia_url?: string;
    date_naissance?: string | null;
    lieu_naissance?: string | null;
    date_deces?: string | null;
    lieu_deces?: string | null;
    id_user?: number | null;
  };
}

export interface AddIntervenantPayload {
  id_intervenant: number;
  role_sur_site?: string;
  periode?: string;
  contexte?: string;
  ordre?: number;
}

export const lieuIntervenantService = {
  getByLieu: async (lieuId: number): Promise<LieuIntervenant[]> => {
    const res = await httpClient.get<{ success: boolean; data: LieuIntervenant[] }>(
      `/patrimoine/${lieuId}/intervenants`
    );
    return (res as any).data ?? [];
  },

  /** null : rattachement envoyé comme proposition à l'équipe (hors équipe et créateur du site) */
  add: async (lieuId: number, payload: AddIntervenantPayload): Promise<LieuIntervenant | null> => {
    const res = await httpClient.post<{ success: boolean; data: LieuIntervenant }>(
      `/patrimoine/${lieuId}/intervenants`,
      payload
    );
    if ((res as { proposition?: boolean }).proposition) return null;
    return (res as any).data;
  },

  remove: async (lieuId: number, lieuIntervenantId: number): Promise<void> => {
    await httpClient.delete(`/patrimoine/${lieuId}/intervenants/${lieuIntervenantId}`);
  },

  searchIntervenants: async (q: string, limit = 10): Promise<any[]> => {
    if (q.length < 2) return [];
    const res = await httpClient.get<{ success: boolean; data: any[] }>(
      `/intervenants/search?q=${encodeURIComponent(q)}&limit=${limit}`
    );
    return (res as any).data ?? [];
  },
};
