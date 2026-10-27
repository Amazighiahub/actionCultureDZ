// hooks/useOeuvres.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { oeuvreService } from '@/services/oeuvre.service';
import { httpClient } from '@/services/httpClient';
import { useChangementLangue } from '@/hooks/useChangementLangue';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { TypeOeuvre } from '@/types/models/references.types';

export interface UseOeuvresReturn {
  // États
  oeuvres: Oeuvre[];
  filteredOeuvres: Oeuvre[];
  loading: boolean;
  error: string | null;
  typesOeuvres: TypeOeuvre[];
  
  // Filtres
  selectedFilter: string;
  selectedType: string;
  searchQuery: string;
  
  // Actions
  setSelectedFilter: (filter: string) => void;
  setSelectedType: (type: string) => void;
  setSearchQuery: (query: string) => void;
  loadOeuvres: () => Promise<void>;
  /** Page suivante (« Voir plus ») : seules les 50 premières œuvres étaient accessibles */
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loadingMore: boolean;
  
  // Statistiques
  stats: {
    total: number;
    nouveautes: number;
    classiques: number;
    recentes: number;
  };
}

const PAGE_SIZE = 50;

// Une page d'œuvres (sans artisanat) et l'indication d'une page suivante
const fetchOeuvresPage = async (pageNumber: number) => {
  const result = await oeuvreService.getOeuvres({ limit: PAGE_SIZE, page: pageNumber, statut: 'publie' });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Erreur lors du chargement des œuvres');
  }
  let items: Oeuvre[] = [];
  let pagination: { totalPages?: number; pages?: number } | undefined;
  if (Array.isArray(result.data)) {
    items = result.data as Oeuvre[];
  } else if (typeof result.data === 'object') {
    const data = result.data as unknown as Record<string, unknown>;
    const list = data.oeuvres || data.items || data.results || data.data;
    items = Array.isArray(list) ? list as Oeuvre[] : [];
    pagination = data.pagination as typeof pagination;
  }
  const totalPages = pagination?.totalPages ?? pagination?.pages;
  const more = totalPages != null ? pageNumber < totalPages : items.length === PAGE_SIZE;
  // Exclure l'artisanat (type 7)
  return { items: items.filter((o) => o.id_type_oeuvre !== 7), more };
};

