// types/models/media-extended.types.ts

import { Media } from './media.types';

/**
 * Media avec propriétés étendues
 * Utilisé dans l'application pour les médias d'œuvres
 */
export interface MediaExtended extends Media {
  // Propriété indiquant si c'est l'image principale
  is_principal?: boolean;
  
  // Propriétés additionnelles qui peuvent être retournées par l'API
  date_creation?: string;
  date_modification?: string;
}

/**
 * Media spécifique pour les œuvres
 */
export interface OeuvreMedia extends MediaExtended {
  id_oeuvre: number; // Requis pour les médias d'œuvres
}

/**
 * Media spécifique pour les événements
 */
export interface EvenementMedia extends MediaExtended {
  id_evenement: number; // Requis pour les médias d'événements
}

/**
 * Helper pour déterminer l'image principale
 */
export function getMainImage(medias: MediaExtended[]): string | undefined {
  // Priorité 1: Image marquée comme principale
  const principal = medias.find(m => m.is_principal);
  if (principal) return principal.url;
  
  // Priorité 2: Image avec ordre = 1
  const firstOrder = medias.find(m => m.ordre === 1);
  if (firstOrder) return firstOrder.url;
  
  // Priorité 3: Première image
  return medias[0]?.url;
}

/**
 * Helper pour trier les médias
 */
export function sortMedias(medias: MediaExtended[]): MediaExtended[] {
  return medias.sort((a, b) => {
    // Principal d'abord
    if (a.is_principal && !b.is_principal) return -1;
    if (!a.is_principal && b.is_principal) return 1;
    
    // Puis par ordre
    return (a.ordre || 999) - (b.ordre || 999);
  });
}