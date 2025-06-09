// Oeuvre.types.ts

import { TypeOeuvre, Langue, Categorie, TagMotCle, Editeur, Genre, Materiau, Technique, OeuvreEditeur } from './Classification.types';
import { User } from './User.types';
import { Media } from './Media.types';

export type OeuvreStatut = 'brouillon' | 'en_attente' | 'valide' | 'refuse' | 'archive';

export interface Oeuvre {
  idOeuvre: number;
  titre: string;
  idTypeOeuvre: number;
  idLangue: number;
  anneeCreation?: number;
  description?: string;
  saisiPar?: number;
  idOeuvreOriginale?: number;
  statut: OeuvreStatut;
  dateValidation?: Date;
  validateurId?: number;
  raisonRejet?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  typeOeuvre?: TypeOeuvre;
  langue?: Langue;
  saiseur?: User;
  validateur?: User;
  oeuvreOriginale?: Oeuvre;
  contributeurs?: User[];
  editeurs?: Editeur[];
  categories?: Categorie[];
  tags?: TagMotCle[];
  evenements?: any[]; // From Evenement types
  media?: Media[];
  critiquesEvaluations?: any[]; // From User types
  // Types spécifiques
  livre?: Livre;
  film?: Film;
  albumMusical?: AlbumMusical;
  article?: Article;
  articleScientifique?: ArticleScientifique;
  artisanat?: Artisanat;
  oeuvreArt?: OeuvreArt;
}

export interface Livre {
  idLivre: number;
  idOeuvre: number;
  isbn?: string;
  nbPages?: number;
  idGenre?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
  genre?: Genre;
}

export interface Film {
  idFilm: number;
  idOeuvre: number;
  dureeMinutes?: number;
  realisateur?: string;
  idGenre?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
  genre?: Genre;
}

export interface AlbumMusical {
  idAlbum: number;
  idOeuvre: number;
  duree?: number;
  idGenre: number;
  label: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
  genre?: Genre;
}

export interface Article {
  idArticle: number;
  idOeuvre: number;
  auteur?: string;
  source?: string;
  typeArticle?: 'presse' | 'blog' | 'magazine' | 'web' | 'newsletter' | 'autre';
  categorie?: string;
  sousTitre?: string;
  datePublication?: Date;
  dateDerniereModification?: Date;
  resume?: string;
  contenuComplet?: string;
  urlSource?: string;
  urlArchive?: string;
  statut?: 'brouillon' | 'publie' | 'archive' | 'supprime';
  langueContenu?: string;
  nbMots?: number;
  tempsLecture?: number;
  niveauCredibilite?: 'tres_faible' | 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
  factChecked?: boolean;
  paywall?: boolean;
  nbVues?: number;
  nbPartages?: number;
  noteQualite?: number;
  commentairesModeration?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
}

export interface ArticleScientifique {
  idArticleScientifique: number;
  idOeuvre: number;
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  issn?: string;
  impactFactor?: number;
  peerReviewed?: boolean;
  openAccess?: boolean;
  dateSoumission?: Date;
  dateAcceptation?: Date;
  datePublication?: Date;
  resume?: string;
  citationApa?: string;
  urlHal?: string;
  urlArxiv?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
}

export interface Artisanat {
  idArtisanat: number;
  idOeuvre: number;
  idMateriau?: number;
  idTechnique?: number;
  dimensions?: string;
  poids?: number;
  prix?: number;
  dateCreation?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
  materiau?: Materiau;
  technique?: Technique;
}

export interface OeuvreArt {
  idOeuvreArt: number;
  idOeuvre: number;
  technique?: string;
  dimensions?: string;
  support?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  oeuvre?: Oeuvre;
}

// Tables de liaison
export interface OeuvreUser {
  id: number;
  idOeuvre: number;
  idUser: number;
  roleDansOeuvre: 'auteur' | 'co_auteur' | 'contributeur' | 'traducteur' | 'illustrateur' | 'editeur' | 'coordinateur' | 'autre';
  personnage?: string;
  ordreApparition?: number;
  rolePrincipal?: boolean;
  descriptionRole?: string;
  // Relations
  oeuvre?: Oeuvre;
  user?: User;
}

export interface OeuvreCategorie {
  id: number;
  idOeuvre: number;
  idCategorie: number;
  // Relations
  oeuvre?: Oeuvre;
  categorie?: Categorie;
}

export interface OeuvreTag {
  id: number;
  idOeuvre: number;
  idTag: number;
  // Relations
  oeuvre?: Oeuvre;
  tag?: TagMotCle;
}