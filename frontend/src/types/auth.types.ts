// types/auth.types.ts - Types pour l'authentification et l'inscription

import { User, TypeUser } from './User.types';

// Données communes pour tous les types d'inscription
export interface BaseRegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe?: 'M' | 'F';
  telephone?: string;
  accepteConditions: boolean;
}

// Inscription pour un visiteur
export interface VisitorRegistrationData extends BaseRegistrationData {
  typeUtilisateur: 'visiteur';
  wilayaId?: number;
  communeId?: number;
}

// Inscription pour un professionnel
export interface ProfessionalRegistrationData extends BaseRegistrationData {
  typeUtilisateur: 'professionnel';
  
  // Informations professionnelles obligatoires
  profession: TypeUser; // Type réel: ecrivain, artiste, etc.
  biographie: string;
  domaineActivite: string[];
  wilayaId: number;
  communeId: number;
  adresse: string;
  
  // Informations optionnelles
  photo_url?: string;
  siteWeb?: string;
  reseauxSociaux?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  
  // Documents pour la validation
  documents?: {
    cv?: File;
    portfolio?: File[];
    certifications?: File[];
  };
}

// Type union pour l'inscription
export type UserRegistrationForm = VisitorRegistrationData | ProfessionalRegistrationData;

// Réponse de l'API pour l'inscription
export interface RegistrationResponse {
  token: string;
  user: User;
  message: string;
  requiresValidation?: boolean; // Pour les professionnels
}

// Réponse de l'API pour la connexion
export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
  expiresAt?: string;
}

// Credentials de connexion
export interface LoginCredentials {
  email: string;
  password: string;
}

// Reset password
export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

// État de l'authentification
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

// Contexte d'authentification
export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

// Données pour l'inscription (format API)
export interface RegisterData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone?: string;
  dateNaissance: string;
  sexe?: 'M' | 'F';
  wilayaResidence?: number;
  typeUser: TypeUser;
  biographie?: string;
  photoUrl?: string;
  specialites?: string[];
  adresse?: string;
  siteWeb?: string;
  reseauxSociaux?: any;
  accepteConditions: boolean;
  accepteNewsletter?: boolean;
}

// État du formulaire d'inscription
export interface RegistrationFormState {
  currentStep: number;
  isSubmitting: boolean;
  errors: Record<string, string>;
  touchedFields: Set<string>;
}

// Options pour les domaines d'activité
export const DOMAINES_ACTIVITE = [
  { value: 'artisanat', label: 'Artisanat traditionnel' },
  { value: 'musique', label: 'Musique et chant' },
  { value: 'danse', label: 'Danse traditionnelle' },
  { value: 'theatre', label: 'Théâtre' },
  { value: 'scientifique', label: 'Scientifique' },
  { value: 'litterature', label: 'Littérature' },
  { value: 'arts_visuels', label: 'Arts visuels' },
  { value: 'patrimoine', label: 'Conservation du patrimoine' },
  { value: 'gastronomie', label: 'Gastronomie traditionnelle' },
  { value: 'education', label: 'Éducation culturelle' },
  { value: 'autre', label: 'Autre' }
] as const;

