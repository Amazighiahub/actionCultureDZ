// types/auth.types.ts
// Import depuis auth.service pour utiliser le type CurrentUser
import type { 
  
  RegisterVisitorData,
  RegisterProfessionalData 
} from '@/services/auth.service';
// Import depuis config/api pour LoginCredentials
import type { LoginCredentials } from '@/config/api';
import { TypeUserEnum } from './user.types';
import { CurrentUser } from '@/services/auth.service';

// On utilise CurrentUser comme type User dans l'application
export type User = CurrentUser;

// Réexporter les types nécessaires
export type { 
  RegisterVisitorData, 
  RegisterProfessionalData,
  CurrentUser
} from '@/services/auth.service';

// Réexporter LoginCredentials depuis config/api
export type { LoginCredentials } from '@/config/api';

/**
 * Type de retour du hook useAuth
 */
export interface UseAuthReturn {
  // État utilisateur
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  
  // Helpers basés sur le rôle
  isAdmin: boolean;
  isProfessional: boolean;
  isVisitor: boolean;
  
  // État de validation (pour les professionnels)
  needsValidation: boolean;
  statusMessage: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  registerVisitor: (data: RegisterVisitorData) => Promise<boolean>;
  registerProfessional: (data: RegisterProfessionalData) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  
  // État des actions
  loginLoading: boolean;
  registerLoading: boolean;
}

/**
 * Mapping des secteurs vers les IDs de types d'utilisateur
 * MODIFIÉ : Maintenant map vers les IDs au lieu des noms
 */
export const SECTEUR_TYPE_USER_MAP: Record<string, number> = {
  'Littérature': TypeUserEnum.ECRIVAIN,
  'Journalisme': TypeUserEnum.JOURNALISTE,
  'Sciences': TypeUserEnum.SCIENTIFIQUE,
  'Cinéma': TypeUserEnum.ACTEUR,
  'Arts visuels': TypeUserEnum.ARTISTE,
  'Artisanat': TypeUserEnum.ARTISAN,
  'Musique': TypeUserEnum.MUSICIEN,
  'Réalisation': TypeUserEnum.REALISATEUR,
  'Théâtre': TypeUserEnum.ACTEUR,
  'Photographie': TypeUserEnum.PHOTOGRAPHE,
  'Danse': TypeUserEnum.DANSEUR,
  'Sculpture': TypeUserEnum.SCULPTEUR
};

/**
 * Options de secteur pour le formulaire
 */
export const SECTEUR_OPTIONS = [
  { value: 'Littérature', label: 'Littérature (Écrivain)' },
  { value: 'Journalisme', label: 'Journalisme' },
  { value: 'Sciences', label: 'Sciences' },
  { value: 'Cinéma', label: 'Cinéma (Acteur/Réalisateur)' },
  { value: 'Arts visuels', label: 'Arts visuels' },
  { value: 'Artisanat', label: 'Artisanat traditionnel' },
  { value: 'Musique', label: 'Musique' },
  { value: 'Théâtre', label: 'Théâtre' },
  { value: 'Photographie', label: 'Photographie' },
  { value: 'Danse', label: 'Danse' },
  { value: 'Sculpture', label: 'Sculpture' }
];

/**
 * Configuration de validation des champs
 */
export const VALIDATION_RULES = {
  password: {
    minLength: 8,
    maxLength: 50,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumber: true,
    requireSpecialChar: false,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,50}$/,
    message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
  },
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Email invalide'
  },
  nom: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s'-]+$/,
    message: 'Le nom doit contenir entre 2 et 50 caractères alphabétiques'
  },
  prenom: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s'-]+$/,
    message: 'Le prénom doit contenir entre 2 et 50 caractères alphabétiques'
  },
  telephone: {
    pattern: /^(\+213|0)[5-7]\d{8}$/,  // Format algérien
    message: 'Numéro de téléphone invalide (format: +213XXXXXXXXX ou 0XXXXXXXXX)'
  },
  biographie: {
    minLength: 50,
    maxLength: 500,
    message: 'La biographie doit contenir entre 50 et 500 caractères'
  },
  dateNaissance: {
    minAge: 13,
    maxAge: 120,
    message: 'Vous devez avoir au moins 13 ans'
  }
};

