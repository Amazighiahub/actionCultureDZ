// types/models/auth.types.ts - VERSION CORRIGÉE

import type { CurrentUser } from '@/services/auth.service';

// ✅ NOUVEAU: Type pour les résultats d'authentification
export interface AuthResult {
  success: boolean;
  error?: string;
}

// Credentials pour la connexion
export interface LoginCredentials {
  email: string;
  password: string;
}

// Données pour l'inscription visiteur
export interface RegisterVisitorData {
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  date_naissance: string;
  email: string;
  mot_de_passe: string;
  confirmation_mot_de_passe: string;
  wilaya_residence: number;
  telephone?: string;
  accepte_conditions: boolean;
  accepte_newsletter?: boolean;
}

// Données pour l'inscription professionnel
export interface RegisterProfessionalData extends RegisterVisitorData {
  photo_url?: string;
  biographie: string;
  id_type_user: number;
}

// ✅ CORRIGÉ: Interface du hook useAuth avec AuthResult
export interface UseAuthReturn {
  // État utilisateur
  user: CurrentUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isProfessional: boolean;
  isVisitor: boolean;
  needsValidation: boolean;
  statusMessage: string | null;
  
  // Actions - ✅ retournent maintenant AuthResult
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  registerVisitor: (data: RegisterVisitorData) => Promise<AuthResult>;
  registerProfessional: (data: RegisterProfessionalData) => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
  
  // État des actions
  loginLoading: boolean;
  registerLoading: boolean;
}

// Mapping des secteurs vers les ID de type utilisateur
export const SECTEUR_TYPE_USER_MAP: Record<string, number> = {
  'ecrivain': 2,
  'journaliste': 3,
  'scientifique': 4,
  'acteur': 5,
  'artiste': 6,
  'artisan': 7,
  'realisateur': 8,
  'musicien': 9,
  'photographe': 10,
  'danseur': 11,
  'sculpteur': 12,
  'autre': 13
};

// Options de secteurs pour le formulaire
export const SECTEUR_OPTIONS = [
  { value: 'ecrivain', label: 'Écrivain' },
  { value: 'journaliste', label: 'Journaliste' },
  { value: 'scientifique', label: 'Scientifique' },
  { value: 'acteur', label: 'Acteur' },
  { value: 'artiste', label: 'Artiste' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'realisateur', label: 'Réalisateur' },
  { value: 'musicien', label: 'Musicien' },
  { value: 'photographe', label: 'Photographe' },
  { value: 'danseur', label: 'Danseur' },
  { value: 'sculpteur', label: 'Sculpteur' },
  { value: 'autre', label: 'Autre' }
];

// Messages d'erreur d'authentification
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'invalid_credentials': 'Email ou mot de passe incorrect',
  'email_exists': 'Un utilisateur avec cet email existe déjà',
  'email_not_verified': 'Veuillez vérifier votre email avant de vous connecter',
  'account_suspended': 'Votre compte a été suspendu',
  'account_banned': 'Votre compte a été banni',
  'validation_pending': 'Votre compte est en attente de validation',
  'validation_rejected': 'Votre demande de validation a été rejetée',
  'server_error': 'Une erreur serveur est survenue. Veuillez réessayer.',
  'network_error': 'Erreur de connexion. Vérifiez votre connexion internet.',
  'token_expired': 'Votre session a expiré. Veuillez vous reconnecter.',
  'token_invalid': 'Session invalide. Veuillez vous reconnecter.'
};

// Types de statuts utilisateur
export type UserStatus = 
  | 'actif' 
  | 'en_attente_email' 
  | 'en_attente_validation' 
  | 'suspendu' 
  | 'banni' 
  | 'inactif' 
  | 'supprime';

// Types de statuts de validation (pour les professionnels)
export type ValidationStatus = 
  | 'en_attente' 
  | 'valide' 
  | 'rejete' 
  | null;

// Interface pour la réponse de vérification email
export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    user: CurrentUser;
    token: string;
    needsAdminValidation?: boolean;
  };
  error?: string;
}