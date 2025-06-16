// types/models/oeuvre.types.ts

import { StatutOeuvre } from '../enums/oeuvre.enums';
import { User } from './user.types';
import { TypeOeuvre, Langue, Editeur, Categorie, TagMotCle } from './references.types';
import { Media } from './media.types';
import { CritiqueEvaluation, Commentaire } from './tracking.types';
import { Evenement } from './evenement.types';
import { Livre, Film, AlbumMusical, Article, ArticleScientifique, Artisanat, OeuvreArt } from './oeuvres-specialisees.types';

export interface Oeuvre {
  id_oeuvre: number;
  titre: string;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  description?: string;
  saisi_par?: number;
  id_oeuvre_originale?: number;
  statut: StatutOeuvre;
  date_validation?: string;
  validateur_id?: number;
  raison_rejet?: string;
  prix?: number; // Ajout du prix
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  TypeOeuvre?: TypeOeuvre;
  Langue?: Langue;
  Saiseur?: User;
  Validateur?: User;
  OeuvreOriginale?: Oeuvre;
  Media?: Media[];
  CritiquesEvaluations?: CritiqueEvaluation[];
  Commentaires?: Commentaire[];
  Users?: User[];
  Editeurs?: Editeur[];
  Categories?: Categorie[];
  Tags?: TagMotCle[];
  Evenements?: Evenement[];
  
  // Relations spécialisées (une seule selon le type)
  Livre?: Livre;
  Film?: Film;
  AlbumMusical?: AlbumMusical;
  Article?: Article;
  ArticleScientifique?: ArticleScientifique;
  Artisanat?: Artisanat;
  OeuvreArt?: OeuvreArt;
}

// Type pour la création d'une œuvre
export type CreateOeuvreDTO = Omit<Oeuvre, 
  | 'id_oeuvre' 
  | 'date_creation' 
  | 'date_modification'
  | 'date_validation'
  | 'validateur_id'
  | 'raison_rejet'
>;

// Type pour la mise à jour d'une œuvre
export type UpdateOeuvreDTO = Partial<CreateOeuvreDTO>;