/**
 * Messages d'erreur pour l'authentification
 */
export const AUTH_ERROR_MESSAGES = {
  // Erreurs de connexion
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  ACCOUNT_SUSPENDED: 'Votre compte a été suspendu. Veuillez contacter l\'administration',
  ACCOUNT_NOT_VERIFIED: 'Veuillez vérifier votre email avant de vous connecter',
  ACCOUNT_PENDING_VALIDATION: 'Votre compte professionnel est en attente de validation par un administrateur',
  ACCOUNT_REJECTED: 'Votre demande de compte professionnel a été rejetée',
  SESSION_EXPIRED: 'Votre session a expiré, veuillez vous reconnecter',
  
  // Erreurs d'inscription
  EMAIL_ALREADY_EXISTS: 'Cet email est déjà utilisé',
  WEAK_PASSWORD: 'Le mot de passe est trop faible',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas',
  INVALID_EMAIL: 'Format d\'email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  TERMS_NOT_ACCEPTED: 'Vous devez accepter les conditions d\'utilisation',
  AGE_REQUIREMENT: 'Vous devez avoir au moins 13 ans pour vous inscrire',
  
  // Erreurs de validation des champs
  FIELD_REQUIRED: 'Ce champ est obligatoire',
  FIELD_TOO_SHORT: 'Ce champ est trop court',
  FIELD_TOO_LONG: 'Ce champ est trop long',
  INVALID_FORMAT: 'Format invalide',
  INVALID_DATE: 'Date invalide',
  FUTURE_DATE: 'La date ne peut pas être dans le futur',
  
  // Erreurs de permissions
  UNAUTHORIZED: 'Vous n\'êtes pas autorisé à accéder à cette ressource',
  FORBIDDEN: 'Accès interdit',
  PROFESSIONAL_ONLY: 'Cette fonctionnalité est réservée aux professionnels validés',
  ADMIN_ONLY: 'Cette fonctionnalité est réservée aux administrateurs',
  OWNER_ONLY: 'Vous ne pouvez modifier que vos propres contenus',
  
  // Erreurs réseau
  NETWORK_ERROR: 'Erreur de connexion au serveur. Veuillez réessayer',
  SERVER_ERROR: 'Une erreur serveur est survenue. Veuillez réessayer plus tard',
  TIMEOUT: 'La requête a expiré. Veuillez réessayer',
  
  // Erreurs de token
  INVALID_TOKEN: 'Token invalide ou expiré',
  TOKEN_EXPIRED: 'Votre session a expiré',
  REFRESH_TOKEN_EXPIRED: 'Votre session de connexion a expiré. Veuillez vous reconnecter',
  
  // Erreurs de récupération de mot de passe
  RESET_TOKEN_INVALID: 'Le lien de réinitialisation est invalide ou a expiré',
  EMAIL_NOT_FOUND: 'Aucun compte n\'est associé à cet email',
  
  // Erreurs professionnelles
  BIOGRAPHY_TOO_SHORT: 'La biographie doit contenir au moins 50 caractères',
  SECTOR_REQUIRED: 'Veuillez sélectionner votre secteur d\'activité',
  INVALID_SIRET: 'Numéro SIRET invalide',
  DOCUMENTS_REQUIRED: 'Veuillez fournir au moins un document justificatif',
  PHOTO_REQUIRED: 'Une photo de profil est requise pour les professionnels',
  
  // Messages génériques
  UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite',
  TRY_AGAIN: 'Veuillez réessayer',
  CONTACT_SUPPORT: 'Si le problème persiste, contactez le support'
} as const;

/**
 * Codes d'erreur HTTP pour l'authentification
 */
export const AUTH_HTTP_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Durées de session et tokens
 */
