// types/models/lieux-details.types.ts

import { Lieu } from './lieu.types';
import { User } from './user.types';

export interface DetailLieu {
  id_detailLieu: number;
  id_lieu: number;
  description?: string;
  horaires?: string;
  histoire?: string;
  referencesHistoriques?: string;
  noteMoyenne?: number; // Validation : 0 à 5
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  Lieu?: Lieu;
  Monuments?: Monument[];
  Vestiges?: Vestige[];
  // ❌ SUPPRIMÉ : Service n'est plus lié à DetailLieu
}

export interface Monument {
  id: number;
  id_detail_lieu: number; // ✅ CORRIGÉ : snake_case au lieu de camelCase
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
  id_detail_lieu: number; // ✅ CORRIGÉ : snake_case au lieu de camelCase
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
  id_lieu: number; // ✅ CORRIGÉ : id_lieu au lieu de id_detailLieu
  nom: string;
  disponible?: boolean; // ✅ AJOUTÉ : nouveau champ
  description?: string; // ✅ AJOUTÉ : nouveau champ
  createdAt: string;
  updatedAt: string;
  
  // Relations (optionnelles)
  Lieu?: Lieu; // ✅ CORRIGÉ : Lieu au lieu de DetailLieu
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

export interface QrCode {
  id_qr_code: number;
  id_lieu: number;
  code_unique: string; // UNIQUE constraint
  url_destination: string;
  qr_image_url?: string;
  actif: boolean;
  date_creation: string;
  date_expiration?: string;
  
  // Relations (optionnelles)
  Lieu?: Lieu;
  QrScans?: QrScan[];
}

export interface QrScan {
  id_scan: number;
  id_qr_code: number;
  id_user?: number;
  ip_address?: string;
  user_agent?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  pays?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  is_unique?: boolean;
  date_scan: string;
  
  // Relations (optionnelles)
  QrCode?: QrCode;
  User?: User;
}

export interface Parcours {
  id_parcours: number;
  nom_parcours: string;
  description?: string;
  duree_estimee?: number; // en minutes
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
  ParcoursLieux?: ParcoursLieu[];
}

export interface ParcoursLieu {
  id_parcours_lieu: number;
  id_parcours: number;
  id_lieu: number;
  id_evenement?: number;
  ordre: number;
  duree_estimee?: number;
  distance_precedent?: number;
  temps_trajet?: number;
  notes?: string;
  transport_mode?: 'marche' | 'velo' | 'voiture' | 'transport_public';
  createdAt: string;
  updatedAt: string;
  
  // ❌ PAS de ParcourIdParcours !
  
  // Relations (optionnelles)
  Parcours?: Parcours;
  Lieu?: Lieu;
}

// Types pour les DTOs
export type CreateServiceDTO = Omit<Service, 
  'id' | 'createdAt' | 'updatedAt' | 'Lieu'
>;

export type UpdateServiceDTO = Partial<CreateServiceDTO>;

export type CreateMonumentDTO = Omit<Monument, 
  'id' | 'createdAt' | 'updatedAt' | 'DetailLieu'
>;

export type CreateVestigeDTO = Omit<Vestige, 
  'id' | 'createdAt' | 'updatedAt' | 'DetailLieu'
>;

export type CreateQrCodeDTO = Omit<QrCode, 
  'id_qr_code' | 'date_creation' | 'Lieu' | 'QrScans'
>;

// Helpers pour la validation
export function validateNoteMoyenne(note?: number): boolean {
  if (note === undefined || note === null) return true;
  return note >= 0 && note <= 5;
}