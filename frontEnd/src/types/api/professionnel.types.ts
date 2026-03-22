// types/api/professionnel.types.ts
// Types pour les réponses API du dashboard professionnel

export interface EntityStatsResponse {
  total_vues: number;
  vues_30_jours: number;
  favoris: number;
  commentaires: number;
  note_moyenne: number;
  evolution: Array<{ date: string; vues: number }>;
}

export interface ProfileUpdateData {
  nom?: string;
  prenom?: string;
  biographie?: string;
  specialites?: string[];
  titre_professionnel?: string;
  entreprise?: string;
  site_web?: string;
  telephone?: string;
  photo_url?: string;
  reseaux_sociaux?: Record<string, string>;
}

export interface ProfileResponse {
  id_user: number;
  nom: string;
  prenom: string;
  email: string;
  biographie?: string;
  specialites?: string[];
  photo_url?: string;
}

export interface PortfolioMediaResponse {
  id: number;
  url: string;
  titre?: string;
  description?: string;
  ordre: number;
  type: string;
}

export interface CalendarEventData {
  id: number;
  type: 'evenement' | 'programme' | 'deadline';
  lieu?: string;
  description?: string;
  participants?: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}
