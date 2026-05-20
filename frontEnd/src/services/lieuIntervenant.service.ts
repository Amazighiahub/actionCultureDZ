import { httpClient } from './httpClient';

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
    nom: string | { fr?: string; ar?: string; [k: string]: string | undefined };
    prenom: string | { fr?: string; ar?: string; [k: string]: string | undefined };
    titre_professionnel?: string;
    photo_url?: string;
    specialites?: string[];
    biographie?: string | { fr?: string; ar?: string; [k: string]: string | undefined };
    wikipedia_url?: string;
  };
}

export interface AddIntervenantPayload {
  id_intervenant: number;
  role_sur_site?: string;
  periode?: string;
  contexte?: string;
  ordre?: number;
}

export function getIntervenantNom(
  val: string | { fr?: string; ar?: string; [k: string]: string | undefined } | undefined,
  lang = 'fr'
): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val.fr || val.ar || '';
}

export const lieuIntervenantService = {
  getByLieu: async (lieuId: number): Promise<LieuIntervenant[]> => {
    const res = await httpClient.get<{ success: boolean; data: LieuIntervenant[] }>(
      `/patrimoine/${lieuId}/intervenants`
    );
    return (res as any).data ?? [];
  },

  add: async (lieuId: number, payload: AddIntervenantPayload): Promise<LieuIntervenant> => {
    const res = await httpClient.post<{ success: boolean; data: LieuIntervenant }>(
      `/patrimoine/${lieuId}/intervenants`,
      payload
    );
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

  getTypes: async (): Promise<string[]> => {
    const res = await httpClient.get<{ success: boolean; data: any[] }>('/intervenants/types');
    const data = (res as any).data ?? [];
    return data.map((t: any) => t.type_intervenant || t.nom || t).filter(Boolean);
  },

  createIntervenant: async (payload: {
    nom: { fr: string; ar?: string };
    prenom: { fr: string; ar?: string };
    type_intervenant: string;
    titre_professionnel?: string;
    biographie?: { fr?: string };
  }): Promise<any> => {
    const res = await httpClient.post<{ success: boolean; data: any }>('/intervenants', payload);
    return (res as any).data;
  },
};
