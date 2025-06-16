// types/models/references.types.ts

/**
 * Types pour les tables de référence
 */

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

export interface Editeur {
  id_editeur: number;
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  logo_url?: string;
  description?: string;
  actif: boolean;
  date_creation: string;
  date_modification: string;
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

export interface Wilaya {
  id_wilaya: number;
  code_wilaya: string;
  nom_fr: string;
  nom_ar?: string;
  nom_en?: string;
  latitude?: number;
  longitude?: number;
}

export interface Commune {
  id_commune: number;
  id_wilaya: number;
  code_commune: string;
  nom_fr: string;
  nom_ar?: string;
  nom_en?: string;
  code_postal?: string;
  latitude?: number;
  longitude?: number;
  // Relations
  Wilaya?: Wilaya;
}

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