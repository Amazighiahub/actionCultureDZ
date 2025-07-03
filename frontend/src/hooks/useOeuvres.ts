// hooks/useOeuvres.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { oeuvreService } from '@/services/oeuvre.service';
import { httpClient } from '@/services/httpClient';
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
  
  // Statistiques
  stats: {
    total: number;
    nouveautes: number;
    classiques: number;
    recentes: number;
  };
}

export function useOeuvres(): UseOeuvresReturn {
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('tous');
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typesOeuvres, setTypesOeuvres] = useState<TypeOeuvre[]>([]);

  // Mode conservateur si rate limit récent
  useEffect(() => {
    const lastRateLimit = localStorage.getItem('lastRateLimit');
    if (lastRateLimit) {
      const timeSince = Date.now() - parseInt(lastRateLimit);
      if (timeSince < 5 * 60 * 1000) {
        (httpClient as any).useConservativeMode?.();
        console.log('🐢 Mode conservateur activé (rate limit récent)');
      }
    }

    return () => {
      (httpClient as any).useNormalMode?.();
    };
  }, []);

  // Charger les types d'œuvres (sans artisanat)
  const loadTypesOeuvres = async () => {
    try {
      const response = await httpClient.get<TypeOeuvre[]>('/metadata/types-oeuvres');
      if (response.success && response.data) {
        // Filtrer pour exclure l'artisanat
        let types = Array.isArray(response.data) ? response.data : [];
        types = types.filter(t => {
          const nomLower = t.nom_type?.toLowerCase() || '';
          return !nomLower.includes('artisanat');
        });
        
        console.log('Types œuvres chargés (sans artisanat):', types);
        setTypesOeuvres(types);
      }
    } catch (error) {
      console.error('Erreur chargement types œuvres:', error);
      setTypesOeuvres([]);
    }
  };

  // Charger les œuvres (sans artisanat)
  const loadOeuvres = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { 
        limit: 50, // Plus d'œuvres pour compenser le filtrage
        statut: 'publie'
      };
      
      console.log('📤 Chargement des œuvres...');
      
      const result = await oeuvreService.getOeuvres(params);
      
      if (result.success && result.data) {
        let oeuvresData = (result.data as any).oeuvres || 
                         (result.data as any).items || 
                         (result.data as any).results || 
                         (result.data as any).data || 
                         result.data || 
                         [];
        
        // Filtrer pour exclure l'artisanat
        oeuvresData = oeuvresData.filter((o: Oeuvre) => {
          const typeNom = o.TypeOeuvre?.nom_type?.toLowerCase() || '';
          const typeId = o.id_type_oeuvre;
          
          // Trouver le type dans la liste des types
          const type = typesOeuvres.find(t => t.id_type_oeuvre === typeId);
          const typeNomFromList = type?.nom_type?.toLowerCase() || '';
          
          return !typeNom.includes('artisanat') && !typeNomFromList.includes('artisanat');
        });
        
        console.log(`✅ ${oeuvresData.length} œuvres chargées (artisanat exclu)`);
        setOeuvres(Array.isArray(oeuvresData) ? oeuvresData : []);
        
        // Sauvegarder en localStorage
        try {
          localStorage.setItem('oeuvres_backup', JSON.stringify(oeuvresData));
          localStorage.setItem('oeuvres_backup_time', Date.now().toString());
        } catch (e) {
          console.error('Erreur sauvegarde backup:', e);
        }
      } else {
        throw new Error(result.error || 'Erreur lors du chargement des œuvres');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      
      // Gérer le rate limit
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        localStorage.setItem('lastRateLimit', Date.now().toString());
        
        // Essayer le backup
        const backup = localStorage.getItem('oeuvres_backup');
        const backupTime = localStorage.getItem('oeuvres_backup_time');
        
        if (backup && backupTime) {
          const age = Date.now() - parseInt(backupTime);
          if (age < 30 * 60 * 1000) {
            try {
              const oeuvresData = JSON.parse(backup);
              // Filtrer l'artisanat même dans le backup
              const filteredData = oeuvresData.filter((o: Oeuvre) => {
                const typeNom = o.TypeOeuvre?.nom_type?.toLowerCase() || '';
                return !typeNom.includes('artisanat');
              });
              setOeuvres(filteredData);
              setError('Limite de requêtes atteinte. Affichage des données en cache.');
              return;
            } catch (e) {
              console.error('Erreur parsing backup:', e);
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
        // Recherche dans le titre
        if (o.titre?.toLowerCase().includes(query)) return true;
        
        // Recherche dans la description
        if (o.description?.toLowerCase().includes(query)) return true;
        
        // Recherche dans les contributeurs
        const contributeurs = [];
        if (o.OeuvreIntervenants) {
          contributeurs.push(...o.OeuvreIntervenants.map(oi => 
            oi.Intervenant?.nom || `${oi.Intervenant?.nom} ${oi.Intervenant?.prenom}`
          ));
        }
        if (o.Users) {
          contributeurs.push(...o.Users.map(u => 
            u.nom || `${u.nom} ${u.prenom}`
          ));
        }
        const contributeursStr = contributeurs.join(' ').toLowerCase();
        if (contributeursStr.includes(query)) return true;
        
        // Recherche dans les tags
        if (o.Tags) {
          const tagsStr = o.Tags.map(t => t.nom).join(' ').toLowerCase();
          if (tagsStr.includes(query)) return true;
        }
        
        // Recherche dans le type
        const typeNom = o.TypeOeuvre?.nom_type?.toLowerCase() || '';
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
    stats
  };
}