export const AUTH_DURATIONS = {
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 heures en ms
  REFRESH_TOKEN_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 jours en ms
  VERIFICATION_TOKEN_DURATION: 24 * 60 * 60 * 1000, // 24 heures en ms
  RESET_TOKEN_DURATION: 1 * 60 * 60 * 1000, // 1 heure en ms
  LOGIN_ATTEMPTS_WINDOW: 15 * 60 * 1000, // 15 minutes en ms
  MAX_LOGIN_ATTEMPTS: 5
} as const;

/**
 * Regex de validation
 */
export const AUTH_REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,50}$/,
  PHONE_DZ: /^(\+213|0)[5-7]\d{8}$/,
  NAME: /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/,
  SIRET: /^\d{14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/
} as const;

/**
 * Map des types d'utilisateurs (ID vers nom)
 */
export const USER_TYPE_NAMES: Record<number, string> = {
  1: 'visiteur',
  2: 'ecrivain',
  3: 'journaliste',
  4: 'scientifique',
  5: 'acteur',
  6: 'artiste',
  7: 'artisan',
  8: 'realisateur',
  9: 'musicien',
  10: 'photographe',
  11: 'danseur',
  12: 'sculpteur',
  13: 'autre'
};

/**
 * Rôles disponibles
 */
export const ROLES = [
  'User',
  'Professionnel',
  'Administrateur'
] as const;

export type Role = typeof ROLES[number];

/**
 * Statuts de compte
 */
export const ACCOUNT_STATUS = [
  'actif',
  'inactif',
  'suspendu',
  'en_attente_validation',
  'supprime'
] as const;

export type AccountStatus = typeof ACCOUNT_STATUS[number];

/**
 * Helper pour valider un champ
 */
export function validateField(fieldName: keyof typeof VALIDATION_RULES, value: string): { valid: boolean; error?: string } {
  const rules = VALIDATION_RULES[fieldName];
  
  if (!rules) {
    return { valid: true };
  }
  
  // Vérifier la longueur minimale
  if ('minLength' in rules && value.length < rules.minLength) {
    return { valid: false, error: rules.message || `Minimum ${rules.minLength} caractères requis` };
  }
  
  // Vérifier la longueur maximale
  if ('maxLength' in rules && value.length > rules.maxLength) {
    return { valid: false, error: rules.message || `Maximum ${rules.maxLength} caractères autorisés` };
  }
  
  // Vérifier le pattern
  if ('pattern' in rules && rules.pattern && !rules.pattern.test(value)) {
    return { valid: false, error: rules.message || 'Format invalide' };
  }
  
  return { valid: true };
}

/**
 * Helper pour valider l'âge
 */
export function validateAge(dateNaissance: string): { valid: boolean; error?: string } {
  const birthDate = new Date(dateNaissance);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  
  if (actualAge < VALIDATION_RULES.dateNaissance.minAge) {
    return { valid: false, error: VALIDATION_RULES.dateNaissance.message };
  }
  
  if (actualAge > VALIDATION_RULES.dateNaissance.maxAge) {
    return { valid: false, error: 'Date de naissance invalide' };
  }
  
  return { valid: true };
}

/**
 * Helper pour formater les erreurs de validation
 */
export function formatValidationErrors(errors: Array<{ field: string; message: string }>): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Helper pour vérifier si un utilisateur a un rôle spécifique
 */
export function hasRole(user: User | null, roleName: string): boolean {
  if (!user || !user.Roles) return false;
  return user.Roles.some(role => role.nom_role === roleName);
}

/**
 * Helper pour vérifier si un utilisateur est admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'Administrateur');
}

/**
 * Helper pour vérifier si un utilisateur est professionnel
 * MODIFIÉ : Utilise maintenant id_type_user
 */
export function isProfessional(user: User | null): boolean {
  if (!user) return false;
  return user.id_type_user !== TypeUserEnum.VISITEUR;
}

/**
 * Helper pour vérifier si un utilisateur est visiteur
 * MODIFIÉ : Utilise maintenant id_type_user
 */
export function isVisitor(user: User | null): boolean {
  if (!user) return false;
  return user.id_type_user === TypeUserEnum.VISITEUR;
}

