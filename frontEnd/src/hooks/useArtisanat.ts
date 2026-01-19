// hooks/useArtisanat.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { artisanatService, Artisanat, ArtisanatStatistics } from '@/services/artisanat.service';
import { httpClient } from '@/services/httpClient';

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
      console.error('Erreur chargement matériaux:', error);
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
      console.error('Erreur chargement techniques:', error);
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
      console.error('Erreur chargement statistiques:', error);
    }
  };

  // Charger les artisanats
  const loadArtisanats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit: 50,
        sort: sortBy
      };

      console.log('📤 Chargement des artisanats...');

      const result = await artisanatService.getAll(params);

      if (result.success && result.data) {
        let artisanatsData = (result.data as any).artisanats ||
                            (result.data as any).items ||
                            (result.data as any).data ||
                            result.data ||
                            [];

        console.log(`✅ ${artisanatsData.length} artisanats chargés`);
        setArtisanats(Array.isArray(artisanatsData) ? artisanatsData : []);

        // Sauvegarder en localStorage
        try {
          localStorage.setItem('artisanats_backup', JSON.stringify(artisanatsData));
          localStorage.setItem('artisanats_backup_time', Date.now().toString());
        } catch (e) {
          console.error('Erreur sauvegarde backup:', e);
        }
      } else {
        throw new Error(result.error || 'Erreur lors du chargement des artisanats');
      }
    } catch (err: any) {
      console.error('Erreur:', err);

      // Gérer le rate limit
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
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
              console.error('Erreur parsing backup:', e);
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
        if ((a as any).Oeuvre?.titre?.toLowerCase().includes(query)) return true;
        if ((a as any).Materiau?.nom?.toLowerCase().includes(query)) return true;
        if ((a as any).Technique?.nom?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    // Filtrer par matériau
    if (selectedMateriau !== 'tous') {
      filtered = filtered.filter(a => {
        const materiauId = a.id_materiau || (a as any).Materiau?.id_materiau;
        return materiauId?.toString() === selectedMateriau;
      });
    }

    // Filtrer par technique
    if (selectedTechnique !== 'tous') {
      filtered = filtered.filter(a => {
        const techniqueId = a.id_technique || (a as any).Technique?.id_technique;
        return techniqueId?.toString() === selectedTechnique;
      });
    }

    // Tri
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'prix_asc':
        filtered.sort((a, b) => ((a as any).prix || a.prix_min || 0) - ((b as any).prix || b.prix_min || 0));
        break;
      case 'prix_desc':
        filtered.sort((a, b) => ((b as any).prix || b.prix_max || 0) - ((a as any).prix || a.prix_max || 0));
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
