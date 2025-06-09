import PatrimoineService from "@/services/patrimoine.service";
import { useEffect, useState } from "react";

export const usePatrimoineDetail = (id: number) => {
  const [site, setSite] = useState<any>(null);
  const [galerie, setGalerie] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSite();
    }
  }, [id]);

  const loadSite = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PatrimoineService.getSiteDetail(id);
      
      if (response.success && response.data) {
        setSite(response.data);
      } else {
        throw new Error(response.error || 'Site introuvable');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement');
      setSite(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGalerie = async () => {
    try {
      const response = await PatrimoineService.getGalerie(id);
      if (response.success && response.data) {
        setGalerie(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement galerie:', error);
    }
  };

  const noter = async (note: number, commentaire?: string) => {
    try {
      const response = await PatrimoineService.noterSite(id, note, commentaire);
      if (response.success) {
        await loadSite();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur notation:', error);
      return false;
    }
  };

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