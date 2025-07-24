// types/models/lieu.types.ts

import { TypeLieu } from '../enums/evenement.enums';
import { Wilaya, Daira, Commune, Localite } from './geography.types';
import { DetailLieu, Service, LieuMedia, Parcours } from './lieux-details.types';
import { Evenement } from './evenement.types';
import { Programme } from './programme.types';

export interface Lieu {
  id_lieu: number;
  typeLieu: TypeLieu;
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  typeLieuCulturel: string;
  // Relations (optionnelles)
  Wilaya?: Wilaya;
  Daira?: Daira;
  Commune?: Commune;
  Localite?: Localite;
  DetailLieu?: DetailLieu;
  Services?: Service[];
  Media?: LieuMedia[];
  Evenements?: Evenement[];
  Programmes?: Programme[];
  Parcours?: Parcours[];
}

// Type pour la création d'un lieu
export type CreateLieuDTO = Omit<Lieu, 'id_lieu'>;

// Type pour la mise à jour d'un lieu
export type UpdateLieuDTO = Partial<CreateLieuDTO>;