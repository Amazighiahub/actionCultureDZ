// types/models/media.types.ts

import { TypeMedia, QualiteMedia, DroitsUsage } from '../enums/media.enums';
import { MediaMetadata, Tag } from './specific-types';
import { Oeuvre } from './oeuvre.types';
import { Evenement } from './evenement.types';

export interface Media {
  id_media: number;
  id_oeuvre?: number;
  id_evenement?: number;
  type_media: TypeMedia;
  url: string;
  titre?: string;
  description?: string;
  tags: Tag[];
  metadata: MediaMetadata;
  qualite: QualiteMedia;
  droits_usage: DroitsUsage;
  alt_text?: string;
  credit?: string;
  visible_public: boolean;
  ordre: number;
  thumbnail_url?: string;
  is_Principale?: boolean;
  duree?: number;
  taille_fichier?: number;
  mime_type?: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Evenement?: Evenement;
}

// Type pour la création d'un média
export type CreateMediaDTO = Omit<Media, 'id_media'>;

// Type pour la mise à jour d'un média
export type UpdateMediaDTO = Partial<CreateMediaDTO>;