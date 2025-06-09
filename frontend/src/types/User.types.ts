// User.types.ts

export type TypeUser = 'visiteur' | 'ecrivain' | 'journaliste' | 'scientifique' | 'artiste' | 'artisan' | 'photographe' | 'realisateur' | 'musicien' | 'autre';
export type UserStatus = 'actif' | 'inactif' | 'suspendu' | 'banni';
export type ValidationStatus = 'en_attente' | 'accepte' | 'refuse';
export type Theme = 'clair' | 'sombre' | 'auto';

export interface User {
  idUser: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  // Informations personnelles
  typeUser?: TypeUser;
  dateNaissance?: Date;
  sexe?: 'M' | 'F';
  telephone?: string;
  photoUrl?: string;
  biographie?: string;
  // Localisation
  wilayaResidence?: number;
  adresse?: string;
  // Statuts
  statut?: UserStatus;
  professionnelValide?: boolean;
  statutValidation?: ValidationStatus;
  dateValidation?: Date;
  // Préférences
  accepteNewsletter?: boolean;
  accepteConditions?: boolean;
  languePreferee?: string;
  themePrefere?: Theme;
  // Métadonnées
  derniereConnexion?: Date;
  ipInscription?: string;
  // Statistiques
  nombreOeuvres?: number;
  nombreEvenements?: number;
  nombreFavoris?: number;
  nombreCommentaires?: number;
  scoreReputation?: number;
  // Sécurité
  emailVerifie?: boolean;
  telephoneVerifie?: boolean;
  doubleAuthentification?: boolean;
  // Confidentialité
  profilPublic?: boolean;
  emailPublic?: boolean;
  telephonePublic?: boolean;
  // Professionnel
  entreprise?: string;
  siret?: string;
  specialites?: any;
  siteWeb?: string;
  reseauxSociaux?: any;
  // Certifications
  certifications?: any;
  documentsFournis?: any;
  raisonRejet?: string;
  // Notifications
  notificationsEmail?: boolean;
  notificationsPush?: boolean;
  notificationsNewsletter?: boolean;
  notificationsCommentaires?: boolean;
  notificationsFavoris?: boolean;
  notificationsEvenements?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  wilaya?: any; // From Geographie types
  roles?: Role[];
  organisations?: Organisation[];
  oeuvresSaisies?: any[]; // From Oeuvre types
  oeuvresValidees?: any[]; // From Oeuvre types
  evenementsOrganises?: any[]; // From Evenement types
  evenementsParticipant?: any[]; // From Evenement types
  commentaires?: Commentaire[];
  critiquesEvaluations?: CritiqueEvaluation[];
  favoris?: Favori[];
  notifications?: Notification[];
  specialitesUser?: UserSpecialite[];
  certificationsList?: UserCertification[];
  signalements?: Signalement[];
  vues?: Vue[];
  auditLogs?: AuditLog[];
}

export interface Role {
  idRole: number;
  nomRole: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  users?: User[];
}

export interface UserRole {
  id: number;
  idUser: number;
  idRole: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  user?: User;
  role?: Role;
}

export interface Organisation {
  idOrganisation: number;
  nom: string;
  idTypeOrganisation?: number;
  description?: string;
  siteWeb?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  typeOrganisation?: TypeOrganisation;
  users?: User[];
  evenements?: any[]; // From Evenement types
}

export interface TypeOrganisation {
  idTypeOrganisation: number;
  nom: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  organisations?: Organisation[];
}

export interface UserOrganisation {
  id: number;
  idUser: number;
  idOrganisation: number;
  role?: 'membre' | 'responsable' | 'coordinateur' | 'secretaire' | 'tresorier' | 'president';
  actif?: boolean;
  departement?: string;
  idSuperviseur?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  user?: User;
  organisation?: Organisation;
  superviseur?: User;
}

export interface UserSpecialite {
  idUser: number;
  idSpecialite: number;
  niveau?: 'debutant' | 'intermediaire' | 'expert';
  anneesExperience?: number;
  dateAjout?: Date;
  // Relations
  user?: User;
  specialite?: Specialite;
}

export interface Specialite {
  idSpecialite: number;
  nomSpecialite: string;
  description?: string;
  categorie?: string;
  actif?: boolean;
  // Relations
  users?: UserSpecialite[];
}

