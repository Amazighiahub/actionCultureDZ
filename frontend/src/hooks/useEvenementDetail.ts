import EvenementService from "@/services/evenement.service";
import { Evenement } from "@/types";
import { useEffect, useState } from "react";

export const useEvenementDetail = (id: number) => {
  const [evenement, setEvenement] = useState<Evenement | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadEvenement();
    }
  }, [id]);

  const loadEvenement = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await EvenementService.getById(id);
      
      if (response.success && response.data) {
        setEvenement(response.data);
      } else {
        throw new Error(response.error || 'Événement introuvable');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement');
      setEvenement(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const response = await EvenementService.getParticipants(id);
      if (response.success && response.data) {
        setParticipants(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement participants:', error);
    }
  };

  return {
    evenement,
    participants,
    isLoading,
    error,
    reload: loadEvenement,
    loadParticipants
  };
};