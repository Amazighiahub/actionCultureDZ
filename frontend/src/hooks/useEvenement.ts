// hooks/useEvenement.ts - Version corrigée avec types
import EvenementService from '../services/evenement.service';
import { Evenement } from '../types/Evenement.types';
import { EvenementFilters } from '../services/evenement.service';
import { useCallback, useEffect, useState } from 'react';

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

export const useEvenement = (filters: EvenementFilters = {}) => {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvenements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await EvenementService.getAll(filters) as PaginatedApiResponse<Evenement>;
      
      if (response.success && response.data) {
        setEvenements(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error || 'Erreur de chargement');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement des événements');
      setEvenements([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadEvenements();
  }, [JSON.stringify(filters)]);

  const createEvenement = useCallback(async (data: Partial<Evenement>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await EvenementService.create(data);
      
      if (response.success && response.data) {
        await loadEvenements();
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
  }, [loadEvenements]);

  const updateEvenement = useCallback(async (id: number, data: Partial<Evenement>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await EvenementService.update(id, data);
      
      if (response.success && response.data) {
        setEvenements(prev => prev.map(e => 
          e.idEvenement === id ? response.data! : e
        ));
        return response.data;
      } else {
        throw new Error(response.error || 'Erreur de mise à jour');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de mise à jour');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteEvenement = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await EvenementService.cancel(id, 'Suppression');
      
      if (response.success) {
        setEvenements(prev => prev.filter(e => e.idEvenement !== id));
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

  const inscription = useCallback(async (id: number, data?: any) => {
    try {
      const response = await EvenementService.inscription(id, data);
      if (response.success) {
        await loadEvenements();
        return response.data;
      } else {
        throw new Error(response.error || 'Erreur d\'inscription');
      }
    } catch (error: any) {
      throw error;
    }
  }, [loadEvenements]);

  const desinscription = useCallback(async (id: number) => {
    try {
      const response = await EvenementService.desinscription(id);
      if (response.success) {
        await loadEvenements();
      } else {
        throw new Error(response.error || 'Erreur de désinscription');
      }
    } catch (error: any) {
      throw error;
    }
  }, [loadEvenements]);

  return {
    evenements,
    pagination,
    isLoading,
    error,
    loadEvenements,
    createEvenement,
    updateEvenement,
    deleteEvenement,
    inscription,
    desinscription
  };
};