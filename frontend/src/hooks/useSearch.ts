// hooks/useSearch.ts - Version corrigée et complète
import { useState, useEffect } from 'react';
import OeuvreService from '../services/oeuvre.service';
import EvenementService from '../services/evenement.service';
import PatrimoineService from '../services/patrimoine.service';
import { Oeuvre } from '../types/Oeuvre.types';
import { Evenement } from '../types/Evenement.types';
import { Lieu } from '../types/Geographie.types';

interface SearchResults {
  oeuvres: Oeuvre[];
  evenements: Evenement[];
  sites: Lieu[];
}

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    oeuvres: [],
    evenements: [],
    sites: []
  });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults({ oeuvres: [], evenements: [], sites: [] });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    try {
      setIsSearching(true);
      
      const [oeuvresRes, evenementsRes, sitesRes] = await Promise.all([
        OeuvreService.search({ q: query }),
        EvenementService.getAll({ search: query, limit: 5 }),
        PatrimoineService.recherche(query)
      ]);

      setResults({
        oeuvres: oeuvresRes.data || [],
        evenements: evenementsRes.data || [],
        sites: sitesRes.data || []
      });
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setResults({ oeuvres: [], evenements: [], sites: [] });
    } finally {
      setIsSearching(false);
    }
  };

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasResults: !!(results.oeuvres.length || results.evenements.length || results.sites.length)
  };
};