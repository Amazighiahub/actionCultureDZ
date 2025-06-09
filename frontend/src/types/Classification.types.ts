// Classification.types.ts

export interface Langue {
  idLangue: number;
  nom: string;
  code?: string;
  // Relations
  oeuvres?: any[]; // From Oeuvre types
}

export interface Categorie {
  idCategorie: number;
  nom: string;
  // Relations
  oeuvres?: any[]; // From Oeuvre types
}

export interface Genre {
  idGenre: number;
  nom: string;
  // Relations
  livres?: any[]; // From Oeuvre types
  films?: any[]; // From Oeuvre types
  albumsMusicaux?: any[]; // From Oeuvre types
}

export interface TypeOeuvre {
  idTypeOeuvre: number;
  nomType: string;
  description?: string;
  // Relations
  oeuvres?: any[]; // From Oeuvre types
}

export interface TagMotCle {
  idTag: number;
  nom: string;
  // Relations
  oeuvres?: any[]; // From Oeuvre types
}

export interface Materiau {
  idMateriau: number;
  nom: string;
  description?: string;
  // Relations
  artisanats?: any[]; // From Oeuvre types
}

export interface Technique {
  idTechnique: number;
  nom: string;
  description?: string;
  // Relations
  artisanats?: any[]; // From Oeuvre types
}

export interface Editeur {
  idEditeur: number;
  nom: string;
  typeEditeur: 'maison_edition' | 'auto_edition' | 'editeur_independant' | 'editeur_universitaire' | 'editeur_public';
  pays?: string;
  ville?: string;
  adresse?: string;
  siteWeb?: string;
  email?: string;
  telephone?: string;
  description?: string;
  anneeCreation?: number;
  actif?: boolean;
  // Relations
  oeuvres?: any[]; // From Oeuvre types
}

// Table de liaison
export interface OeuvreEditeur {
  id: number;
  idOeuvre: number;
  idEditeur: number;
  roleEditeur?: 'editeur_principal' | 'co_editeur' | 'distributeur' | 'importateur';
  dateEdition?: Date;
  isbnEditeur?: string;
  tirage?: number;
  prixVente?: number;
  langueEdition?: string;
  format?: string;
  statutEdition?: 'en_preparation' | 'disponible' | 'epuise' | 'arrete';
  notes?: string;
  // Relations
  oeuvre?: any; // From Oeuvre types
  editeur?: Editeur;
}