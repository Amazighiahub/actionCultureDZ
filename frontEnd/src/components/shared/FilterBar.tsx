/**
 * FilterBar - Barre de filtres réutilisable
 * Recherche, filtres multiples et actions
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/UI/input';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/UI/select';
import {
  Search, X, RefreshCw, Filter, SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterBarProps {
  // Recherche
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filtres
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  
  // Actions
  onReset?: () => void;
  onRefresh?: () => void;
  
  // Personnalisation
  className?: string;
  showActiveFilters?: boolean;
  children?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  onRefresh,
  className,
  showActiveFilters = true,
  children,
}) => {
  const { t } = useTranslation();

  // Compter les filtres actifs
  const activeFiltersCount = Object.values(filterValues).filter(
    (v) => v && v !== 'tous' && v !== 'all'
  ).length;

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = activeFiltersCount > 0 || searchValue.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Ligne principale */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Recherche */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || t('common.search', 'Rechercher...')}
              className="pl-9 pr-9"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Filtres */}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filterValues[filter.key] || 'tous'}
            onValueChange={(value) => onFilterChange?.(filter.key, value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={filter.placeholder || filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Actions */}
        <div className="flex gap-2">
          {hasActiveFilters && onReset && (
            <Button variant="ghost" size="icon" onClick={onReset} title={t('common.resetFilters', 'Réinitialiser')}>
              <X className="h-4 w-4" />
            </Button>
          )}
          
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} title={t('common.refresh', 'Actualiser')}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Actions personnalisées */}
          {children}
        </div>
      </div>

      {/* Filtres actifs */}
      {showActiveFilters && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Filter className="h-4 w-4" />
            {t('common.activeFilters', 'Filtres actifs')}:
          </span>
          
          {/* Badge recherche */}
          {searchValue && (
            <Badge variant="secondary" className="gap-1">
              {t('common.search', 'Recherche')}: "{searchValue}"
              <button
                onClick={() => onSearchChange?.('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Badges filtres */}
          {filters.map((filter) => {
            const value = filterValues[filter.key];
            if (!value || value === 'tous' || value === 'all') return null;
            
            const option = filter.options?.find((o) => o.value === value);
            
            return (
              <Badge key={filter.key} variant="secondary" className="gap-1">
                {filter.label}: {option?.label || value}
                <button
                  onClick={() => onFilterChange?.(filter.key, 'tous')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}

          {/* Bouton tout effacer */}
          {activeFiltersCount > 1 && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-6 text-xs"
            >
              {t('common.clearAll', 'Tout effacer')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
