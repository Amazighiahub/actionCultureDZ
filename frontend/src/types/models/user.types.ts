// types/models/user.types.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  Sexe, 
  StatutUser, 
  StatutValidation, 
  ThemePrefere 
} from '../enums/user.enums';
import {
  ReseauxSociaux,
  Certification,
  DocumentFourni
} from './specific-types';
import { Wilaya } from './geography.types';
import { Oeuvre } from './oeuvre.types';
import { Evenement } from './evenement.types';
import { Role } from '../models/references.types';
import { Organisation } from '../models/organisation.types';
import { Commentaire, Favori } from '../models/tracking.types';

/**
 * Interface pour TypeUser
 */
import { OeuvreUser, OeuvreIntervenant } from './associations.types';

export interface TypeUser {
  id_type_user: number;
  nom_type: string;
  description?: string;
  
  // Relations (optionnelles)
  Users?: User[];
  OeuvreUsers?: OeuvreUser[];
}

// Type pour la création d'un type user
export type CreateTypeUserDTO = Omit<TypeUser, 'id_type_user' | 'Users' | 'OeuvreUsers'>;

// Type pour la mise à jour d'un type user
export type UpdateTypeUserDTO = Partial<CreateTypeUserDTO>;

// Types prédéfinis courants (à adapter selon vos besoins)
export enum TypeUserEnum {
  ADMIN = 'admin',
  MODERATEUR = 'moderateur',
  CONTRIBUTEUR = 'contributeur',
  MEMBRE = 'membre',
  INVITE = 'invite'
}

// Helper pour vérifier les permissions d'un type
export function hasPermission(typeUser: TypeUser, permission: string): boolean {
  // Logique à implémenter selon vos besoins
  // Exemple simple :
  const permissions: Record<string, string[]> = {
    'admin': ['*'], // Toutes les permissions
    'moderateur': ['read', 'write', 'moderate'],
    'contributeur': ['read', 'write'],
    'membre': ['read'],
    'invite': ['read_limited']
  };
  
  const userPermissions = permissions[typeUser.nom_type.toLowerCase()] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
}

/**
 * Type minimal pour les permissions
 * Utilisé par le service de permissions
 */
export interface UserForPermissions {
  id_user: number;
  id_type_user: number; // Changé de type_user: TypeUser à id_type_user: number
  statut: StatutUser;
  statut_validation?: StatutValidation;
  professionnel_valide?: boolean;
  raison_rejet?: string;
  Roles?: Role[];
}

/**
 * Type complet de l'utilisateur avec toutes les propriétés
 */
export interface User {
  id_user: number;
  email: string;
  nom: string;
  prenom: string;
  id_type_user: number; // Changé de type_user: TypeUser
  statut: StatutUser;
  photo_url?: string;
  wilaya_residence?: number;

  statut_validation?: StatutValidation;
  raison_rejet?: string;
  accepte_conditions: boolean;
  date_creation?: string;
  derniere_connexion?: string;
  
  // NOUVEAU : Référence au validateur
  id_user_validate?: number;
  date_validation?: string;
  
  // Relations
  Roles?: Role[];
  TypeUser?: TypeUser; // Nouvelle relation
  Validateur?: User; // Nouvelle relation pour le validateur
  
  // Informations personnelles supplémentaires
  date_naissance?: string;
  sexe?: Sexe;
  telephone?: string;
  biographie?: string;
  adresse?: string;
  
  // Préférences
  langue_preferee: string;
  theme_prefere: ThemePrefere;
  
  // Statistiques
  nombre_oeuvres: number;
  nombre_evenements: number;
  nombre_favoris: number;
  nombre_commentaires: number;
  score_reputation: number;
  
  // Sécurité
  email_verifie: boolean;
  telephone_verifie: boolean;
  double_authentification: boolean;
  
  // Confidentialité
  profil_public: boolean;
  email_public: boolean;
  telephone_public: boolean;
  
  // Professionnel
  entreprise?: string;
  siret?: string;
  specialites?: string[];
  site_web?: string;
  reseaux_sociaux?: ReseauxSociaux;
  certifications?: Certification[];
  documents_fournis?: DocumentFourni[];
  
  // Notifications
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_newsletter: boolean;
  notifications_commentaires: boolean;
  notifications_favoris: boolean;
  notifications_evenements: boolean;
  
  // Timestamps
  date_modification: string;
  
  // Relations (optionnelles)
  Wilaya?: Wilaya;
  Oeuvres?: Oeuvre[];
  Evenements?: Evenement[];
  Organisations?: Organisation[];
  Commentaires?: Commentaire[];
  Favoris?: Favori[];
}

// Type pour la création d'un utilisateur (sans ID ni timestamps)
export type CreateUserDTO = Omit<User, 
  | 'id_user' 
  | 'date_creation' 
  | 'date_modification' 
  | 'nombre_oeuvres' 
  | 'nombre_evenements' 
  | 'nombre_favoris' 
  | 'nombre_commentaires' 
  | 'score_reputation'
  | 'id_user_validate'
  | 'date_validation'
  | 'TypeUser'
  | 'Validateur'
>;

// Type pour la mise à jour d'un utilisateur
export type UpdateUserDTO = Partial<CreateUserDTO>;

// Type pour l'utilisateur public (toPublicJSON)
export interface PublicUser extends Omit<User, 
  | 'password' 
  | 'ip_inscription' 
  | 'email' 
  | 'telephone' 
  | 'adresse' 
  | 'date_naissance'
> {
  email?: string; // Optionnel si email_public est true
  telephone?: string; // Optionnel si telephone_public est true
  adresse?: string; // Optionnel si profil_public est true
  date_naissance?: string; // Optionnel si profil_public est true
}

/**
 * Enum des types d'utilisateurs (pour faciliter l'utilisation)
 */
export enum TypeUserEnum {
  VISITEUR = 1,
  ECRIVAIN = 2,
  JOURNALISTE = 3,
  SCIENTIFIQUE = 4,
  ACTEUR = 5,
  ARTISTE = 6,
  ARTISAN = 7,
  REALISATEUR = 8,
  MUSICIEN = 9,
  PHOTOGRAPHE = 10,
  DANSEUR = 11,
  SCULPTEUR = 12,
  AUTRE = 13
}

/**
 * Helper pour vérifier le type d'utilisateur
 */
export function isVisitor(user: User): boolean {
  return user.id_type_user === TypeUserEnum.VISITEUR;
}

export function isProfessional(user: User): boolean {
  return user.id_type_user !== TypeUserEnum.VISITEUR;
}