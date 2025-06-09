// hooks/useOeuvre.ts - Version corrigée avec types
import { useState, useEffect, useCallback } from 'react';
import OeuvreService from '../services/oeuvre.service';
import { Oeuvre, OeuvreForm } from '../types/Oeuvre.types';
import { OeuvreFilters } from '../services/oeuvre.service';

import { 
  ApiResponse,
  
  getErrorMessage  // ← Cette fonction est nécessaire
} from '../types/api.types';

// Type pour la pagination
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Type pour la réponse paginée
interface PaginatedApiResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: PaginationInfo;
  error?: string;
  message?: string;
}

interface UseOeuvreOptions {
  filters?: OeuvreFilters;
  autoLoad?: boolean;
}

export const useOeuvre = (options: UseOeuvreOptions = {}) => {
  const { filters = {}, autoLoad = true } = options;
  
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOeuvres = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await OeuvreService.getAll(filters) as PaginatedApiResponse<Oeuvre>;
      
      if (response.success && response.data) {
        setOeuvres(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error || 'Erreur de chargement');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement des œuvres');
      setOeuvres([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoLoad) {
      loadOeuvres();
    }
  }, [JSON.stringify(filters), autoLoad]);

  const createOeuvre = useCallback(async (data: OeuvreForm) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await OeuvreService.create(data);
      
      if (response.success && response.data) {
        await loadOeuvres();
        return response.data;
      } else {
        throw new Error(response.error || 'Erreur de création');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de création');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadOeuvres]);

  const updateOeuvre = useCallback(async (id: number, data: Partial<Oeuvre>) => {
  try {
    setIsLoading(true);
    setError(null);
    
    const response = await OeuvreService.update(id, data) as ApiResponse<Oeuvre>;
    
    if (response.success && response.data) {
      const updatedOeuvre = response.data; // ✅ Stockage dans une variable
      setOeuvres(prev => prev.map(o => 
        o.idOeuvre === id ? updatedOeuvre : o  // ✅ Utilisation de la variable
      ));
      return updatedOeuvre;
    } else {
      throw new Error(getErrorMessage(response, 'Erreur de mise à jour'));
    }
  } catch (error: any) {
    setError(error.message || 'Erreur de mise à jour');
    throw error;
  } finally {
    setIsLoading(false);
  }
}, []);


  const deleteOeuvre = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await OeuvreService.delete(id);
      
      if (response.success) {
        setOeuvres(prev => prev.filter(o => o.idOeuvre !== id));
      } else {
        throw new Error(response.error || 'Erreur de suppression');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de suppression');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    oeuvres,
    pagination,
    isLoading,
    error,
    loadOeuvres,
    createOeuvre,
    updateOeuvre,
    deleteOeuvre
  };
};

// Hook pour le détail d'une œuvre
export const useOeuvreDetail = (id: number) => {
  const [oeuvre, setOeuvre] = useState<Oeuvre | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOeuvre();
    }
  }, [id]);

  const loadOeuvre = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await OeuvreService.getById(id);
      
      if (response.success && response.data) {
        setOeuvre(response.data);
      } else {
        throw new Error(response.error || 'Œuvre introuvable');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement');
      setOeuvre(null);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMedia = async (file: File, data?: any) => {
    try {
      const response = await OeuvreService.uploadMedia(id, file, data);
      if (response.success) {
        await loadOeuvre(); // Recharger pour avoir les nouveaux médias
        return response.data;
      } else {
        throw new Error(response.error || 'Erreur d\'upload');
      }
    } catch (error) {
      throw error;
    }
  };

  return {
    oeuvre,
    isLoading,
    error,
    reload: loadOeuvre,
    uploadMedia
  };
};