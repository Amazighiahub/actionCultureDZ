// Media.types.ts

export type TypeMedia = 'image' | 'video' | 'audio' | 'document' | 'autre';
export type QualiteMedia = 'basse' | 'moyenne' | 'haute' | 'tres_haute';
export type DroitsUsage = 'libre' | 'attribution' | 'non_commercial' | 'pas_modification' | 'copyright' | 'autre';

export interface Media {
  idMedia: number;
  idOeuvre?: number;
  idEvenement?: number;
  typeMedia: TypeMedia;
  url: string;
  titre?: string;
  description?: string;
  tags?: any;
  metadata?: any;
  qualite?: QualiteMedia;
  droitsUsage?: DroitsUsage;
  altText?: string;
  credit?: string;
  visiblePublic?: boolean;
  ordre?: number;
  thumbnailUrl?: string;
  duree?: number; // En secondes pour video/audio
  tailleFichier?: number; // En bytes
  mimeType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: any; // From Oeuvre types
  evenement?: any; // From Evenement types
}