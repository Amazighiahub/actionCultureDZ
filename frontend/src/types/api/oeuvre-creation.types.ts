// types/api/oeuvre-creation.types.ts - VERSION CORRIGÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatutOeuvre } from '../models/oeuvre.types';

/**
 * Type pour un intervenant existant à ajouter à l'œuvre
 */
export interface IntervenantExistant {
  id_intervenant: number;
  id_type_user: number;
  personnage?: string;
  ordre_apparition?: number;
  role_principal?: boolean;
  description_role?: string;
}

/**
 * Type pour créer un nouvel intervenant
 */
export interface NouvelIntervenant {
  // Informations personnelles
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  
  // Informations professionnelles
  titre_professionnel?: string;
  organisation?: string;
  biographie?: string;
  photo_url?: string;
  specialites?: string[];
  site_web?: string;
  reseaux_sociaux?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    [key: string]: string | undefined;
  };
  
  // Informations culturelles
  pays_origine?: string;
  langues_parlees?: string[];
  
  // Rôle dans l'œuvre
  id_type_user: number;
  personnage?: string;
  ordre_apparition?: number;
  role_principal?: boolean;
  description_role?: string;
}

/**
 * Type pour un contributeur (user existant)
 */
export interface ContributeurOeuvre {
  id_user: number;
  id_type_user: number;
  personnage?: string;
  ordre_apparition?: number;
  role_principal?: boolean;
  description_role?: string;
}

/**
 * Type pour un éditeur d'œuvre
 */
export interface EditeurOeuvre {
  id_editeur: number;
  role_editeur?: 'editeur_principal' | 'co_editeur' | 'distributeur' | 'editeur_original' | 'editeur_traduction' | 'editeur_numerique' | 'reedition' | 'autre';
  date_edition?: string;
  isbn_editeur?: string;
  tirage?: number;
  prix_vente?: number;
  langue_edition?: string;
  format?: string;
  statut_edition?: 'en_cours' | 'publie' | 'epuise' | 'annule';
  notes?: string;
}

/**
 * Type pour la recherche d'intervenants - Format retourné par le backend
 */
export interface IntervenantSearchResult {
  // Format retourné par le contrôleur
  id: number;
  label: string;
  value: number;
  titre?: string;
  organisation?: string;
  specialites?: string[];
  photo_url?: string;
}

/**
 * Type pour afficher un intervenant dans l'interface
 */
export interface IntervenantDisplay {
  id_intervenant: number;
  nom: string;
  prenom: string;
  email?: string;
  titre_professionnel?: string;
  organisation?: string;
  specialites?: string[];
  photo_url?: string;
}

/**
 * Détails spécifiques pour un livre
 */
export interface DetailsLivre {
  isbn?: string;
  nb_pages?: number;
  format?: string;
  collection?: string;
}

/**
 * Détails spécifiques pour un film
 */
export interface DetailsFilm {
  duree_minutes?: number;
  realisateur?: string;
  producteur?: string;
  studio?: string;
}

/**
 * Détails spécifiques pour un album musical
 */
export interface DetailsAlbumMusical {
  duree?: string;
  label?: string;
  nb_pistes?: number;
}

/**
 * Détails spécifiques pour un article
 */
export interface DetailsArticle {
  auteur?: string;
  source?: string;
  resume?: string;
  url_source?: string;
}

/**
 * Détails spécifiques pour un article scientifique
 */
export interface DetailsArticleScientifique {
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  peer_reviewed?: boolean;
}

/**
 * Détails spécifiques pour une œuvre d'art
 */
export interface DetailsOeuvreArt {
  technique?: string;
  dimensions?: string;
  support?: string;
}

/**
 * Détails spécifiques pour un artisanat
 */
export interface DetailsArtisanat {
  id_materiau?: number;
  id_technique?: number;
  dimensions?: string;
  poids?: number;
  prix?: number;
}

/**
 * Type pour les détails spécifiques selon le type d'œuvre
 */
export interface DetailsSpecifiques {
  livre?: DetailsLivre;
  film?: DetailsFilm;
  album?: DetailsAlbumMusical;
  article?: DetailsArticle;
  article_scientifique?: DetailsArticleScientifique;
  oeuvre_art?: DetailsOeuvreArt;
  artisanat?: DetailsArtisanat;
}

