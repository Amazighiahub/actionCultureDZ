// types/models/oeuvre.types.ts

import { User } from './user.types';
import { TypeOeuvre, Langue, Editeur, Categorie, TagMotCle } from './references.types';
import { Media } from './media.types';
import { CritiqueEvaluation } from './tracking.types';
import { Evenement } from './evenement.types';
import { OeuvreIntervenant, OeuvreUser, OeuvreEditeur, OeuvreCategorie, OeuvreTag, EvenementOeuvre } from './associations.types';
import { Livre, Film, AlbumMusical, Article, ArticleScientifique, Artisanat, OeuvreArt } from './oeuvres-specialisees.types';


// Enum pour le statut de l'œuvre
export type StatutOeuvre = 'brouillon' | 'en_attente' | 'publie' | 'rejete' | 'archive' | 'supprime';

export interface Oeuvre {
  id_oeuvre: number;
  titre: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  description?: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  prix?: number;
  saisi_par?: number;
  id_oeuvre_originale?: number;
  statut: StatutOeuvre;
  date_validation?: string;
  validateur_id?: number;
  raison_rejet?: string;
  
  // Timestamps
  date_creation: string;
  date_modification: string;
  
  // Relations directes (belongsTo)
  TypeOeuvre?: TypeOeuvre;
  Langue?: Langue;
  Saiseur?: User;
  Validateur?: User;
  OeuvreOriginale?: Oeuvre;
  
  // Relations many-to-many (belongsToMany)
  OeuvreIntervenants?: OeuvreIntervenant[];
  Users?: User[]; // via OeuvreUser
  Editeurs?: Editeur[]; // via OeuvreEditeur
  Categories?: Categorie[]; // via OeuvreCategorie
  Tags?: TagMotCle[]; // via OeuvreTag
  Evenements?: Evenement[]; // via EvenementOeuvre
  
  // Relations one-to-one (hasOne) - Relations spécialisées
  Livre?: Livre;
  Film?: Film;
  AlbumMusical?: AlbumMusical;
  Article?: Article;
  ArticleScientifique?: ArticleScientifique;
  Artisanat?: Artisanat;
  OeuvreArt?: OeuvreArt;
  
  // Relations one-to-many (hasMany)
  Media?: Media[];
  CritiquesEvaluations?: CritiqueEvaluation[];
}

// Type pour la création d'une œuvre
export type CreateOeuvreDTO = {
  titre: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  description?: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  prix?: number;
  saisi_par?: number;
  id_oeuvre_originale?: number;
  statut?: StatutOeuvre; // Optionnel car a une valeur par défaut
};

// Type pour la mise à jour d'une œuvre
export type UpdateOeuvreDTO = Partial<CreateOeuvreDTO> & {
  date_validation?: string;
  validateur_id?: number;
  raison_rejet?: string;
};

// Type pour la validation d'une œuvre
export interface ValidationOeuvreDTO {
  statut: 'publie' | 'rejete';
  validateur_id: number;
  raison_rejet?: string; // Obligatoire si statut = 'rejete'
}

// Helpers
export function isOeuvrePubliee(oeuvre: Oeuvre): boolean {
  return oeuvre.statut === 'publie';
}

export function isOeuvreEditable(oeuvre: Oeuvre): boolean {
  return ['brouillon', 'rejete'].includes(oeuvre.statut);
}

export function getOeuvreTypeSpecialise(oeuvre: Oeuvre): string | null {
  if (oeuvre.Livre) return 'Livre';
  if (oeuvre.Film) return 'Film';
  if (oeuvre.AlbumMusical) return 'AlbumMusical';
  if (oeuvre.Article) return 'Article';
  if (oeuvre.ArticleScientifique) return 'ArticleScientifique';
  if (oeuvre.Artisanat) return 'Artisanat';
  if (oeuvre.OeuvreArt) return 'OeuvreArt';
  return null;
}