// hooks/useArtisanat.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { artisanatService, Artisanat, ArtisanatStatistics } from '@/services/artisanat.service';
import { httpClient } from '@/services/httpClient';

/** Extended Artisanat with optional `prix` field that may come from API responses */
interface ArtisanatWithPrix extends Artisanat {
  prix?: number;
}

/** Shape of possible paginated API response wrappers */
interface ArtisanatResponseData {
  artisanats?: Artisanat[];
  items?: Artisanat[];
  data?: Artisanat[];
}

interface Materiau {
  id_materiau: number;
  nom: string;
  description?: string;
}

interface Technique {
  id_technique: number;
  nom: string;
  description?: string;
}

export interface UseArtisanatReturn {
  // États
  artisanats: Artisanat[];
  filteredArtisanats: Artisanat[];
  loading: boolean;
  error: string | null;
  materiaux: Materiau[];
  techniques: Technique[];

  // Filtres
  selectedMateriau: string;
  selectedTechnique: string;
  searchQuery: string;
  sortBy: string;

  // Actions
  setSelectedMateriau: (materiau: string) => void;
  setSelectedTechnique: (technique: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;
  loadArtisanats: () => Promise<void>;

  // Statistiques
  stats: ArtisanatStatistics | null;
}

export function useArtisanat(): UseArtisanatReturn {
  const [artisanats, setArtisanats] = useState<Artisanat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMateriau, setSelectedMateriau] = useState<string>('tous');
  const [selectedTechnique, setSelectedTechnique] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [materiaux, setMateriaux] = useState<Materiau[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [stats, setStats] = useState<ArtisanatStatistics | null>(null);

  // Charger les matériaux
  const loadMateriaux = async () => {
    try {
      const response = await httpClient.get<Materiau[]>('/metadata/materiaux');
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setMateriaux(data);
      }
    } catch (error) {
      setMateriaux([]);
    }
  };

  // Charger les techniques
  const loadTechniques = async () => {
    try {
      const response = await httpClient.get<Technique[]>('/metadata/techniques');
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setTechniques(data);
      }
    } catch (error) {
      setTechniques([]);
    }
  };

  // Charger les statistiques
  const loadStatistics = async () => {
    try {
      const response = await artisanatService.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
    }
  };

  // Charger les artisanats
  const loadArtisanats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number | boolean | undefined> = {
        limit: 50,
        sort: sortBy
      };

      const result = await artisanatService.getAll(params);

      if (result.success) {
        let artisanatsData: Artisanat[] = [];

        if (Array.isArray(result.data)) {
          artisanatsData = result.data;
        } else if (result.data && typeof result.data === 'object') {
          const responseData = result.data as unknown as ArtisanatResponseData;
          artisanatsData = responseData.artisanats || responseData.items || responseData.data || [];
        }

        setArtisanats(Array.isArray(artisanatsData) ? artisanatsData : []);

        // Sauvegarder en localStorage
        try {
          localStorage.setItem('artisanats_backup', JSON.stringify(artisanatsData));
          localStorage.setItem('artisanats_backup_time', Date.now().toString());
        } catch (e) {
        }
      } else {
        throw new Error(result.error || 'Erreur lors du chargement des artisanats');
      }
    } catch (err: unknown) {
      // Gérer le rate limit
      const errMessage = err instanceof Error ? err.message : '';
      if (errMessage.includes('429') || errMessage.includes('rate limit')) {
        localStorage.setItem('lastRateLimit', Date.now().toString());

        // Essayer le backup
        const backup = localStorage.getItem('artisanats_backup');
        const backupTime = localStorage.getItem('artisanats_backup_time');

        if (backup && backupTime) {
          const age = Date.now() - parseInt(backupTime);
          if (age < 30 * 60 * 1000) {
            try {
              const artisanatsData = JSON.parse(backup);
              setArtisanats(artisanatsData);
              setError('Limite de requêtes atteinte. Affichage des données en cache.');
              return;
            } catch (e) {
            }
          }
        }

        setError('Trop de requêtes. Veuillez patienter quelques instants.');
      } else {
        setError('Impossible de charger les produits artisanaux');
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // Filtrer les artisanats
  const filteredArtisanats = useMemo(() => {
    let filtered = [...artisanats];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        if (a.nom?.toLowerCase().includes(query)) return true;
        if (a.description?.toLowerCase().includes(query)) return true;
        const titre = a.Oeuvre?.titre;
        const titreStr = typeof titre === 'string' ? titre : (titre as Record<string, string>)?.fr || '';
        if (titreStr.toLowerCase().includes(query)) return true;
        if (a.Materiau?.nom?.toLowerCase().includes(query)) return true;
        if (a.Technique?.nom?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    // Filtrer par matériau
    if (selectedMateriau !== 'tous') {
      filtered = filtered.filter(a => {
        const materiauId = a.id_materiau || a.Materiau?.id_materiau;
        return materiauId?.toString() === selectedMateriau;
      });
    }

    // Filtrer par technique
    if (selectedTechnique !== 'tous') {
      filtered = filtered.filter(a => {
        const techniqueId = a.id_technique || a.Technique?.id_technique;
        return techniqueId?.toString() === selectedTechnique;
      });
    }

    // Tri
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'prix_asc':
        filtered.sort((a, b) => ((a as ArtisanatWithPrix).prix || a.prix_min || 0) - ((b as ArtisanatWithPrix).prix || b.prix_min || 0));
        break;
      case 'prix_desc':
        filtered.sort((a, b) => ((b as ArtisanatWithPrix).prix || b.prix_max || 0) - ((a as ArtisanatWithPrix).prix || a.prix_max || 0));
        break;
      case 'populaire':
        filtered.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
        break;
    }

    return filtered;
  }, [artisanats, selectedMateriau, selectedTechnique, searchQuery, sortBy]);

  // Initialiser
  useEffect(() => {
    loadMateriaux();
    loadTechniques();
    loadStatistics();
    loadArtisanats();
  }, []);

  return {
    artisanats,
    filteredArtisanats,
    loading,
    error,
    materiaux,
    techniques,
    selectedMateriau,
    selectedTechnique,
    searchQuery,
    sortBy,
    setSelectedMateriau,
    setSelectedTechnique,
    setSearchQuery,
    setSortBy,
    loadArtisanats,
    stats
  };
}