/**
 * Type pour créer une œuvre complète
 */
export interface CreateOeuvreCompleteDTO {
  // Informations de base
  titre: string;
  id_type_oeuvre: number;
  id_langue: number;
  
  // NOTE: id_genre n'est plus utilisé directement
  // Les œuvres sont classifiées par catégories uniquement
  // Le genre est déduit des catégories via la relation genre_categorie
  id_genre?: number; // DEPRECATED - garder pour compatibilité mais sera ignoré par le backend
  
  annee_creation?: number;
  description?: string;
  prix?: number;
  id_oeuvre_originale?: number;
  
  // Relations
  categories?: number[]; // OBLIGATOIRE pour la classification
  tags?: string[];
  
  // Intervenants
  intervenants_existants?: IntervenantExistant[];
  nouveaux_intervenants?: NouvelIntervenant[];
  contributeurs?: ContributeurOeuvre[];
  
  // Éditeurs (si applicable)
  editeurs?: EditeurOeuvre[];
  
  // Détails spécifiques au type
  details_specifiques?: DetailsSpecifiques;
}

/**
 * Type pour créer une œuvre avec uniquement les catégories
 */
export interface CreateOeuvreDTO {
  // Informations de base
  titre: string;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  description?: string;
  prix?: number;
  id_oeuvre_originale?: number;
  
  // Classification par catégories uniquement
  categories: number[];
  tags?: string[];
  
  // Intervenants
  intervenants_existants?: IntervenantExistant[];
  nouveaux_intervenants?: NouvelIntervenant[];
  
  // Éditeurs
  editeurs?: EditeurOeuvre[];
  
  // Détails spécifiques
  details_specifiques?: DetailsSpecifiques;
}

/**
 * Type pour la réponse de création d'œuvre
 */
export interface CreateOeuvreResponse {
  oeuvre: {
    id_oeuvre: number;
    titre: string;
    Categories?: Array<{ id_categorie: number; nom: string }>;
    Genres?: Array<{ id_genre: number; nom: string }>; // Genres déduits des catégories
    [key: string]: any;
  };
  message?: string;
  intervenants_crees?: any[];
}

/**
 * Type pour vérifier l'existence d'un user par email
 */
export interface CheckUserByEmailResponse {
  success: boolean;
  exists: boolean;
  user?: {
    id_user: number;
    nom: string;
    prenom: string;
    email: string;
  };
}

// Export des enums pour les rôles
export enum RoleEditeur {
  PRINCIPAL = 'editeur_principal',
  CO_EDITEUR = 'co_editeur',
  DISTRIBUTEUR = 'distributeur',
  ORIGINAL = 'editeur_original',
  TRADUCTION = 'editeur_traduction',
  NUMERIQUE = 'editeur_numerique',
  REEDITION = 'reedition',
  AUTRE = 'autre'
}

export enum StatutEdition {
  EN_COURS = 'en_cours',
  PUBLIE = 'publie',
  EPUISE = 'epuise',
  ANNULE = 'annule'
}

/**
 * Fonction pour convertir un résultat de recherche en format d'affichage
 */
export function convertSearchResultToDisplay(result: IntervenantSearchResult): IntervenantDisplay {
  // Parser le label pour extraire nom et prénom
  const labelParts = result.label.split(' ');
  const prenom = labelParts[0] || '';
  const nom = labelParts.slice(1).join(' ') || '';
  
  return {
    id_intervenant: result.id,
    nom,
    prenom,
    titre_professionnel: result.titre,
    organisation: result.organisation,
    specialites: result.specialites,
    photo_url: result.photo_url
  };
}

/**
 * Type helper pour la validation de hiérarchie
 */
export interface HierarchyValidationRequest {
  id_type_oeuvre: number;
  categories: number[];
}

/**
 * Type pour la requête de genres depuis les catégories
 */
export interface GenresFromCategoriesRequest {
  categories: number[];
}

/**
 * Type pour la réponse de genres depuis les catégories
 */
export interface GenresFromCategoriesResponse {
  genres: Array<{
    id_genre: number;
    nom: string;
    categories_count: number; // Nombre de catégories sélectionnées appartenant à ce genre
  }>;
}