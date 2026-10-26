/**
 * Types de service (champ type_service du modèle Service) : icône et couleurs communes
 * à l'annuaire, à la fiche d'un service et à l'encadré « Services à proximité ».
 * Le libellé se traduit avec t(`service.types.${type}`).
 */
import type React from 'react';
import { Utensils, Hotel, Navigation, Car, Palette, MapPin, Star } from 'lucide-react';

export const TYPES_SERVICE = ['restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'location', 'autre'] as const;
export type TypeService = typeof TYPES_SERVICE[number];

export const STYLE_TYPE_SERVICE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  restaurant: { icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950/30' },
  hotel: { icon: Hotel, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/30' },
  guide: { icon: Navigation, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/30' },
  transport: { icon: Car, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-950/30' },
  artisanat: { icon: Palette, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/30' },
  location: { icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-950/30' },
  autre: { icon: Star, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-950/30' },
};

export const styleTypeService = (type?: string | null) => STYLE_TYPE_SERVICE[type || 'autre'] || STYLE_TYPE_SERVICE.autre;
