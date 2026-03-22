// hooks/useLieuSearch.ts
import { useState, useCallback } from 'react';
import { httpClient } from '@/services/httpClient';

interface Lieu {
  id_lieu: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  typeLieu: string;
  Wilaya?: {
    id_wilaya: number;
    nom: string;
  };
  Daira?: {
    id_daira: number;
    nom: string;
  };
  Commune?: {
    id_commune: number;
    nom: string;
  };
}

interface DetailLieu {
  id_detailLieu: number;
  id_lieu: number;
  description: string;
  horaires: string;
  histoire?: string;
  noteMoyenne?: number;
  Services?: Array<{
    id: number;
    nom: string;
  }>;
}

interface UseLieuSearchReturn {
  // Lieux
  lieux: Lieu[];
  loadingLieux: boolean;
  errorLieux: string | null;
  searchLieux: (search: string) => Promise<void>;
  
  // DetailLieux
  detailLieux: DetailLieu[];
  loadingDetailLieux: boolean;
  errorDetailLieux: string | null;
  fetchDetailLieux: (lieuId: number) => Promise<void>;
  
  // Utils
  clearErrors: () => void;
}

export const useLieuSearch = (): UseLieuSearchReturn => {
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [loadingLieux, setLoadingLieux] = useState(false);
  const [errorLieux, setErrorLieux] = useState<string | null>(null);
  
  const [detailLieux, setDetailLieux] = useState<DetailLieu[]>([]);
  const [loadingDetailLieux, setLoadingDetailLieux] = useState(false);
  const [errorDetailLieux, setErrorDetailLieux] = useState<string | null>(null);

  const searchLieux = useCallback(async (search: string) => {
    setLoadingLieux(true);
    setErrorLieux(null);
    
    try {
      const data = await httpClient.get<{ lieux: Lieu[]; pagination?: Record<string, number> }>('/lieux/search', { search, limit: 20 });
      setLieux(data.data?.lieux || []);
    } catch (err) {
      setErrorLieux(err instanceof Error ? err.message : 'Erreur inconnue');
      setLieux([]);
    } finally {
      setLoadingLieux(false);
    }
  }, []);

  const fetchDetailLieux = useCallback(async (lieuId: number) => {
    if (!lieuId) {
      setDetailLieux([]);
      return;
    }
    
    setLoadingDetailLieux(true);
    setErrorDetailLieux(null);
    
    try {
      const data = await httpClient.get<DetailLieu[]>(`/lieux/${lieuId}/details`);
      setDetailLieux(data.data || []);
    } catch (err) {
      setErrorDetailLieux(err instanceof Error ? err.message : 'Erreur inconnue');
      setDetailLieux([]);
    } finally {
      setLoadingDetailLieux(false);
    }
  }, []);

  // Nettoyer les erreurs
  const clearErrors = useCallback(() => {
    setErrorLieux(null);
    setErrorDetailLieux(null);
  }, []);

  return {
    // Lieux
    lieux,
    loadingLieux,
    errorLieux,
    searchLieux,
    
    // DetailLieux
    detailLieux,
    loadingDetailLieux,
    errorDetailLieux,
    fetchDetailLieux,
    
    // Utils
    clearErrors
  };
};

// Hook pour créer un service complet
interface ServiceData {
  nomService: string;
  lieu: {
    id_lieu?: number;
    nom?: string;
    adresse?: string;
    latitude?: number;
    longitude?: number;
    typeLieu?: string;
    wilayaId?: number;
  };
  detailLieu: {
    id_detailLieu?: number;
    description?: string;
    horaires?: string;
    histoire?: string;
    noteMoyenne?: number;
  };
  medias: Array<{
    type: string;
    url: string;
    description?: string;
  }>;
}

interface UseCreateServiceReturn {
  createService: (data: ServiceData) => Promise<Record<string, unknown> | undefined>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export const useCreateService = (): UseCreateServiceReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createService = async (data: ServiceData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await httpClient.post<Record<string, unknown>>('/services', data);

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création');
      }

      setSuccess(true);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  };

  return {
    createService,
    loading,
    error,
    success,
    reset
  };
};