export interface UserCertification {
  idCertification: number;
  idUser: number;
  nomCertification: string;
  organisme?: string;
  numeroCertification?: string;
  dateObtention?: Date;
  dateExpiration?: Date;
  urlVerification?: string;
  fichierCertificat?: string;
  verifie?: boolean;
  dateVerification?: Date;
  dateCreation?: Date;
  dateModification?: Date;
  // Relations
  user?: User;
}

// Divers types
export interface Commentaire {
  idCommentaire: number;
  contenu: string;
  idUser: number;
  idOeuvre?: number;
  idEvenement?: number;
  commentaireParentId?: number;
  statut?: 'en_attente' | 'approuve' | 'rejete' | 'modere';
  noteQualite?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Relations
  user?: User;
  oeuvre?: any; // From Oeuvre types
  evenement?: any; // From Evenement types
  commentaireParent?: Commentaire;
  reponses?: Commentaire[];
}

export interface CritiqueEvaluation {
  idCritique: number;
  idOeuvre: number;
  idUser: number;
  note?: number;
  commentaire?: string;
  dateCreation?: Date;
  dateModification: Date;
  // Relations
  oeuvre?: any; // From Oeuvre types
  user?: User;
}

export interface Favori {
  idFavori: number;
  idUser: number;
  typeEntite: 'oeuvre' | 'evenement' | 'lieu' | 'user' | 'artisanat';
  idEntite: number;
  dateAjout?: Date;
  notes?: string;
  // Relations
  user?: User;
}

export interface Notification {
  idNotification: number;
  idUser: number;
  typeNotification: 'validation_participation' | 'annulation_evenement' | 'modification_programme' | 
    'nouvel_evenement' | 'nouvelle_oeuvre' | 'nouveau_commentaire' | 'bienvenue' | 'validation_compte' | 
    'message_admin' | 'rappel_evenement' | 'autre';
  titre: string;
  message: string;
  idEvenement?: number;
  idProgramme?: number;
  idOeuvre?: number;
  urlAction?: string;
  emailEnvoye?: boolean;
  smsEnvoye?: boolean;
  lu?: boolean;
  dateLecture?: Date;
  priorite?: 'basse' | 'normale' | 'haute' | 'urgente';
  expireLe?: Date;
  dateCreation?: Date;
  dateModification?: Date;
  // Relations
  utilisateur?: User;
  evenement?: any; // From Evenement types
  programme?: any; // From Evenement types
  oeuvre?: any; // From Oeuvre types
}

export interface Signalement {
  idSignalement: number;
  typeEntite: 'commentaire' | 'oeuvre' | 'evenement' | 'user' | 'artisanat';
  idEntite: number;
  idUserSignalant: number;
  motif: 'spam' | 'contenu_inapproprie' | 'faux_contenu' | 'violation_droits' | 
    'harcelement' | 'incitation_haine' | 'contenu_illegal' | 'autre';
  description?: string;
  urlScreenshot?: string;
  statut?: 'en_attente' | 'en_cours' | 'traite' | 'rejete';
  priorite?: 'basse' | 'normale' | 'haute' | 'urgente';
  idModerateur?: number;
  dateTraitement?: Date;
  actionPrise?: 'aucune' | 'avertissement' | 'suppression_contenu' | 
    'suspension_temporaire' | 'suspension_permanente' | 'signalement_autorites';
  notesModeration?: string;
  dateSignalement?: Date;
  dateModification?: Date;
  // Relations
  signalant?: User;
  moderateur?: User;
  commentaireSignale?: Commentaire;
  oeuvreSignalee?: any; // From Oeuvre types
  userSignale?: User;
}

export interface Vue {
  idVue: number;
  typeEntite: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat' | 'article';
  idEntite: number;
  idUser?: number;
  ipAddress: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
  dureeSecondes?: number;
  pays?: string;
  ville?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot';
  isUnique?: boolean;
  dateVue: Date;
  // Relations
  utilisateur?: User;
}

export interface AuditLog {
  idLog: number;
  idAdmin: number;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  dateAction?: Date;
  // Relations
  admin?: User;
}