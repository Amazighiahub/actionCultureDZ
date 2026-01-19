// types/models/specific-types.ts

/**
 * Types spécifiques pour remplacer les 'any'
 */

// Types pour les réseaux sociaux
export interface ReseauxSociaux {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  [key: string]: string | undefined; // Pour permettre d'autres réseaux
}

// Type pour une certification
export interface Certification {
  id?: number;
  nom: string;
  organisme: string;
  numero?: string;
  date_obtention?: string;
  date_expiration?: string;
  url_verification?: string;
  fichier?: string;
  verifie: boolean;
}

// Type pour les métadonnées de média
export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  codec?: string;
  bitrate?: number;
  framerate?: number;
  artist?: string;
  album?: string;
  title?: string;
  year?: number;
  genre?: string;
  [key: string]: string | number | boolean | undefined;
}

// Type pour le matériel requis (programme)
export interface MaterielRequis {
  nom: string;
  quantite?: number;
  description?: string;
  fourni?: boolean;
}

// Type pour les détails d'erreur
export interface ErrorDetails {
  field?: string;
  message: string;
  code?: string;
  value?: unknown;
}

// Type pour les statistiques
export interface Statistics {
  total: number;
  [key: string]: number;
}

// Type pour les coordonnées GPS
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Type pour les horaires
export interface Horaires {
  lundi?: HoraireJour;
  mardi?: HoraireJour;
  mercredi?: HoraireJour;
  jeudi?: HoraireJour;
  vendredi?: HoraireJour;
  samedi?: HoraireJour;
  dimanche?: HoraireJour;
  jours_feries?: HoraireJour;
  exceptions?: HoraireException[];
}

export interface HoraireJour {
  ouvert: boolean;
  horaires?: PlageHoraire[];
}

export interface PlageHoraire {
  debut: string; // Format HH:mm
  fin: string;   // Format HH:mm
}

export interface HoraireException {
  date: string;
  horaire?: HoraireJour;
  description?: string;
}

// Type pour les documents fournis
export interface DocumentFourni {
  type: 'cv' | 'portfolio' | 'diplome' | 'certificat' | 'autre';
  nom: string;
  url: string;
  date_upload: string;
  verifie?: boolean;
}

// Type pour les spécialités avec niveau
export interface SpecialiteAvecNiveau {
  id_specialite: number;
  nom: string;
  niveau: 'debutant' | 'intermediaire' | 'expert';
  annees_experience?: number;
}

// Type pour les paramètres de recherche géographique
export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radius: number; // en kilomètres
}

// Type pour les options de tri
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Type pour les filtres dynamiques
export interface DynamicFilters {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
}

// Type pour les détails d'audit
export interface AuditDetails {
  action: string;
  entity_type: string;
  entity_id: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

// Type pour les préférences de notification
export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly';
    types: string[];
  };
  push: {
    enabled: boolean;
    types: string[];
  };
  sms?: {
    enabled: boolean;
    types: string[];
  };
}

// Type pour les tags
export type Tag = string;

// Type pour les langues parlées
export type LangueParlée = string;

// Type pour les JSON génériques mais typés
export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = Array<JsonValue>;

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;


// Type pour les options de select multiples
export interface MultiSelectOption {
  value: string | number;
  label: string;
  group?: string;
  disabled?: boolean;
  metadata?: Record<string, unknown>;
}

// Type pour les paramètres d'export
export interface ExportParams {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  columns?: string[];
  filters?: DynamicFilters;
  sort?: SortOptions;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Type pour les statistiques détaillées
export interface DetailedStats {
  count: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  previousPeriod?: {
    count: number;
    percentage?: number;
  };
}

// Type pour les permissions
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

// Type pour les rôles avec permissions
export interface RoleWithPermissions {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
}