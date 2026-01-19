// hooks/useGeographie.ts
import { useState, useEffect } from 'react';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

// =====================================================
// TYPES (alignés avec les modèles Sequelize backend)
// =====================================================

export interface Wilaya {
  id_wilaya: number;
  codeW: number;
  nom: string;
  wilaya_name_ascii: string;
}

export interface Daira {
  id_daira: number;
  wilayaId: number;
  nom: string;
  daira_name_ascii: string;
}

export interface Commune {
  id_commune: number;
  dairaId: number;
  nom: string;
  commune_name_ascii: string;
}

export interface Localite {
  id_localite: number;
  id_commune: number;
  nom: string;
  localite_name_ascii: string;
}

// =====================================================
// HOOK: useWilayas
// =====================================================

/**
 * Hook pour charger toutes les wilayas
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
        
        const response = await httpClient.get<{ success: boolean; data: Wilaya[] }>(
          API_ENDPOINTS.metadata.geographie.wilayas
        );
        
        if (response.success && response.data?.data) {
          setWilayas(response.data.data);
        } else if (response.success && Array.isArray(response.data)) {
          // Fallback si la réponse est directement un tableau
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

// =====================================================
// HOOK: useDairas
// =====================================================

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
        
        const response = await httpClient.get<{ success: boolean; data: Daira[] }>(
          API_ENDPOINTS.metadata.geographie.dairasByWilaya(wilayaId)
        );
        
        if (response.success && response.data?.data) {
          setDairas(response.data.data);
        } else if (response.success && Array.isArray(response.data)) {
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

// =====================================================
// HOOK: useCommunes
// =====================================================

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
        
        const response = await httpClient.get<{ success: boolean; data: Commune[] }>(
          API_ENDPOINTS.metadata.geographie.communesByDaira(dairaId)
        );
        
        if (response.success && response.data?.data) {
          setCommunes(response.data.data);
        } else if (response.success && Array.isArray(response.data)) {
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

// =====================================================
// HOOK: useLocalites
// =====================================================

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
        
        const response = await httpClient.get<{ success: boolean; data: Localite[] }>(
          API_ENDPOINTS.metadata.geographie.localitesByCommune(communeId)
        );
        
        if (response.success && response.data?.data) {
          setLocalites(response.data.data);
        } else if (response.success && Array.isArray(response.data)) {
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

// =====================================================
// HOOK: useSearchWilayas
// =====================================================

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
        
        const response = await httpClient.get<{ success: boolean; data: Wilaya[] }>(
          API_ENDPOINTS.metadata.geographie.searchWilayas,
          { q: query }
        );
        
        if (response.success && response.data?.data) {
          setResults(response.data.data);
        } else if (response.success && Array.isArray(response.data)) {
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

// =====================================================
// HOOK: useGeographicSelection
// =====================================================

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

  // Helpers pour obtenir les objets sélectionnés
  const getSelectedWilayaObject = () => wilayas.find(w => w.id_wilaya === selectedWilaya);
  const getSelectedDairaObject = () => dairas.find(d => d.id_daira === selectedDaira);
  const getSelectedCommuneObject = () => communes.find(c => c.id_commune === selectedCommune);
  const getSelectedLocaliteObject = () => localites.find(l => l.id_localite === selectedLocalite);

  // Reset complet
  const resetSelection = () => {
    setSelectedWilaya(null);
    setSelectedDaira(null);
    setSelectedCommune(null);
    setSelectedLocalite(null);
  };

  return {
    // Données
    wilayas,
    dairas,
    communes,
    localites,
    
    // Sélections (IDs)
    selectedWilaya,
    selectedDaira,
    selectedCommune,
    selectedLocalite,
    
    // Setters
    setSelectedWilaya,
    setSelectedDaira,
    setSelectedCommune,
    setSelectedLocalite,
    
    // Objets sélectionnés
    getSelectedWilayaObject,
    getSelectedDairaObject,
    getSelectedCommuneObject,
    getSelectedLocaliteObject,
    
    // Reset
    resetSelection,
    
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

// =====================================================
// HELPERS
// =====================================================

/**
 * Formater le nom complet d'une wilaya (code + nom)
 */
export function formatWilayaName(wilaya: Wilaya): string {
  const code = String(wilaya.codeW).padStart(2, '0');
  return `${code} - ${wilaya.wilaya_name_ascii}`;
}

/**
 * Formater une adresse complète
 */
export function formatFullAddress(
  localite?: Localite | null,
  commune?: Commune | null,
  daira?: Daira | null,
  wilaya?: Wilaya | null,
  adresse?: string
): string {
  const parts: string[] = [];
  
  if (adresse) parts.push(adresse);
  if (localite) parts.push(localite.localite_name_ascii || localite.nom);
  if (commune) parts.push(commune.commune_name_ascii || commune.nom);
  if (daira) parts.push(daira.daira_name_ascii || daira.nom);
  if (wilaya) parts.push(formatWilayaName(wilaya));
  
  return parts.join(', ');
}