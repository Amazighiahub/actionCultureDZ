// types/models/oeuvre-extended.types.ts

import { Oeuvre } from './oeuvre.types';

/**
 * Type d'œuvre avec statistiques pour le dashboard professionnel
 */
export interface OeuvreWithStats extends Oeuvre {
  // Statistiques
  vues: number;
  note_moyenne: number;
  nombre_favoris?: number;
  nombre_commentaires?: number;
  
  // Informations commerciales (pour artisanat)
  prix?: number;
  stock?: number;
  
  // Métriques de performance
  taux_engagement?: number;
  evolution_vues_mois?: number;
}

/**
 * Type pour les œuvres dans la liste du dashboard
 */
export interface OeuvreDashboardItem {
  id_oeuvre: number;
  titre: string;
  statut: string;
  vues: number;
  note_moyenne: number;
  prix?: number;
  TypeOeuvre?: {
    nom_type: string;
  };
  // Ajoutez d'autres champs selon vos besoins
}

/**
 * Type pour la réponse paginée des œuvres
 */
export interface OeuvresWithStatsResponse {
  items: OeuvreWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}