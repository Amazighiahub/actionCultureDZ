import ArtisanatService from "@/services/artisanat.service";
import { Artisanat } from "@/types";
import { useEffect, useState } from "react";

export const useArtisanatDetail = (id: number) => {
  const [artisanat, setArtisanat] = useState<Artisanat | null>(null);
  const [artisan, setArtisan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadArtisanat();
    }
  }, [id]);

  const loadArtisanat = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await ArtisanatService.getById(id);
      
      if (response.success && response.data) {
        setArtisanat(response.data);
        // Charger les infos de l'artisan si disponible
        if (response.data.oeuvre?.saisiPar) {
          // À implémenter selon vos besoins
        }
      } else {
        throw new Error(response.error || 'Produit introuvable');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement');
      setArtisanat(null);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMedia = async (files: File[]) => {
    try {
      const response = await ArtisanatService.uploadMedias(id, files);
      if (response.success) {
        await loadArtisanat();
        return response.data;
      }
      throw new Error(response.error || 'Erreur d\'upload');
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