
// types/models/lieux-details.types.ts

import { Lieu } from './lieu.types';
import { User } from './user.types';

export interface DetailLieu {
  id_detailLieu: number;
  description?: string;
  horaires?: string;
  histoire?: string;
  id_lieu: number;
  referencesHistoriques?: string;
  noteMoyenne?: number;
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  Lieu?: Lieu;
  Monuments?: Monument[];
  Vestiges?: Vestige[];
  Service?: Service[];
}

export interface Monument {
  id: number;
  detailLieuId: number;
  nom: string;
  description: string;
  type: 'Mosquée' | 'Palais' | 'Statue' | 'Tour' | 'Musée';
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  DetailLieu?: DetailLieu;
}

export interface Vestige {
  id: number;
  detailLieuId: number;
  nom: string;
  description: string;
  type: 'Ruines' | 'Murailles' | 'Site archéologique';
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  DetailLieu?: DetailLieu;
}

export interface Service {
  id: number;
  id_detailLieu: number;
  nom: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  DetailLieu: DetailLieu;
}

export interface LieuMedia {
  id: number;
  id_lieu: number;
  type: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  Lieu?: Lieu;
}

export interface Parcours {
  id_parcours: number;
  nom_parcours: string;
  description?: string;
  duree_estimee?: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  theme?: string;
  distance_km?: number;
  point_depart?: string;
  point_arrivee?: string;
  statut: 'actif' | 'inactif' | 'maintenance';
  id_createur: number;
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  Createur?: User;
  Lieux?: Lieu[];
}