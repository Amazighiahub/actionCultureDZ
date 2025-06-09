// Utility.types.ts - Types utilitaires pour le système

// Types de base pour les réponses API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Types pour les filtres et recherches
export interface BaseFilter {
  search?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface UserFilter extends BaseFilter {
  typeUser?: string;
  statut?: string;
  wilayaResidence?: number;
  professionnelValide?: boolean;
}

export interface OeuvreFilter extends BaseFilter {
  idTypeOeuvre?: number;
  idLangue?: number;
  statut?: string;
  anneeCreationMin?: number;
  anneeCreationMax?: number;
  categories?: number[];
  tags?: number[];
}

export interface EvenementFilter extends BaseFilter {
  idTypeEvenement?: number;
  statut?: string;
  dateDebutMin?: Date;
  dateDebutMax?: Date;
  idLieu?: number;
  wilayaId?: number;
  tarifMax?: number;
  capaciteMin?: number;
}

// Types pour les formulaires
export interface UserRegistrationForm {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  confirmPassword: string;
  typeUser: string;
  accepteConditions: boolean;
  wilayaResidence?: number;
  telephone?: string;
}

export interface OeuvreForm {
  titre: string;
  idTypeOeuvre: number;
  idLangue: number;
  description?: string;
  anneeCreation?: number;
  categories?: number[];
  tags?: string[];
  // Champs spécifiques selon le type
  isbn?: string; // Pour livre
  dureeMinutes?: number; // Pour film
  realisateur?: string; // Pour film
}

export interface EvenementForm {
  nomEvenement: string;
  description: string;
  idTypeEvenement: number;
  idLieu: number;
  dateDebut: Date;
  dateFin?: Date;
  capaciteMax?: number;
  tarif?: number;
  inscriptionRequise?: boolean;
  contactEmail?: string;
  contactTelephone?: string;
}

// Types pour les statistiques
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  professionnelsValides: number;
  parWilaya: Record<number, number>;
  parTypeUser: Record<string, number>;
  inscriptionsParMois: Array<{
    mois: string;
    total: number;
  }>;
}

export interface OeuvreStats {
  totalOeuvres: number;
  parType: Record<number, number>;
  parLangue: Record<number, number>;
  parStatut: Record<string, number>;
  topCategories: Array<{
    categorie: string;
    count: number;
  }>;
  evolutionAnnuelle: Array<{
    annee: number;
    count: number;
  }>;
}

export interface EvenementStats {
  totalEvenements: number;
  evenementsActifs: number;
  capaciteTotale: number;
  tauxRemplissage: number;
  parType: Record<number, number>;
  parWilaya: Record<number, number>;
  prochains30Jours: number;
}

// Types pour les permissions
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'validate' | 'moderate';
  conditions?: any;
}

export interface UserPermissions {
  canCreateOeuvre: boolean;
  canValidateOeuvre: boolean;
  canCreateEvenement: boolean;
  canModerateComments: boolean;
  canAccessAdmin: boolean;
  canManageUsers: boolean;
}

// Types pour les notifications temps réel
export interface RealtimeNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  actionUrl?: string;
  actionLabel?: string;
  autoClose?: boolean;
  duration?: number;
}

// Types d'erreurs
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
  timestamp: Date;
  path?: string;
}

// Types pour l'upload de fichiers
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
}

// Types pour la géolocalisation
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface LocationSearchResult {
  id: string;
  nom: string;
  adresse: string;
  coordinates: Coordinates;
  type: string;
  wilaya?: string;
  commune?: string;
}

// Types pour l'export de données
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  fields?: string[];
  filters?: any;
  includeRelations?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Types pour les préférences utilisateur
export interface UserPreferences {
  langue: string;
  theme: 'clair' | 'sombre' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    newsletter: boolean;
    commentaires: boolean;
    favoris: boolean;
    evenements: boolean;
  };
  affichage: {
    itemsParPage: number;
    vueParDefaut: 'grille' | 'liste';
    afficherImages: boolean;
  };
  confidentialite: {
    profilPublic: boolean;
    emailPublic: boolean;
    telephonePublic: boolean;
  };
}