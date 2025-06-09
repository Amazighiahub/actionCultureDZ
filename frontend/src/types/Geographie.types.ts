// Geographie.types.ts

export interface Wilaya {
  idWilaya: number;
  codeW: number;
  nom: string;
  wilayaNameAscii: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Daira {
  idDaira: number;
  nom: string;
  dairaNameAscii: string;
  wilayaId: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  wilaya?: Wilaya;
  communes?: Commune[];
  lieux?: Lieu[];
}

export interface Commune {
  idCommune: number;
  nom: string;
  communeNameAscii: string;
  dairaId: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  daira?: Daira;
  localites?: Localite[];
  lieux?: Lieu[];
}

export interface Localite {
  idLocalite: number;
  nom: string;
  localiteNameAscii: string;
  idCommune: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  commune?: Commune;
  lieux?: Lieu[];
}

export interface Lieu {
  idLieu: number;
  typeLieu: 'Wilaya' | 'Daira' | 'Commune';
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  wilaya?: Wilaya;
  daira?: Daira;
  commune?: Commune;
  localite?: Localite;
  detailLieu?: DetailLieu;
  services?: Service[];
  lieuMedias?: LieuMedia[];
  evenements?: Evenement[];
  programmes?: Programme[];
  parcours?: Parcours[];
}

export interface DetailLieu {
  idDetailLieu: number;
  description?: string;
  horaires?: string;
  histoire?: string;
  idLieu: number;
  lieuId?: number;
  referencesHistoriques?: string;
  noteMoyenne?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  lieu?: Lieu;
  monuments?: Monument[];
  vestiges?: Vestige[];
}

export interface Service {
  id: number;
  idLieu: number;
  lieuId?: number;
  nom: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  lieu?: Lieu;
}

export interface LieuMedia {
  id: number;
  idLieu: number;
  lieuId?: number;
  type: string;
  url: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  lieu?: Lieu;
}

export interface Monument {
  id: number;
  detailLieuId: number;
  nom: string;
  description: string;
  type: 'Mosquée' | 'Palais' | 'Fort' | 'Tour' | 'Monument' | 'Statue' | 'Autre';
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  detailLieu?: DetailLieu;
}

export interface Vestige {
  id: number;
  detailLieuId: number;
  nom: string;
  description: string;
  type: 'Ruines' | 'Murailles' | 'Site_Archeologique' | 'Necropole' | 'Grotte' | 'Autre';
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  detailLieu?: DetailLieu;
}

// Import types from other files
import { Evenement } from './Evenement.types';
import { Programme, Parcours } from './Evenement.types';