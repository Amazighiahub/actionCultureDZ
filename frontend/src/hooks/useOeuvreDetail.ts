import OeuvreService from "@/services/oeuvre.service";
import { Oeuvre } from "@/types";
import { useEffect, useState } from "react";

// hooks/useOeuvreDetail.ts
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