/**
 * Helper pour vérifier si un professionnel a besoin de validation
 */
export function needsValidation(user: User | null): boolean {
  if (!user || !isProfessional(user)) return false;
  return user.statut_validation === "en_attente";
}

/**
 * Helper pour obtenir le message de statut d'un utilisateur
 */
export function getUserStatusMessage(user: User | null): string | null {
  if (!user) return null;
  
  if (user.statut_validation === 'suspendu') {
    return 'Votre compte a été suspendu. Veuillez contacter l\'administration.';
  }
  
  if (needsValidation(user)) {
    return 'Votre compte professionnel est en attente de validation.';
  }
  
  return null;
}

/**
 * Helper pour vérifier si un utilisateur peut accéder à l'application
 */
export function canAccessApp(user: User | null): boolean {
  if (!user) return false;
  
  // Admin peut toujours accéder
  if (isAdmin(user)) return true;
  
  // Visiteur peut accéder
  if (isVisitor(user)) return true;
  
  // Professionnel doit être validé
  if (isProfessional(user)) {
    return !needsValidation(user);
  }
  
  return false;
}

/**
 * Helper pour obtenir le nom complet d'un utilisateur
 */
export function getUserFullName(user: User | null): string {
  if (!user) return '';
  return `${user.prenom} ${user.nom}`.trim();
}

/**
 * Helper pour obtenir les initiales d'un utilisateur
 */
export function getUserInitials(user: User | null): string {
  if (!user) return '?';
  const prenom = user.prenom?.[0] || '';
  const nom = user.nom?.[0] || '';
  return `${prenom}${nom}`.toUpperCase() || '?';
}

/**
 * Helper pour formater le type d'utilisateur pour l'affichage
 * MODIFIÉ : Prend maintenant un ID en paramètre
 */
export function formatUserType(idTypeUser: number): string {
  const typeLabels: Record<number, string> = {
    1: 'Visiteur',
    2: 'Écrivain',
    3: 'Journaliste',
    4: 'Scientifique',
    5: 'Acteur',
    6: 'Artiste',
    7: 'Artisan',
    8: 'Réalisateur',
    9: 'Musicien',
    10: 'Photographe',
    11: 'Danseur',
    12: 'Sculpteur',
    13: 'Autre professionnel'
  };
  
  return typeLabels[idTypeUser] || 'Type inconnu';
}

/**
 * Configuration des champs de formulaire d'inscription
 */
export const REGISTER_FORM_CONFIG = {
  visitor: {
    requiredFields: ['nom', 'prenom', 'sexe', 'date_naissance', 'email', 'mot_de_passe', 'confirmation_mot_de_passe', 'wilaya_residence', 'accepte_conditions'],
    optionalFields: ['telephone', 'accepte_newsletter']
  },
  professional: {
    requiredFields: ['nom', 'prenom', 'sexe', 'date_naissance', 'email', 'mot_de_passe', 'confirmation_mot_de_passe', 'wilaya_residence', 'accepte_conditions', 'secteur', 'biographie'],
    optionalFields: ['telephone', 'accepte_newsletter', 'photo_url', 'portfolio']
  }
};

/**
 * Messages de succès
 */
export const AUTH_SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie ! Bienvenue.',
  LOGOUT_SUCCESS: 'Déconnexion réussie. À bientôt !',
  REGISTER_SUCCESS_VISITOR: 'Inscription réussie ! Bienvenue sur Timlilit Culture.',
  REGISTER_SUCCESS_PROFESSIONAL: 'Inscription réussie ! Votre compte professionnel est en attente de validation.',
  PASSWORD_RESET_SENT: 'Un email de réinitialisation a été envoyé à votre adresse.',
  PASSWORD_RESET_SUCCESS: 'Votre mot de passe a été réinitialisé avec succès.',
  EMAIL_VERIFIED: 'Votre email a été vérifié avec succès.',
  PROFILE_UPDATED: 'Votre profil a été mis à jour avec succès.'
} as const;