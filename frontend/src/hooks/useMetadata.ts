import { useState, useEffect } from 'react';
import MetadataService from '../services/metadata.service';
import { AllMetadata } from '../services/metadata.service';

export const useMetadata = () => {
  const [metadata, setMetadata] = useState<AllMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await MetadataService.getAll();
      
      if (response.success && response.data) {
        setMetadata(response.data);
      } else {
        throw new Error(response.error || 'Erreur de chargement');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur de chargement des métadonnées');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ...metadata,
    isLoading,
    error,
    reload: loadMetadata
  };
};