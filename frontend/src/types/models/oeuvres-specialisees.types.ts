// types/models/oeuvres-specialisees.types.ts

import { TypeArticle, StatutArticle, NiveauCredibilite } from '../enums/common.enums';
import { Oeuvre } from './oeuvre.types';
import { Genre } from './references.types';
import { Materiau, Technique } from './references.types';

export interface Livre {
  id_livre: number;
  id_oeuvre: number;
  isbn?: string;
  nb_pages?: number;
  id_genre?: number;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Genre?: Genre;
}

export interface Film {
  id_film: number;
  id_oeuvre: number;
  duree_minutes?: number;
  realisateur?: string;
  id_genre?: number;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Genre?: Genre;
}

export interface AlbumMusical {
  id_album: number;
  id_oeuvre: number;
  duree?: number;
  id_genre: number;
  label: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Genre?: Genre;
}

export interface Article {
  id_article: number;
  id_oeuvre: number;
  id_genre?: number; // NOUVEAU : ajout du genre
  auteur?: string;
  source?: string;
  type_article: TypeArticle;
  // categorie?: string; // SUPPRIMÉ : remplacé par le système relationnel
  sous_titre?: string;
  date_publication?: string;
  date_derniere_modification?: string;
  resume?: string;
  contenu_complet?: string;
  url_source?: string;
  url_archive?: string;
  statut: StatutArticle;
  langue_contenu?: string;
  nb_mots?: number;
  temps_lecture?: number;
  niveau_credibilite: NiveauCredibilite;
  fact_checked: boolean;
  paywall: boolean;
  nb_vues: number;
  nb_partages: number;
  note_qualite?: number;
  commentaires_moderation?: string;
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Genre?: Genre; // NOUVEAU : relation avec Genre
}

export interface ArticleScientifique {
  id_article_scientifique: number;
  id_oeuvre: number;
  id_genre?: number; // NOUVEAU : ajout du genre
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  issn?: string;
  impact_factor?: number;
  peer_reviewed: boolean;
  open_access: boolean;
  date_soumission?: string;
  date_acceptation?: string;
  date_publication?: string;
  resume?: string;
  citation_apa?: string;
  url_hal?: string;
  url_arxiv?: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Genre?: Genre; // NOUVEAU : relation avec Genre
}

export interface Artisanat {
  id_artisanat: number;
  id_oeuvre: number;
  id_materiau?: number;
  id_technique?: number;
  dimensions?: string;
  poids?: number;
  prix?: number;
  date_creation?: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  Materiau?: Materiau;
  Technique?: Technique;
}

export interface OeuvreArt {
  id_oeuvre_art: number;
  id_oeuvre: number;
  technique?: string;
  dimensions?: string;
  support?: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
}