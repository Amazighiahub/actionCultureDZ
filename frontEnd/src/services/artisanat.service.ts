// services/artisanat.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';

interface Artisanat {
  id: number;
  nom: string;
  description: string;
  id_materiau: number;
  id_technique: number;
  artisan_id: number;
  wilaya_id: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande: boolean;
  en_stock?: number;
  medias?: MediaArtisanat[];
  tags?: string[];
  note_moyenne?: number;
  nombre_avis?: number;
  created_at: string;
  updated_at: string;
  // Données étendues pour la page détail
  Oeuvre?: {
    id_oeuvre: number;
    titre: { fr: string; ar: string; en: string };
    description?: { fr: string; ar: string; en: string };
    annee_creation?: number;
    statut: string;
    date_creation: string;
    Saiseur?: {
      id_user: number;
      nom: string;
      prenom: string;
      photo_url?: string;
      email?: string;
      telephone?: string;
      biographie?: string;
      role?: string;
      Wilaya?: { nom: string; code: string };
    };
    Media?: Array<{
      id_media: number;
      url: string;
      type_media: string;
      thumbnail_url?: string;
      ordre?: number;
    }>;
    TypeOeuvre?: { id_type_oeuvre: number; nom_type: string };
    Commentaires?: Array<{
      id_commentaire: number;
      id_user: number;
      nom_user: string;
      prenom_user: string;
      photo_url?: string;
      commentaire: string;
      note?: number;
      date_creation: string;
    }>;
  };
  Materiau?: { id_materiau: number; nom: string; description?: string };
  Technique?: { id_technique: number; nom: string; description?: string };
  statistiques?: {
    vues: number;
    favoris: number;
    commentaires: number;
  };
  similaires?: Artisanat[];
  autres_oeuvres_artisan?: Artisanat[];
}

interface CreateArtisanatData {
  nom: string;
  description: string;
  id_materiau: number;
  id_technique: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande?: boolean;
  en_stock?: number;
  tags?: string[];
}

type UpdateArtisanatData = Partial<CreateArtisanatData>;

interface MediaArtisanat {
  id: number;
  url: string;
  type: string;
  titre?: string;
  ordre: number;
  is_principale: boolean;
}

interface Artisan {
  id: number;
  user_id: number;
  nom: string;
  prenom: string;
  specialites: string[];
  wilaya: string;
  experience_annees: number;
  certifications?: string[];
  photo_url?: string;
}

interface SearchArtisanatParams extends FilterParams {
  q?: string;
  materiau_id?: number;
  technique_id?: number;
  wilaya_id?: number;
  prix_min?: number;
  prix_max?: number;
  sur_commande?: boolean;
  en_stock?: boolean;
  artisan_id?: number;
}

interface ArtisanatStatistics {
  total_produits: number;
  total_artisans: number;
  produits_par_materiau: Record<string, number>;
  produits_par_technique: Record<string, number>;
  artisans_par_wilaya: Array<{ wilaya: string; count: number }>;
  moyenne_prix: number;
}

class ArtisanatService extends BaseService<Artisanat, CreateArtisanatData, UpdateArtisanatData> {
  constructor() {
    super(API_ENDPOINTS.artisanat.list);
  }

  // Recherche et listing
  async search(params: SearchArtisanatParams): Promise<ApiResponse<PaginatedResponse<Artisanat>>> {
    return httpClient.getPaginated<Artisanat>(API_ENDPOINTS.artisanat.search, params);
  }

  async getArtisansByRegion(wilayaId: number): Promise<ApiResponse<Artisan[]>> {
    return httpClient.get<Artisan[]>(API_ENDPOINTS.artisanat.artisansByRegion(wilayaId));
  }

  // Détails
  async getDetail(id: number): Promise<ApiResponse<Artisanat>> {
    return httpClient.get<Artisanat>(API_ENDPOINTS.artisanat.detail(id));
  }

  // Médias
  async uploadMedias(
    artisanatId: number, 
    files: File[]
  ): Promise<ApiResponse<MediaArtisanat[]>> {
    // TODO: Implémenter l'upload des médias
    return { success: false, error: 'Non implémenté' };
  }

  // Œuvres d'un artisan
  async getArtisanWorks(artisanId: number): Promise<ApiResponse<any[]>> {
    // TODO: Implémenter la récupération des œuvres de l'artisan
    return { success: true, data: [] };
  }

  // Statistiques
  async getStatistics(): Promise<ApiResponse<ArtisanatStatistics>> {
    return httpClient.get<ArtisanatStatistics>(API_ENDPOINTS.artisanat.statistics);
  }
}

export const artisanatService = new ArtisanatService();
export type { 
  Artisanat, CreateArtisanatData, UpdateArtisanatData, 
  MediaArtisanat, Artisan, SearchArtisanatParams, ArtisanatStatistics 
};