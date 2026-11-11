/**
 * Types de service (champ type_service du modèle Service) : icône et couleurs communes
 * à l'annuaire, à la fiche d'un service et à l'encadré « Services à proximité ».
 * Le libellé se traduit avec t(`service.types.${type}`).
 */
import type React from 'react';
import type { TFunction } from 'i18next';
import { Utensils, Hotel, Navigation, Car, Palette, MapPin, Star } from 'lucide-react';

export const TYPES_SERVICE = ['restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'location', 'autre'] as const;
export type TypeService = typeof TYPES_SERVICE[number];

// Teintes 700 (400 en mode sombre) : contraste d'au moins 4,5:1 sur les fonds clairs, y compris le titre
// du type en petit texte (avant 600 : 3 à 3,5:1, audit V11 UX-24)
export const STYLE_TYPE_SERVICE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  restaurant: { icon: Utensils, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950/30' },
  hotel: { icon: Hotel, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/30' },
  guide: { icon: Navigation, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/30' },
  transport: { icon: Car, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950/30' },
  artisanat: { icon: Palette, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/30' },
  location: { icon: MapPin, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/30' },
  autre: { icon: Star, color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-950/30' },
};

export const styleTypeService = (type?: string | null) => STYLE_TYPE_SERVICE[type || 'autre'] || STYLE_TYPE_SERVICE.autre;

// Ce que couvre le tarif selon le type (artisanat et autre : rien, les prix varient trop)
const UNITE_TARIF: Record<string, string> = {
  restaurant: 'par personne',
  hotel: 'par nuit',
  guide: 'par visite',
  transport: 'par trajet',
  location: 'par jour',
};

export const uniteTarif = (t: TFunction, type?: string | null): string =>
  type && UNITE_TARIF[type] ? String(t(`service.uniteTarif.${type}`, UNITE_TARIF[type])) : '';

/** « 500 – 2 000 DA par personne » : fourchette déjà formatée + unité du type */
export const tarifAvecUnite = (t: TFunction, type: string | null | undefined, fourchette: string): string => {
  const unite = uniteTarif(t, type);
  return fourchette && unite ? `${fourchette} ${unite}` : fourchette;
};
