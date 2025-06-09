// src/contexts/FilterContext.tsx - Contexte pour les filtres partagés
import React, { createContext, useContext, useState, useCallback } from 'react';

interface FilterState {
  search: string;
  categories: string[];
  wilayas: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  priceRange: {
    min?: number;
    max?: number;
  };
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  view: 'grid' | 'list';
}

interface FilterContextType {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  addWilaya: (wilaya: string) => void;
  removeWilaya: (wilaya: string) => void;
  setDateRange: (start?: string, end?: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  toggleSortOrder: () => void;
  toggleView: () => void;
}

const defaultFilters: FilterState = {
  search: '',
  categories: [],
  wilayas: [],
  dateRange: {},
  priceRange: {},
  sortBy: 'date_creation',
  sortOrder: 'DESC',
  view: 'grid'
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const addCategory = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: [...prev.categories, category]
    }));
  }, []);

  const removeCategory = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  }, []);

  const addWilaya = useCallback((wilaya: string) => {
    setFilters(prev => ({
      ...prev,
      wilayas: [...prev.wilayas, wilaya]
    }));
  }, []);

  const removeWilaya = useCallback((wilaya: string) => {
    setFilters(prev => ({
      ...prev,
      wilayas: prev.wilayas.filter(w => w !== wilaya)
    }));
  }, []);

  const setDateRange = useCallback((start?: string, end?: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { start, end }
    }));
  }, []);

  const setPriceRange = useCallback((min?: number, max?: number) => {
    setFilters(prev => ({
      ...prev,
      priceRange: { min, max }
    }));
  }, []);

  const toggleSortOrder = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'ASC' ? 'DESC' : 'ASC'
    }));
  }, []);

  const toggleView = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      view: prev.view === 'grid' ? 'list' : 'grid'
    }));
  }, []);

  const value: FilterContextType = {
    filters,
    setFilter,
    resetFilters,
    addCategory,
    removeCategory,
    addWilaya,
    removeWilaya,
    setDateRange,
    setPriceRange,
    toggleSortOrder,
    toggleView
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