export function useOeuvres(): UseOeuvresReturn {
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('tous');
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typesOeuvres, setTypesOeuvres] = useState<TypeOeuvre[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mode conservateur si rate limit récent
  useEffect(() => {
    const lastRateLimit = localStorage.getItem('lastRateLimit');
    if (lastRateLimit) {
      const timeSince = Date.now() - parseInt(lastRateLimit);
      if (timeSince < 5 * 60 * 1000) {
        httpClient.useConservativeMode();
      }
    }

    return () => {
      httpClient.useNormalMode();
    };
  }, []);

  // Charger les types d'œuvres (sans artisanat - type 7)
  const loadTypesOeuvres = async () => {
    try {
      const response = await httpClient.get<TypeOeuvre[]>('/metadata/types-oeuvres');
      if (response.success && response.data) {
        const types = Array.isArray(response.data) ? response.data : [];
        // Exclure l'artisanat par id (fiable, pas dépendant de la langue)
        setTypesOeuvres(types.filter(t => t.id_type_oeuvre !== 7));
      }
    } catch (error) {
      setTypesOeuvres([]);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items, more } = await fetchOeuvresPage(next);
      setOeuvres((prev) => {
        const seen = new Set(prev.map((o) => o.id_oeuvre));
        return [...prev, ...items.filter((o) => !seen.has(o.id_oeuvre))];
      });
      setPage(next);
      setHasMore(more);
    } catch {
      setError('Impossible de charger les œuvres');
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  // Charger les œuvres (sans artisanat)
  const loadOeuvres = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { items: oeuvresData, more } = await fetchOeuvresPage(1);
      setPage(1);
      setHasMore(more);
      setOeuvres(oeuvresData);

      // Sauvegarder en localStorage
      try {
        localStorage.setItem('oeuvres_backup', JSON.stringify(oeuvresData));
        localStorage.setItem('oeuvres_backup_time', Date.now().toString());
      } catch (e) {
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : '';
      // Gérer le rate limit
      if (errMessage.includes('429') || errMessage.includes('rate limit')) {
        localStorage.setItem('lastRateLimit', Date.now().toString());
        
        // Essayer le backup
        const backup = localStorage.getItem('oeuvres_backup');
        const backupTime = localStorage.getItem('oeuvres_backup_time');
        
        if (backup && backupTime) {
          const age = Date.now() - parseInt(backupTime);
          if (age < 30 * 60 * 1000) {
            try {
              const oeuvresData = JSON.parse(backup);
              // Filtrer l'artisanat même dans le backup (type 7)
              const filteredData = oeuvresData.filter((o: Oeuvre) => {
                return o.id_type_oeuvre !== 7;
              });
              setOeuvres(filteredData);
              setError('Limite de requêtes atteinte. Affichage des données en cache.');
              return;
            } catch (e) {
            }
          }
        }
        
        setError('Trop de requêtes. Veuillez patienter quelques instants.');
      } else {
        setError('Impossible de charger les œuvres');
      }
    } finally {
      setLoading(false);
    }
  }, [typesOeuvres]);

  // Filtrer les œuvres
  const filteredOeuvres = useMemo(() => {
    let filtered = [...oeuvres];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        // Recherche dans le titre (multilingue)
        const titre = typeof o.titre === 'object' ? Object.values(o.titre || {}).join(' ') : String(o.titre || '');
        if (titre.toLowerCase().includes(query)) return true;

        // Recherche dans la description (multilingue)
        const desc = typeof o.description === 'object' ? Object.values(o.description || {}).join(' ') : String(o.description || '');
        if (desc.toLowerCase().includes(query)) return true;
        
        // Helper : extraire texte d'un champ string ou objet multilingue {fr, ar, ...}
        const ml = (v: unknown): string => typeof v === 'object' && v ? Object.values(v).join(' ') : String(v || '');

        // Recherche dans les contributeurs (nom/prenom multilingues)
        const contributeurs: string[] = [];
        if (o.OeuvreIntervenants) {
          contributeurs.push(...o.OeuvreIntervenants.map(oi =>
            `${ml(oi.Intervenant?.nom)} ${ml(oi.Intervenant?.prenom)}`
          ));
        }
        if (o.Users) {
          contributeurs.push(...o.Users.map(u =>
            `${ml(u.nom)} ${ml(u.prenom)}`
          ));
        }
        const contributeursStr = contributeurs.join(' ').toLowerCase();
        if (contributeursStr.includes(query)) return true;

        // Recherche dans les tags (nom multilingue)
        if (o.Tags) {
          const tagsStr = o.Tags.map(t => ml(t.nom)).join(' ').toLowerCase();
          if (tagsStr.includes(query)) return true;
        }

        // Recherche dans le type (nom_type multilingue)
        const typeNom = ml(o.TypeOeuvre?.nom_type).toLowerCase();
        if (typeNom.includes(query)) return true;
        
        return false;
      });
    }

    // Filtrer par catégorie éditoriale
    if (selectedFilter !== 'tous') {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      switch (selectedFilter) {
        case 'nouveautes':
          filtered = filtered.filter(o => {
            const dateCreation = new Date(o.date_creation);
            return dateCreation >= oneMonthAgo;
          });
          filtered.sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime());
          break;
          
        case 'une':
          filtered = filtered
            .filter(o => o.Media && o.Media.length > 0)
            .slice(0, 10);
          break;
          
        case 'populaires':
          filtered = filtered.filter(o => {
            if (!o.annee_creation) return false;
            const anneeActuelle = new Date().getFullYear();
            const age = anneeActuelle - o.annee_creation;
            return age > 10 || age <= 5;
          });
          
          filtered.sort((a, b) => {
            const anneeActuelle = new Date().getFullYear();
            const ageA = anneeActuelle - (a.annee_creation || 0);
            const ageB = anneeActuelle - (b.annee_creation || 0);
            
            if (ageA > 10 && ageB > 10) {
              return (a.annee_creation || 0) - (b.annee_creation || 0);
            }
            
            if (ageA <= 5 && ageB <= 5) {
              return (b.annee_creation || 0) - (a.annee_creation || 0);
            }
            
            return ageB - ageA;
          });
          break;
          
        case 'recommandees':
          filtered = filtered.filter(o => {
            if (!o.CritiquesEvaluations || o.CritiquesEvaluations.length === 0) return false;
            const moyenneNotes = o.CritiquesEvaluations.reduce((acc, c) => acc + (c.note || 0), 0) / o.CritiquesEvaluations.length;
            return moyenneNotes >= 4;
          });
          break;
      }
    }

    // Filtrer par type
    if (selectedType !== 'tous') {
      filtered = filtered.filter(o => {
        const typeId = o.id_type_oeuvre || o.TypeOeuvre?.id_type_oeuvre;
        return typeId?.toString() === selectedType;
      });
    }

    return filtered;
  }, [oeuvres, selectedFilter, selectedType, searchQuery]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const currentYear = new Date().getFullYear();
    
    return {
      total: oeuvres.length,
      nouveautes: oeuvres.filter(o => new Date(o.date_creation) >= oneMonthAgo).length,
      classiques: oeuvres.filter(o => o.annee_creation && (currentYear - o.annee_creation > 10)).length,
      recentes: oeuvres.filter(o => o.annee_creation && (currentYear - o.annee_creation <= 5)).length
    };
  }, [oeuvres]);

  // Initialiser
  useEffect(() => {
    loadTypesOeuvres();
  }, []);

  // Changement de langue : types relus dans la nouvelle langue, puis les œuvres (loadOeuvres
  // dépend des types et se relance seul)
  useChangementLangue(() => {
    loadTypesOeuvres();
  });

  // Charger les œuvres après avoir chargé les types
  useEffect(() => {
    if (typesOeuvres.length > 0 || loading === false) {
      loadOeuvres();
    }
  }, [typesOeuvres.length, loadOeuvres]);

  return {
    oeuvres,
    filteredOeuvres,
    loading,
    error,
    typesOeuvres,
    selectedFilter,
    selectedType,
    searchQuery,
    setSelectedFilter,
    setSelectedType,
    setSearchQuery,
    loadOeuvres,
    loadMore,
    hasMore,
    loadingMore,
    stats
  };
}