// components/dashboard/DashboardFilters.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger } from
'@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw } from
'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';import { useTranslation } from "react-i18next";

interface FilterOptions {
  types?: string[];
  status?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  wilayas?: number[];
  search?: string;
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  activeFiltersCount: number;
  availableTypes?: string[];
  availableStatus?: string[];
  availableWilayas?: Array<{id: number;nom: string;}>;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  onFiltersChange,
  activeFiltersCount,
  availableTypes = ['visiteur', 'artisan', 'guide', 'expert'],
  availableStatus = ['actif', 'inactif', 'suspendu', 'en_attente'],
  availableWilayas = []
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    status: [],
    dateRange: undefined,
    wilayas: [],
    search: ''
  });

  const [isOpen, setIsOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Appliquer les filtres
  const { t } = useTranslation();const applyFilters = () => {
    onFiltersChange(filters);
    setIsOpen(false);
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    const emptyFilters: FilterOptions = {
      types: [],
      status: [],
      dateRange: undefined,
      wilayas: [],
      search: ''
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  // Toggle pour les checkbox
  const toggleArrayFilter = (array: string[] | number[], value: string | number, key: keyof FilterOptions) => {
    const currentArray = filters[key] as any[] || [];
    const newArray = currentArray.includes(value) ?
    currentArray.filter((item) => item !== value) :
    [...currentArray, value];

    setFilters({ ...filters, [key]: newArray });
  };

  // Compter les filtres actifs
  const countActiveFilters = () => {
    let count = 0;
    if (filters.types && filters.types.length > 0) count += filters.types.length;
    if (filters.status && filters.status.length > 0) count += filters.status.length;
    if (filters.dateRange) count += 1;
    if (filters.wilayas && filters.wilayas.length > 0) count += filters.wilayas.length;
    if (filters.search) count += 1;
    return count;
  };

  // Composant pour afficher les filtres actifs
  const ActiveFilterBadges = () => {const { t } = useTranslation();
    const badges: React.ReactNode[] = [];

    filters.types?.forEach((type) => {
      badges.push(
        <Badge key={`type-${type}`} variant="secondary" className="gap-1">{t("dashboard_dashboardfilters.type")}
          {type}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => toggleArrayFilter(filters.types!, type, 'types')} />

        </Badge>
      );
    });

    filters.status?.forEach((status) => {
      badges.push(
        <Badge key={`status-${status}`} variant="secondary" className="gap-1">{t("dashboard_dashboardfilters.statut")}
          {status}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => toggleArrayFilter(filters.status!, status, 'status')} />

        </Badge>
      );
    });

    if (filters.dateRange) {
      badges.push(
        <Badge key="date" variant="secondary" className="gap-1">
          {format(filters.dateRange.from, 'dd/MM/yyyy', { locale: fr })} - 
          {format(filters.dateRange.to, 'dd/MM/yyyy', { locale: fr })}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => setFilters({ ...filters, dateRange: undefined })} />

        </Badge>
      );
    }

    return badges.length > 0 ?
    <div className="flex flex-wrap gap-2 mb-4">
        {badges}
        <Button
        variant="ghost"
        size="sm"
        onClick={resetFilters}
        className="h-6 px-2">

          <RotateCcw className="h-3 w-3 mr-1" />{t("dashboard_dashboardfilters.tout_effacer")}

      </Button>
      </div> :
    null;
  };

  return (
    <>
      {/* Bouton d'ouverture avec compteur */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />{t("dashboard_dashboardfilters.filtres")}

            {countActiveFilters() > 0 &&
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">

                {countActiveFilters()}
              </Badge>
            }
          </Button>
        </SheetTrigger>
        
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{t("dashboard_dashboardfilters.filtres_avancs")}</SheetTitle>
            <SheetDescription>{t("dashboard_dashboardfilters.affinez_votre_recherche")}

            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Types d'utilisateurs */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dashboard_dashboardfilters.types_dutilisateurs")}</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableTypes.map((type) =>
                <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                    id={`type-${type}`}
                    checked={filters.types?.includes(type) || false}
                    onCheckedChange={(checked) => {
                      toggleArrayFilter(filters.types || [], type, 'types');
                    }} />

                    <label
                    htmlFor={`type-${type}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">

                      {type}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Statuts */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dashboard_dashboardfilters.statuts")}</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableStatus.map((status) =>
                <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                    id={`status-${status}`}
                    checked={filters.status?.includes(status) || false}
                    onCheckedChange={(checked) => {
                      toggleArrayFilter(filters.status || [], status, 'status');
                    }} />

                    <label
                    htmlFor={`status-${status}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">

                      {status.replace('_', ' ')}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Période */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dashboard_dashboardfilters.priode_dinscription")}</Label>
              <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal">

                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange ?
                    <>
                        {format(filters.dateRange.from, 'dd/MM/yyyy', { locale: fr })} - 
                        {format(filters.dateRange.to, 'dd/MM/yyyy', { locale: fr })}
                      </> :

                    <span>{t("dashboard_dashboardfilters.slectionner_une_priode")}</span>
                    }
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: filters.dateRange?.from,
                      to: filters.dateRange?.to
                    }}
                    onSelect={(range: any) => {
                      if (range?.from && range?.to) {
                        setFilters({ ...filters, dateRange: { from: range.from, to: range.to } });
                        setDateRangeOpen(false);
                      }
                    }}
                    initialFocus />

                </PopoverContent>
              </Popover>
            </div>

            {/* Filtres prédéfinis */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("dashboard_dashboardfilters.filtres_rapides")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    setFilters({
                      ...filters,
                      dateRange: { from: lastWeek, to: now }
                    });
                  }}>{t("dashboard_dashboardfilters.derniers_jours")}


                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    setFilters({
                      ...filters,
                      dateRange: { from: lastMonth, to: now }
                    });
                  }}>{t("dashboard_dashboardfilters.derniers_jours_1")}


                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      ...filters,
                      status: ['en_attente']
                    });
                  }}>{t("dashboard_dashboardfilters.attente_uniquement")}


                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      ...filters,
                      types: ['artisan', 'guide', 'expert']
                    });
                  }}>{t("dashboard_dashboardfilters.professionnels")}


                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetFilters();
                setIsOpen(false);
              }}>{t("dashboard_dashboardfilters.rinitialiser")}


            </Button>
            <Button
              className="flex-1"
              onClick={applyFilters}>{t("dashboard_dashboardfilters.appliquer_les_filtres")}


            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Afficher les badges de filtres actifs en dehors du Sheet */}
      <ActiveFilterBadges />
    </>);

};