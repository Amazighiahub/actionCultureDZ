/**
 * Détails d'un service « comme TripAdvisor », lot 2 (2026-11-16). Mêmes listes fermées que le serveur
 * (backend/services/service/detailsService.js) : une clé ajoutée ici doit l'être là-bas aussi.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Wifi, ParkingCircle, Snowflake, Flame, Accessibility, Umbrella, Waves, Coffee, Soup, Salad, Bike,
  ShoppingBag, CreditCard, Baby, Moon, Plane, PawPrint, CigaretteOff
} from 'lucide-react';

export const EQUIPEMENTS_SERVICE: { cle: string; icone: LucideIcon; libelle: string }[] = [
  { cle: 'wifi', icone: Wifi, libelle: 'Wi-Fi' },
  { cle: 'parking', icone: ParkingCircle, libelle: 'Parking' },
  { cle: 'climatisation', icone: Snowflake, libelle: 'Climatisation' },
  { cle: 'chauffage', icone: Flame, libelle: 'Chauffage' },
  { cle: 'acces_handicape', icone: Accessibility, libelle: 'Accès fauteuil roulant' },
  { cle: 'terrasse', icone: Umbrella, libelle: 'Terrasse' },
  { cle: 'piscine', icone: Waves, libelle: 'Piscine' },
  { cle: 'petit_dejeuner', icone: Coffee, libelle: 'Petit-déjeuner' },
  { cle: 'cuisine_traditionnelle', icone: Soup, libelle: 'Cuisine traditionnelle' },
  { cle: 'vegetarien', icone: Salad, libelle: 'Plats végétariens' },
  { cle: 'livraison', icone: Bike, libelle: 'Livraison' },
  { cle: 'a_emporter', icone: ShoppingBag, libelle: 'À emporter' },
  { cle: 'paiement_carte', icone: CreditCard, libelle: 'Paiement par carte' },
  { cle: 'famille', icone: Baby, libelle: 'Adapté aux familles' },
  { cle: 'salle_priere', icone: Moon, libelle: 'Salle de prière' },
  { cle: 'transfert_aeroport', icone: Plane, libelle: 'Navette aéroport' },
  { cle: 'animaux', icone: PawPrint, libelle: 'Animaux acceptés' },
  { cle: 'non_fumeur', icone: CigaretteOff, libelle: 'Non-fumeur' },
];

/** Langues parlées : nom écrit dans sa propre langue (lisible par tous) */
export const LANGUES_SERVICE: { code: string; libelle: string }[] = [
  { code: 'ar', libelle: 'العربية' },
  { code: 'dz', libelle: 'الدارجة' },
  { code: 'tz', libelle: 'Tamaziɣt ⵜⴰⵎⴰⵣⵉⵖⵜ' },
  { code: 'fr', libelle: 'Français' },
  { code: 'en', libelle: 'English' },
  { code: 'es', libelle: 'Español' },
  { code: 'it', libelle: 'Italiano' },
  { code: 'de', libelle: 'Deutsch' },
  { code: 'tr', libelle: 'Türkçe' },
  { code: 'zh', libelle: '中文' },
];

/** Unité de la capacité selon le type de service */
export const UNITE_CAPACITE: Record<string, string> = {
  restaurant: 'couverts',
  hotel: 'chambres',
  transport: 'places',
  guide: 'personnes par groupe',
  location: 'personnes',
};

/** Lien wa.me à partir d'un numéro saisi (0555… algérien → 213555…) */
export function lienWhatsapp(numero: string): string | null {
  let chiffres = numero.replace(/[^0-9]/g, '');
  if (!chiffres) return null;
  if (numero.trim().startsWith('00')) chiffres = chiffres.slice(2);
  else if (chiffres.startsWith('0')) chiffres = `213${chiffres.slice(1)}`;
  return chiffres.length >= 8 ? `https://wa.me/${chiffres}` : null;
}
