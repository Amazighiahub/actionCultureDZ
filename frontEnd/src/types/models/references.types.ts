// types/models/references.types.ts

import { Oeuvre } from "./oeuvre.types";

/**
 * Types pour les tables de référence
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Role {
  id_role: number;
  nom_role: string;
  description?: string;
  permissions?: string[];
  actif: boolean;
  date_creation: string;
  date_modification: string;
}

export interface TypeOeuvre {
  id_type_oeuvre: number;
  nom_type: string;
  description?: string;
  // Relations
  GenresDisponibles?: Genre[]; // Via TypeOeuvreGenre
}

export interface Genre {
  id_genre: number;
  nom: string;
  description?: string;
  slug?: string;
  icone?: string;
  ordre_affichage?: number;
  actif?: boolean;
  date_creation?: string;
  date_modification?: string;
  // Relations
  TypesAssocies?: TypeOeuvre[]; // Via TypeOeuvreGenre
  CategoriesDisponibles?: Categorie[]; // Via GenreCategorie
}

export interface Categorie {
  id_categorie: number;
  nom: string;
  description?: string;
  slug?: string;
  id_categorie_parent?: number;
  niveau?: number;
  chemin_complet?: string;
  ordre_affichage?: number;
  actif?: boolean;
  meta_keywords?: string;
  date_creation?: string;
  date_modification?: string;
  // Relations
  CategorieParent?: Categorie;
  SousCategories?: Categorie[];
  GenresAssocies?: Genre[]; // Via GenreCategorie
}

export interface TagMotCle {
  id_tag: number;
  nom: string;
}

export interface Langue {
  id_langue: number;
  nom: string;
  code?: string;
}

// Types pour l'entité Editeur

export enum TypeEditeur {
  MAISON_EDITION = 'maison_edition',
  LABEL_MUSIQUE = 'label_musique',
  STUDIO_CINEMA = 'studio_cinema',
  GALERIE_ART = 'galerie_art',
  EDITEUR_SCIENTIFIQUE = 'editeur_scientifique',
  PRESSE = 'presse',
  EDITEUR_NUMERIQUE = 'editeur_numerique',
  AUTRE = 'autre'
}

export interface Editeur {
  id_editeur: number;
  nom: string;
  type_editeur: TypeEditeur;
  pays?: string | null;
  ville?: string | null;
  adresse?: string | null;
  site_web?: string | null;
  email?: string | null;
  
  telephone?: string | null;
  description?: string | null;
  annee_creation?: number | null;
  actif: boolean;
  date_creation: Date | string;
  date_modification: Date | string;
  
  // Relations optionnelles
  Oeuvres?: Oeuvre[];
}

// Type pour la création d'un éditeur (sans id et timestamps)
export interface CreateEditeurDto {
  nom: string;
  type_editeur: TypeEditeur;
  pays?: string;
  ville?: string;
  adresse?: string;
  site_web?: string;
  email?: string;
  telephone?: string;
  description?: string;
  annee_creation?: number;
  actif?: boolean;
}

// Type pour la mise à jour d'un éditeur (tous les champs optionnels)
export interface UpdateEditeurDto {
  nom?: string;
  type_editeur?: TypeEditeur;
  pays?: string;
  ville?: string;
  adresse?: string;
  site_web?: string;
  email?: string;
  telephone?: string;
  description?: string;
  annee_creation?: number;
  actif?: boolean;
}

export interface Specialite {
  id_specialite: number;
  nom: string;
  description?: string;
  domaine?: string;
  actif: boolean;
}

export interface Materiau {
  id_materiau: number;
  nom: string;
  description?: string;
}

export interface Technique {
  id_technique: number;
  nom: string;
  description?: string;
}



export interface TypeEvenement {
  id_type_evenement: number;
  nom_type: string;
  description?: string;
  // Relations
  Evenements?: any[]; // Remplacer 'any' par le type Evenement quand disponible
}

export interface TypeOrganisation {
  id_type_organisation: number;
  nom: string;
  // Relations
  Organisations?: any[]; // Remplacer 'any' par le type Organisation quand disponible
}

// Types pour les créations/mises à jour
export type CreateTypeEvenementDTO = Omit<TypeEvenement, 'id_type_evenement' | 'Evenements'>;
export type UpdateTypeEvenementDTO = Partial<CreateTypeEvenementDTO>;

export type CreateTypeOrganisationDTO = Omit<TypeOrganisation, 'id_type_organisation' | 'Organisations'>;
export type UpdateTypeOrganisationDTO = Partial<CreateTypeOrganisationDTO>;
// Types pour les créations/mises à jour
export type CreateRoleDTO = Omit<Role, 'id_role' | 'date_creation' | 'date_modification'>;
export type UpdateRoleDTO = Partial<CreateRoleDTO>;

export type CreateTypeOeuvreDTO = Omit<TypeOeuvre, 'id_type_oeuvre' | 'GenresDisponibles'>;
export type UpdateTypeOeuvreDTO = Partial<CreateTypeOeuvreDTO>;

export type CreateGenreDTO = Omit<Genre, 'id_genre' | 'date_creation' | 'date_modification' | 'TypesAssocies' | 'CategoriesDisponibles'>;
export type UpdateGenreDTO = Partial<CreateGenreDTO>;

export type CreateCategorieDTO = Omit<Categorie, 'id_categorie' | 'date_creation' | 'date_modification' | 'CategorieParent' | 'SousCategories' | 'GenresAssocies'>;
export type UpdateCategorieDTO = Partial<CreateCategorieDTO>;

export type CreateEditeurDTO = Omit<Editeur, 'id_editeur' | 'date_creation' | 'date_modification'>;
export type UpdateEditeurDTO = Partial<CreateEditeurDTO>;

// Helpers
export function getCategorieFullPath(categorie: Categorie, allCategories: Categorie[]): string {
  const path: string[] = [categorie.nom];
  let current = categorie;
  
  while (current.id_categorie_parent) {
    const parent = allCategories.find(c => c.id_categorie === current.id_categorie_parent);
    if (!parent) break;
    path.unshift(parent.nom);
    current = parent;
  }
  
  return path.join(' > ');
}