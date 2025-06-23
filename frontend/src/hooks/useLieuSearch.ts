// hooks/useLieuSearch.ts
import { useState, useEffect, useCallback } from 'react';

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

export const useLieuSearch = (apiUrl: string = ''): UseLieuSearchReturn => {
  const API_BASE_URL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  
  // États pour les lieux
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [loadingLieux, setLoadingLieux] = useState(false);
  const [errorLieux, setErrorLieux] = useState<string | null>(null);
  
  // États pour les DetailLieux
  const [detailLieux, setDetailLieux] = useState<DetailLieu[]>([]);
  const [loadingDetailLieux, setLoadingDetailLieux] = useState(false);
  const [errorDetailLieux, setErrorDetailLieux] = useState<string | null>(null);

  // Rechercher des lieux
  const searchLieux = useCallback(async (search: string) => {
    setLoadingLieux(true);
    setErrorLieux(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/lieux/search?search=${encodeURIComponent(search)}&limit=20`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLieux(data.data?.lieux || []);
    } catch (err) {
      console.error('Erreur lors de la recherche de lieux:', err);
      setErrorLieux(err instanceof Error ? err.message : 'Erreur inconnue');
      setLieux([]);
    } finally {
      setLoadingLieux(false);
    }
  }, [API_BASE_URL]);

  // Récupérer les DetailLieux d'un lieu
  const fetchDetailLieux = useCallback(async (lieuId: number) => {
    if (!lieuId) {
      setDetailLieux([]);
      return;
    }
    
    setLoadingDetailLieux(true);
    setErrorDetailLieux(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/lieux/${lieuId}/detail-lieux`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDetailLieux(data.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des DetailLieux:', err);
      setErrorDetailLieux(err instanceof Error ? err.message : 'Erreur inconnue');
      setDetailLieux([]);
    } finally {
      setLoadingDetailLieux(false);
    }
  }, [API_BASE_URL]);

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
  createService: (data: ServiceData) => Promise<any>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export const useCreateService = (apiUrl: string = ''): UseCreateServiceReturn => {
  const API_BASE_URL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createService = async (data: ServiceData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/services/complet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
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