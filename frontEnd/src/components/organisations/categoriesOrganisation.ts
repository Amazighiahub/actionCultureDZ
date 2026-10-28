/**
 * Familles d'organisations de l'annuaire (même découpage que le serveur :
 * backend/services/organisations/categories.js). Le libellé se traduit avec
 * t(`organisations.categories.${cle}`).
 */
import type React from 'react';
import { Users, BookOpen, Landmark, Building2, Briefcase, Star } from 'lucide-react';

export const CATEGORIES_ORGANISATION = ['associations', 'edition', 'culture', 'institutions', 'entreprises', 'autres'] as const;
export type CategorieOrganisation = typeof CATEGORIES_ORGANISATION[number];

export const STYLE_CATEGORIE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  associations: { icon: Users, color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-950/30' },
  edition: { icon: BookOpen, color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/30' },
  culture: { icon: Landmark, color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/30' },
  institutions: { icon: Building2, color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-950/30' },
  entreprises: { icon: Briefcase, color: 'text-rose-700', bg: 'bg-rose-100 dark:bg-rose-950/30' },
  autres: { icon: Star, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-950/30' },
};

export const styleCategorie = (categorie?: string | null) => STYLE_CATEGORIE[categorie || 'autres'] || STYLE_CATEGORIE.autres;

/** Organisation telle que renvoyée par l'annuaire (textes multilingues bruts) */
export interface OrganisationAnnuaire {
  id_organisation: number;
  nom: unknown;
  description?: unknown;
  logo_url?: string | null;
  categorie: string;
  TypeOrganisation?: { id_type_organisation: number; nom: unknown; code?: string | null } | null;
  Wilaya?: { id_wilaya: number; nom?: string; wilaya_name_ascii?: string } | null;
  evenements?: number;
  oeuvres?: number;
}
