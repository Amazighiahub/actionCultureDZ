// hooks/useGeographie.ts
import { useState, useEffect } from 'react';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

export interface Wilaya {
  id_wilaya: number;
  codeW: string;  // Code de la wilaya (01, 02, etc.)
  wilaya_name_ascii: string;  // Nom en ASCII
  wilaya_name?: string;  // Nom en arabe (optionnel)
}

export interface Daira {
  id_daira: number;
  id_wilaya: number;
  nom_daira: string;
}

export interface Commune {
  id_commune: number;
  id_daira: number;
  nom_commune: string;
}

export interface Localite {
  id_localite: number;
  id_commune: number;
  nom_localite: string;
}

/**
 * Hook pour charger les wilayas
 */
export function useWilayas() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWilayas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Chargement des wilayas...');
        const response = await httpClient.get<Wilaya[]>(API_ENDPOINTS.metadata.geographie.wilayas);
        
        if (response.success && response.data) {
          console.log('Wilayas chargées:', response.data);
          setWilayas(response.data);
        } else {
          setError(response.error || 'Erreur lors du chargement des wilayas');
        }
      } catch (err) {
        console.error('Erreur chargement wilayas:', err);
        setError('Impossible de charger les wilayas');
      } finally {
        setLoading(false);
      }
    };

    loadWilayas();
  }, []);

  return { wilayas, loading, error };
}

/**
 * Hook pour charger les dairas d'une wilaya
 */
export function useDairas(wilayaId: number | null) {
  const [dairas, setDairas] = useState<Daira[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wilayaId) {
      setDairas([]);
      return;
    }

    const loadDairas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await httpClient.get<Daira[]>(
          API_ENDPOINTS.metadata.geographie.dairasByWilaya(wilayaId)
        );
        
        if (response.success && response.data) {
          setDairas(response.data);
        } else {
          setError(response.error || 'Erreur lors du chargement des dairas');
        }
      } catch (err) {
        console.error('Erreur chargement dairas:', err);
        setError('Impossible de charger les dairas');
      } finally {
        setLoading(false);
      }
    };

    loadDairas();
  }, [wilayaId]);

  return { dairas, loading, error };
}

/**
 * Hook pour charger les communes d'une daira
 */
export function useCommunes(dairaId: number | null) {
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dairaId) {
      setCommunes([]);
      return;
    }

    const loadCommunes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await httpClient.get<Commune[]>(
          API_ENDPOINTS.metadata.geographie.communesByDaira(dairaId)
        );
        
        if (response.success && response.data) {
          setCommunes(response.data);
        } else {
          setError(response.error || 'Erreur lors du chargement des communes');
        }
      } catch (err) {
        console.error('Erreur chargement communes:', err);
        setError('Impossible de charger les communes');
      } finally {
        setLoading(false);
      }
    };

    loadCommunes();
  }, [dairaId]);

  return { communes, loading, error };
}

/**
 * Hook pour charger les localités d'une commune
 */
export function useLocalites(communeId: number | null) {
  const [localites, setLocalites] = useState<Localite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!communeId) {
      setLocalites([]);
      return;
    }

    const loadLocalites = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await httpClient.get<Localite[]>(
          API_ENDPOINTS.metadata.geographie.localitesByCommune(communeId)
        );
        
        if (response.success && response.data) {
          setLocalites(response.data);
        } else {
          setError(response.error || 'Erreur lors du chargement des localités');
        }
      } catch (err) {
        console.error('Erreur chargement localités:', err);
        setError('Impossible de charger les localités');
      } finally {
        setLoading(false);
      }
    };

    loadLocalites();
  }, [communeId]);

  return { localites, loading, error };
}

/**
 * Hook pour rechercher des wilayas
 */
export function useSearchWilayas(query: string) {
  const [results, setResults] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchWilayas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await httpClient.get<Wilaya[]>(
          API_ENDPOINTS.metadata.geographie.searchWilayas,
          { q: query }
        );
        
        if (response.success && response.data) {
          setResults(response.data);
        } else {
          setError(response.error || 'Erreur lors de la recherche');
        }
      } catch (err) {
        console.error('Erreur recherche wilayas:', err);
        setError('Impossible de rechercher les wilayas');
      } finally {
        setLoading(false);
      }
    };

    // Debounce la recherche
    const timeoutId = setTimeout(searchWilayas, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return { results, loading, error };
}

/**
 * Hook pour gérer la sélection hiérarchique Wilaya > Daira > Commune > Localité
 */
export function useGeographicSelection() {
  const [selectedWilaya, setSelectedWilaya] = useState<number | null>(null);
  const [selectedDaira, setSelectedDaira] = useState<number | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<number | null>(null);
  const [selectedLocalite, setSelectedLocalite] = useState<number | null>(null);

  const { wilayas, loading: wilayasLoading, error: wilayasError } = useWilayas();
  const { dairas, loading: dairasLoading, error: dairasError } = useDairas(selectedWilaya);
  const { communes, loading: communesLoading, error: communesError } = useCommunes(selectedDaira);
  const { localites, loading: localitesLoading, error: localitesError } = useLocalites(selectedCommune);

  // Réinitialiser les sélections enfants quand le parent change
  useEffect(() => {
    setSelectedDaira(null);
    setSelectedCommune(null);
    setSelectedLocalite(null);
  }, [selectedWilaya]);

  useEffect(() => {
    setSelectedCommune(null);
    setSelectedLocalite(null);
  }, [selectedDaira]);

  useEffect(() => {
    setSelectedLocalite(null);
  }, [selectedCommune]);

  return {
    // Données
    wilayas,
    dairas,
    communes,
    localites,
    
    // Sélections
    selectedWilaya,
    selectedDaira,
    selectedCommune,
    selectedLocalite,
    
    // Setters
    setSelectedWilaya,
    setSelectedDaira,
    setSelectedCommune,
    setSelectedLocalite,
    
    // États de chargement
    loading: wilayasLoading || dairasLoading || communesLoading || localitesLoading,
    wilayasLoading,
    dairasLoading,
    communesLoading,
    localitesLoading,
    
    // Erreurs
    error: wilayasError || dairasError || communesError || localitesError,
    wilayasError,
    dairasError,
    communesError,
    localitesError,
  };
}