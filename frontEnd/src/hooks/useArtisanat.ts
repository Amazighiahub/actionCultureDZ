// hooks/useArtisanat.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { artisanatService, Artisanat, ArtisanatStatistics } from '@/services/artisanat.service';
import { httpClient } from '@/services/httpClient';
import { useChangementLangue } from '@/hooks/useChangementLangue';

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
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loadingMore: boolean;

  // Statistiques
  stats: ArtisanatStatistics | null;
}

const PAGE_SIZE = 50;

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Une page d'artisanat et l'indication d'une page suivante
  const fetchPage = useCallback(async (pageNumber: number) => {
    const result = await artisanatService.getAll({ limit: PAGE_SIZE, page: pageNumber, sort: sortBy });
    if (!result.success) {
      throw new Error(result.error || 'Erreur lors du chargement des artisanats');
    }
    let items: Artisanat[] = [];
    if (Array.isArray(result.data)) {
      items = result.data;
    } else if (result.data && typeof result.data === 'object') {
      const responseData = result.data as unknown as ArtisanatResponseData;
      items = responseData.artisanats || responseData.items || responseData.data || [];
    }
    items = Array.isArray(items) ? items : [];
    const pagination = (result as { pagination?: { totalPages?: number; pages?: number } }).pagination;
    const totalPages = pagination?.totalPages ?? pagination?.pages;
    return { items, more: totalPages != null ? pageNumber < totalPages : items.length === PAGE_SIZE };
  }, [sortBy]);

  // Page suivante (« Voir plus ») : seuls les 50 premiers produits étaient accessibles
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items, more } = await fetchPage(next);
      setArtisanats((prev) => {
        const keyOf = (a: Artisanat) => (a as { id_artisanat?: number; id?: number }).id_artisanat ?? (a as { id?: number }).id;
        const seen = new Set(prev.map(keyOf));
        return [...prev, ...items.filter((a) => !seen.has(keyOf(a)))];
      });
      setPage(next);
      setHasMore(more);
    } catch {
      setError('Impossible de charger les produits artisanaux');
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, fetchPage]);

  // Charger les artisanats
  const loadArtisanats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { items: artisanatsData, more } = await fetchPage(1);
      setPage(1);
      setHasMore(more);
      setArtisanats(artisanatsData);

      // Sauvegarder en localStorage
      try {
        localStorage.setItem('artisanats_backup', JSON.stringify(artisanatsData));
        localStorage.setItem('artisanats_backup_time', Date.now().toString());
      } catch (e) {
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
  }, [fetchPage]);

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

  // Changement de langue : matériaux, techniques et pièces relus dans la nouvelle langue
  useChangementLangue(() => {
    loadMateriaux();
    loadTechniques();
    loadArtisanats();
  });

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
    loadMore,
    hasMore,
    loadingMore,
    stats
  };
}
