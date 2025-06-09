// Evenement.types.ts

import { User, Organisation } from './User.types';
import { Lieu } from './Geographie.types';
import { Oeuvre } from './Oeuvre.types';
import { Media } from './Media.types';

export type EvenementStatut = 'planifie' | 'en_cours' | 'termine' | 'annule' | 'reporte';
export type ProgrammeStatut = 'planifie' | 'en_cours' | 'termine' | 'annule';
export type TypeActivite = 'conference' | 'atelier' | 'performance' | 'projection' | 'exposition' | 'concert' | 'autre';
export type NiveauRequis = 'debutant' | 'intermediaire' | 'avance' | 'expert' | 'tous_niveaux';
export type ParticipationStatut = 'inscrit' | 'confirme' | 'present' | 'absent' | 'annule';

export interface TypeEvenement {
  idTypeEvenement: number;
  nomType: string;
  description?: string;
  // Relations
  evenements?: Evenement[];
}

export interface Evenement {
  idEvenement: number;
  nomEvenement: string;
  description?: string;
  dateDebut?: Date;
  dateFin?: Date;
  contactEmail?: string;
  contactTelephone?: string;
  imageUrl?: string;
  idLieu: number;
  idUser: number;
  idTypeEvenement: number;
  statut?: EvenementStatut;
  capaciteMax?: number;
  tarif?: number;
  inscriptionRequise?: boolean;
  ageMinimum?: number;
  accessibilite?: string;
  certificatDelivre?: boolean;
  dateLimiteInscription?: Date;
  // Champs virtuels
  nombreParticipants?: number;
  nombreInscrits?: number;
  estComplet?: boolean;
  dureeTotale?: number;
  noteMoyenne?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  typeEvenement?: TypeEvenement;
  lieu?: Lieu;
  organisateur?: User;
  participants?: User[];
  oeuvres?: Oeuvre[];
  organisations?: Organisation[];
  programmes?: Programme[];
  media?: Media[];
  evenementUsers?: EvenementUser[];
  evenementOeuvres?: EvenementOeuvre[];
  evenementOrganisations?: EvenementOrganisation[];
}

export interface Programme {
  idProgramme: number;
  titre: string;
  description?: string;
  idEvenement: number;
  idLieu?: number;
  heureDebut?: string;
  heureFin?: string;
  lieuSpecifique?: string;
  ordre?: number;
  statut?: ProgrammeStatut;
  typeActivite?: TypeActivite;
  dureeEstimee?: number;
  nbParticipantsMax?: number;
  materielRequis?: any;
  niveauRequis?: NiveauRequis;
  languePrincipale?: string;
  traductionDisponible?: boolean;
  enregistrementAutorise?: boolean;
  diffusionLive?: boolean;
  supportNumerique?: boolean;
  notesOrganisateur?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  evenement?: Evenement;
  lieu?: Lieu;
  intervenants?: Intervenant[];
  programmeIntervenants?: ProgrammeIntervenant[];
}

export interface Intervenant {
  idIntervenant: number;
  nom: string;
  prenom: string;
  titreProfessionnel?: string;
  organisation?: string;
  email?: string;
  telephone?: string;
  biographie?: string;
  photoUrl?: string;
  specialites?: any;
  siteWeb?: string;
  reseauxSociaux?: any;
  paysOrigine?: string;
  languesParlees?: any;
  idUser?: number;
  actif?: boolean;
  verifie?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  user?: User;
  programmes?: Programme[];
}

export interface Parcours {
  idParcours: number;
  nomParcours: string;
  description?: string;
  dureeEstimee?: number;
  difficulte?: 'facile' | 'moyen' | 'difficile';
  theme?: string;
  distanceKm?: number;
  pointDepart?: string;
  pointArrivee?: string;
  statut?: 'actif' | 'inactif' | 'maintenance';
  idCreateur: number;
  dateCreation?: Date;
  dateModification?: Date;
  // Relations
  createur?: User;
  lieux?: Lieu[];
  parcoursLieux?: ParcoursLieu[];
}

// Tables de liaison
export interface EvenementUser {
  idEventUser: number;
  idEvenement: number;
  idUser: number;
  dateInscription?: Date;
  statutParticipation?: ParticipationStatut;
  notes?: string;
  dateValidation?: Date;
  validePar?: number;
  evaluationEvenement?: number;
  commentaireEvaluation?: string;
  recommande?: boolean;
  presenceConfirmee?: boolean;
  certificatGenere?: boolean;
  dateCertificat?: Date;
  // Relations
  evenement?: Evenement;
  user?: User;
  validateur?: User;
}

export interface EvenementOeuvre {
  idEventOeuvre: number;
  idEvenement: number;
  idOeuvre: number;
  idPresentateur?: number;
  ordrePresentation?: number;
  dureePresentation?: number;
  descriptionPresentation?: string;
  // Relations
  evenement?: Evenement;
  oeuvre?: Oeuvre;
  presentateur?: User;
}

export interface EvenementOrganisation {
  id: number;
  idEvenement: number;
  idOrganisation: number;
  role?: 'organisateur' | 'sponsor' | 'partenaire' | 'participant' | 'support';
  contribution?: string;
  logoAffichage?: boolean;
  mentionCommunication?: boolean;
  invitationVip?: number;
  // Relations
  evenement?: Evenement;
  organisation?: Organisation;
}

export interface ProgrammeIntervenant {
  id: number;
  idProgramme: number;
  idIntervenant: number;
  roleIntervenant?: 'conferencier' | 'moderateur' | 'paneliste' | 'formateur' | 'artiste' | 'autre';
  ordreIntervention?: number;
  dureeIntervention?: number;
  sujetIntervention?: string;
  biographieCourte?: string;
  honoraires?: number;
  fraisDeplacement?: number;
  logementRequis?: boolean;
  materielTechnique?: any;
  statutConfirmation?: 'en_attente' | 'confirme' | 'decline' | 'annule';
  dateConfirmation?: Date;
  notesOrganisateur?: string;
  // Relations
  programme?: Programme;
  intervenant?: Intervenant;
}

export interface ParcoursLieu {
  idParcoursLieu: number;
  idParcours: number;
  idLieu: number;
  idEvenement?: number;
  ordre: number;
  dureeEstimee?: number;
  distancePrecedent?: number;
  tempsTrajet?: number;
  notes?: string;
  transportMode?: 'marche' | 'velo' | 'voiture' | 'transport_public';
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  parcours?: Parcours;
  lieu?: Lieu;
  evenement?: Evenement;
}