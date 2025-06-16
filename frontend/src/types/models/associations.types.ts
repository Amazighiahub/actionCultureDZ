// types/models/associations.types.ts

import { 
  RoleParticipation, 
  StatutParticipation, 
  RoleOrganisation, 
  RoleDansOeuvre, 
  RoleUserOrganisation 
} from '../enums/liaison.enums';
import { User, TypeUser } from './user.types';
import { Oeuvre } from './oeuvre.types';
import { Evenement } from './evenement.types';
import { Organisation } from './organisation.types';
import { Programme } from './programme.types';
import { Intervenant } from './intervenant.types';
import { Role, Specialite, Categorie, TagMotCle, Editeur, Genre, TypeOeuvre } from './references.types';
import { Lieu } from './lieu.types';
import { Parcours } from './lieux-details.types';
import { MaterielRequis } from './specific-types';

// =====================================================
// NOUVELLES ASSOCIATIONS POUR LA HIÉRARCHIE
// =====================================================

/**
 * Association TypeOeuvre ↔ Genre
 * Définit quels genres sont disponibles pour chaque type d'œuvre
 */
export interface TypeOeuvreGenre {
  id_type_oeuvre: number;
  id_genre: number;
  ordre_affichage: number;
  actif: boolean;
  TypeOeuvre?: TypeOeuvre;
  Genre?: Genre;
}

/**
 * Association Genre ↔ Categorie
 * Définit quelles catégories sont disponibles pour chaque genre
 */
export interface GenreCategorie {
  id_genre: number;
  id_categorie: number;
  ordre_affichage: number;
  actif: boolean;
  Genre?: Genre;
  Categorie?: Categorie;
}

// =====================================================
// ASSOCIATIONS USER
// =====================================================

/**
 * Association User ↔ TypeUser
 * Un user appartient à un type (intégré dans User via id_type_user)
 */
// Pas besoin de table de liaison, c'est une relation directe

/**
 * Association User ↔ User (Validation)
 * Un user peut valider d'autres users
 */
// Pas besoin de table de liaison, utilise id_user_validate dans User

export interface UserRole {
  id: number;
  id_user: number;
  id_role: number;
  createdAt: string;
  updatedAt: string;
  User?: User;
  Role?: Role;
}

export interface UserOrganisation {
  id: number;
  id_user: number;
  id_organisation: number;
  role: RoleUserOrganisation;
  actif: boolean;
  departement?: string;
  id_superviseur?: number;
  date_creation: string;
  date_modification: string;
  User?: User;
  Organisation?: Organisation;
  Superviseur?: User;
}

export interface UserSpecialite {
  id_user: number;
  id_specialite: number;
  niveau: 'debutant' | 'intermediaire' | 'expert';
  annees_experience?: number;
  date_ajout: string;
}

export interface UserCertification {
  id_certification: number;
  id_user: number;
  nom_certification: string;
  organisme?: string;
  numero_certification?: string;
  date_obtention?: string;
  date_expiration?: string;
  url_verification?: string;
  fichier_certificat?: string;
  verifie: boolean;
  date_verification?: string;
  id_user_verificateur?: number; // NOUVEAU : qui a vérifié
  date_creation: string;
  date_modification: string;
  Verificateur?: User; // NOUVEAU : relation
}

// =====================================================
// ASSOCIATIONS OEUVRE
// =====================================================

export interface OeuvreUser {
  id: number;
  id_oeuvre: number;
  id_user: number;
  role_dans_oeuvre: RoleDansOeuvre;
  personnage?: string;
  ordre_apparition?: number;
  role_principal: boolean;
  description_role?: string;
  Oeuvre?: Oeuvre;
  User?: User;
}

export interface OeuvreEditeur {
  id: number;
  id_oeuvre: number;
  id_editeur: number;
  role_editeur: 'editeur_principal' | 'co_editeur' | 'distributeur' | 'editeur_original' | 'editeur_traduction';
  date_edition?: string;
  isbn_editeur?: string;
  tirage?: number;
  prix_vente?: number;
  langue_edition?: string;
  format?: string;
  statut_edition: 'en_cours' | 'publie' | 'epuise' | 'annule';
  notes?: string;
  date_creation: string;
  date_modification: string;
  Oeuvre?: Oeuvre;
  Editeur?: Editeur;
}

