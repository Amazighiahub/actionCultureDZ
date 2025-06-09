// hooks/useFavoris.ts
import { useState } from 'react';
import FavoriService from '../services/favori.service';
import { FavoriType } from '../services/favori.service';

export const useFavoris = () => {
  const [favoris, setFavoris] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFavori = async (type: FavoriType, id: number) => {
    try {
      setIsLoading(true);
      const response = await FavoriService.toggle(type, id);
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkFavori = async (type: FavoriType, id: number) => {
    try {
      const response = await FavoriService.check(type, id);
      return response.data?.isFavorite || false;
    } catch (error) {
      return false;
    }
  };

  return {
    favoris,
    isLoading,
    toggleFavori,
    checkFavori
  };
};