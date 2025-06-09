// hooks/useArtisanat.ts - Version complètement corrigée avec gestion des types
import ArtisanatService from '../services/artisanat.service';
import { Artisanat } from '../types/Oeuvre.types';
import { ArtisanatFilters } from '../services/artisanat.service';
import { useCallback, useEffect, useState } from 'react';
import { 
  ApiResponse,
  PaginatedApiResponse, 
  PaginationInfo,
  getErrorMessage 
} from '../types/api.types';

export const useArtisanat = (filters: ArtisanatFilters = {}) => {
  const [artisanats, setArtisanats] = useState<Artisanat[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArtisanats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ArtisanatService.getAll(filters) as PaginatedApiResponse<Artisanat>;
      
      if (response.success && response.data) {
        setArtisanats(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(getErrorMessage(response, 'Erreur de chargement des produits artisanaux'));
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement des produits artisanaux');
      setArtisanats([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadArtisanats();
  }, [JSON.stringify(filters)]);

  const createArtisanat = useCallback(async (data: Partial<Artisanat>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ArtisanatService.create(data) as ApiResponse<Artisanat>;
      
      if (response.success && response.data) {
        await loadArtisanats();
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
  }, [loadArtisanats]);

  const updateArtisanat = useCallback(async (id: number, data: Partial<Artisanat>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ArtisanatService.update(id, data) as ApiResponse<Artisanat>;
      
      if (response.success && response.data) {
        const updatedArtisanat = response.data; // Stockage dans une variable pour éviter l'erreur TS
        setArtisanats(prev => prev.map(a => 
          a.idArtisanat === id ? updatedArtisanat : a
        ));
        return updatedArtisanat;
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

  const deleteArtisanat = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ArtisanatService.delete(id) as ApiResponse<any>;
      
      if (response.success) {
        setArtisanats(prev => prev.filter(a => a.idArtisanat !== id));
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
    artisanats,
    pagination,
    isLoading,
    error,
    loadArtisanats,
    createArtisanat,
    updateArtisanat,
    deleteArtisanat
  };
};

// Hook pour le détail d'un produit artisanal
export const useArtisanatDetail = (id: number) => {
  const [artisanat, setArtisanat] = useState<Artisanat | null>(null);
  const [artisan, setArtisan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArtisanat = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ArtisanatService.getById(id) as ApiResponse<Artisanat>;
      
      if (response.success && response.data) {
        setArtisanat(response.data);
        // Charger les infos de l'artisan si disponible
        if (response.data.oeuvre?.saisiPar) {
          // À implémenter selon vos besoins
        }
      } else {
        throw new Error(getErrorMessage(response, 'Produit introuvable'));
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement');
      setArtisanat(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadArtisanat();
    }
  }, [id, loadArtisanat]);

  const uploadMedia = async (files: File[]) => {
    try {
      const response = await ArtisanatService.uploadMedias(id, files) as ApiResponse<any>;
      if (response.success) {
        await loadArtisanat();
        return response.data;
      }
      throw new Error(getErrorMessage(response, 'Erreur d\'upload'));
    } catch (error) {
      throw error;
    }
  };

  return {
    artisanat,
    artisan,
    isLoading,
    error,
    reload: loadArtisanat,
    uploadMedia
  };
};