// Validation des données
export const registrationValidation = {
  email: (value: string): string | null => {
    if (!value) return 'Email requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide';
    return null;
  },
  
  password: (value: string): string | null => {
    if (!value) return 'Mot de passe requis';
    if (value.length < 8) return 'Au moins 8 caractères';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      return 'Doit contenir majuscule, minuscule et chiffre';
    }
    return null;
  },
  
  confirmPassword: (value: string, password: string): string | null => {
    if (!value) return 'Confirmation requise';
    if (value !== password) return 'Les mots de passe ne correspondent pas';
    return null;
  },
  
  nom: (value: string): string | null => {
    if (!value) return 'Nom requis';
    if (value.length < 2) return 'Au moins 2 caractères';
    return null;
  },
  
  prenom: (value: string): string | null => {
    if (!value) return 'Prénom requis';
    if (value.length < 2) return 'Au moins 2 caractères';
    return null;
  },
  
  dateNaissance: (value: string): string | null => {
    if (!value) return 'Date de naissance requise';
    const date = new Date(value);
    const age = new Date().getFullYear() - date.getFullYear();
    if (age < 13) return 'Vous devez avoir au moins 13 ans';
    if (age > 120) return 'Date invalide';
    return null;
  },
  
  telephone: (value: string): string | null => {
    if (!value) return null; // Optionnel
    if (!/^(0[567])\d{8}$/.test(value)) return 'Numéro de téléphone invalide';
    return null;
  },
  
  profession: (value: string): string | null => {
    if (!value) return 'Profession requise';
    if (value.length < 3) return 'Au moins 3 caractères';
    return null;
  },
  
  biographie: (value: string): string | null => {
    if (!value) return 'Biographie requise';
    if (value.length < 50) return 'Au moins 50 caractères';
    if (value.length > 500) return 'Maximum 500 caractères';
    return null;
  },
  
  domaineActivite: (value: string[]): string | null => {
    if (!value || value.length === 0) return 'Au moins un domaine requis';
    if (value.length > 3) return 'Maximum 3 domaines';
    return null;
  },
  
  acceptTerms: (value: boolean): string | null => {
    if (!value) return 'Vous devez accepter les conditions';
    return null;
  },
  
  wilayaId: (value: number | undefined): string | null => {
    if (!value && value !== 0) return 'Wilaya requise';
    return null;
  },
  
  communeId: (value: number | undefined): string | null => {
    if (!value && value !== 0) return 'Commune requise';
    return null;
  },
  
  adresse: (value: string): string | null => {
    if (!value) return 'Adresse requise';
    if (value.length < 10) return 'Adresse trop courte';
    return null;
  }
};

// Helper pour déterminer le type d'inscription
export function isVisitorRegistration(data: UserRegistrationForm): data is VisitorRegistrationData {
  return data.typeUtilisateur === 'visiteur';
}

export function isProfessionalRegistration(data: UserRegistrationForm): data is ProfessionalRegistrationData {
  return data.typeUtilisateur === 'professionnel';
}

// Helper pour valider les données d'inscription
export function validateRegistrationData(data: Partial<UserRegistrationForm>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // Validation commune
  if (data.email) {
    const emailError = registrationValidation.email(data.email);
    if (emailError) errors.email = emailError;
  }
  
  if (data.password) {
    const passwordError = registrationValidation.password(data.password);
    if (passwordError) errors.password = passwordError;
  }
  
  if (data.confirmPassword && data.password) {
    const confirmError = registrationValidation.confirmPassword(data.confirmPassword, data.password);
    if (confirmError) errors.confirmPassword = confirmError;
  }
  
  if (data.nom) {
    const nomError = registrationValidation.nom(data.nom);
    if (nomError) errors.nom = nomError;
  }
  
  if (data.prenom) {
    const prenomError = registrationValidation.prenom(data.prenom);
    if (prenomError) errors.prenom = prenomError;
  }
  
  if (data.dateNaissance) {
    const dateError = registrationValidation.dateNaissance(data.dateNaissance);
    if (dateError) errors.dateNaissance = dateError;
  }
  
  if (data.telephone) {
    const phoneError = registrationValidation.telephone(data.telephone);
    if (phoneError) errors.telephone = phoneError;
  }
  
  // Validation spécifique aux professionnels
  if (data.typeUtilisateur === 'professionnel') {
    const profData = data as Partial<ProfessionalRegistrationData>;
    
    if (profData.profession) {
      const profError = registrationValidation.profession(profData.profession);
      if (profError) errors.profession = profError;
    }
    
    if (profData.biographie) {
      const bioError = registrationValidation.biographie(profData.biographie);
      if (bioError) errors.biographie = bioError;
    }
    
    if (profData.domaineActivite) {
      const domaineError = registrationValidation.domaineActivite(profData.domaineActivite);
      if (domaineError) errors.domaineActivite = domaineError;
    }
    
    const wilayaError = registrationValidation.wilayaId(profData.wilayaId);
    if (wilayaError) errors.wilayaId = wilayaError;
    
    const communeError = registrationValidation.communeId(profData.communeId);
    if (communeError) errors.communeId = communeError;
    
    if (profData.adresse) {
      const adresseError = registrationValidation.adresse(profData.adresse);
      if (adresseError) errors.adresse = adresseError;
    }
  }
  
  return errors;
}