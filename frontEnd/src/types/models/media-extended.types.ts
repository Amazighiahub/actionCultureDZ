// types/models/media-extended.types.ts

import { Media } from './media.types';

/**
 * Media avec propriétés étendues
 * Utilisé dans l'application pour les médias d'œuvres
 */
export interface MediaExtended extends Media {
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
  // Seulement des images : un extrait audio ou une vidéo n'est pas une couverture (image cassée sinon)
  const images = medias.filter(m => !m.type_media || m.type_media === 'image');

  // Priorité 1: Image marquée comme principale
  const principal = images.find(m => m.is_Principale);
  if (principal) return principal.url;

  // Priorité 2: Image avec ordre = 1
  const firstOrder = images.find(m => m.ordre === 1);
  if (firstOrder) return firstOrder.url;

  // Priorité 3: Première image
  return images[0]?.url;
}