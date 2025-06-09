// hooks/usePatrimoine.ts - Version complètement corrigée avec gestion des types
import PatrimoineService from '../services/patrimoine.service';
import { Lieu } from '../types/Geographie.types';
import { PatrimoineFilters } from '../services/patrimoine.service';
import { useCallback, useEffect, useState } from 'react';
import { 
  ApiResponse,
  PaginatedApiResponse, 
  PaginationInfo,
  getErrorMessage 
} from '../types/api.types';

export const usePatrimoine = (filters: PatrimoineFilters = {}) => {
  const [sites, setSites] = useState<Lieu[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.getSites(filters) as PaginatedApiResponse<Lieu>;
      
      if (response.success && response.data) {
        setSites(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des sites'));
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement des sites');
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSites();
  }, [JSON.stringify(filters)]);

  const createSite = useCallback(async (data: Partial<Lieu>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.createSite(data) as ApiResponse<Lieu>;
      
      if (response.success && response.data) {
        await loadSites();
        return response.data;
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de création'));
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de création');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadSites]);

  const updateSite = useCallback(async (id: number, data: Partial<Lieu>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.updateSite(id, data) as ApiResponse<Lieu>;
      
      if (response.success && response.data) {
        const updatedSite = response.data; // Stockage dans une variable pour éviter l'erreur TS
        setSites(prev => prev.map(s => 
          s.idLieu === id ? updatedSite : s
        ));
        return updatedSite;
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

  const deleteSite = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.deleteSite(id) as ApiResponse<any>;
      
      if (response.success) {
        setSites(prev => prev.filter(s => s.idLieu !== id));
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de suppression'));
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de suppression');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sites,
    pagination,
    isLoading,
    error,
    loadSites,
    createSite,
    updateSite,
    deleteSite
  };
};

// Hook pour le détail d'un site patrimonial
export const usePatrimoineDetail = (id: number) => {
  const [site, setSite] = useState<Lieu | null>(null);
  const [galerie, setGalerie] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSite = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.getSiteDetail(id) as ApiResponse<Lieu>;
      
      if (response.success && response.data) {
        setSite(response.data);
      } else {
        throw new Error(getErrorMessage(response, 'Site introuvable'));
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement');
      setSite(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadGalerie = useCallback(async () => {
    try {
      const response = await PatrimoineService.getGalerie(id) as ApiResponse<any[]>;
      if (response.success && response.data) {
        setGalerie(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement galerie:', error);
    }
  }, [id]);

  const noter = useCallback(async (note: number, commentaire?: string) => {
    try {
      const response = await PatrimoineService.noterSite(id, note, commentaire) as ApiResponse<any>;
      if (response.success) {
        await loadSite();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur notation:', error);
      return false;
    }
  }, [id, loadSite]);

  useEffect(() => {
    if (id) {
      loadSite();
    }
  }, [id, loadSite]);

  return {
    site,
    galerie,
    isLoading,
    error,
    reload: loadSite,
    loadGalerie,
    noter
  };
};