export interface OeuvreCategorie {
  id: number;
  id_oeuvre: number;
  id_categorie: number;
  createdAt: string;
  updatedAt: string;
  Oeuvre?: Oeuvre;
  Categorie?: Categorie;
}

export interface OeuvreTag {
  id: number;
  id_oeuvre: number;
  id_tag: number;
  createdAt: string;
  updatedAt: string;
  Oeuvre?: Oeuvre;
  TagMotCle?: TagMotCle;
}

// =====================================================
// ASSOCIATIONS EVENEMENT
// =====================================================

export interface EvenementUser {
  id_EventUser: number;
  id_evenement: number;
  id_user: number;
  role_participation: RoleParticipation;
  date_inscription: string;
  statut_participation: StatutParticipation;
  notes?: string;
  date_validation?: string;
  valide_par?: number;
  evaluation_evenement?: number;
  commentaire_evaluation?: string;
  recommande?: boolean;
  presence_confirmee: boolean;
  certificat_genere: boolean;
  date_certificat?: string;
  date_creation: string;
  date_modification: string;
  Evenement?: Evenement;
  User?: User;
  Validateur?: User;
}

export interface EvenementOeuvre {
  id_EventOeuvre: number;
  id_evenement: number;
  id_oeuvre: number;
  id_presentateur?: number;
  ordre_presentation: number;
  duree_presentation?: number;
  description_presentation?: string;
  Evenement?: Evenement;
  Oeuvre?: Oeuvre;
  Presentateur?: User;
}

export interface EvenementOrganisation {
  id: number;
  id_evenement: number;
  id_organisation: number;
  role: RoleOrganisation;
  contribution?: string;
  logo_affichage: boolean;
  mention_communication: boolean;
  invitation_vip: number;
  date_creation: string;
  date_modification: string;
  Evenement?: Evenement;
  Organisation?: Organisation;
}

// =====================================================
// ASSOCIATIONS PROGRAMME
// =====================================================

export interface ProgrammeIntervenant {
  id: number;
  id_programme: number;
  id_intervenant: number;
  role_intervenant: 'principal' | 'co_intervenant' | 'moderateur' | 'invite' | 'animateur';
  ordre_intervention: number;
  duree_intervention?: number;
  sujet_intervention?: string;
  biographie_courte?: string;
  honoraires?: number;
  frais_deplacement?: number;
  logement_requis: boolean;
  materiel_technique: MaterielRequis[];
  statut_confirmation: 'en_attente' | 'confirme' | 'decline' | 'annule';
  date_confirmation?: string;
  notes_organisateur?: string;
  date_creation: string;
  date_modification: string;
  Programme?: Programme;
  Intervenant?: Intervenant;
}

// =====================================================
// ASSOCIATIONS PARCOURS
// =====================================================

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
  Parcours?: Parcours;
  Lieu?: Lieu;
  Evenement?: Evenement;
}

// =====================================================
// TYPES D'AIDE POUR LES ASSOCIATIONS
// =====================================================

/**
 * Type pour créer une association TypeOeuvre-Genre
 */
export type CreateTypeOeuvreGenreDTO = Omit<TypeOeuvreGenre, 'TypeOeuvre' | 'Genre'>;

/**
 * Type pour créer une association Genre-Categorie
 */
export type CreateGenreCategorieDTO = Omit<GenreCategorie, 'Genre' | 'Categorie'>;

/**
 * Helper pour vérifier si un genre est disponible pour un type d'œuvre
 */
export function isGenreAvailableForType(
  typeOeuvreGenres: TypeOeuvreGenre[], 
  idTypeOeuvre: number, 
  idGenre: number
): boolean {
  return typeOeuvreGenres.some(
    tog => tog.id_type_oeuvre === idTypeOeuvre && 
           tog.id_genre === idGenre && 
           tog.actif
  );
}

/**
 * Helper pour vérifier si une catégorie est disponible pour un genre
 */
export function isCategoryAvailableForGenre(
  genreCategories: GenreCategorie[], 
  idGenre: number, 
  idCategorie: number
): boolean {
  return genreCategories.some(
    gc => gc.id_genre === idGenre && 
          gc.id_categorie === idCategorie && 
          gc.actif
  );
}