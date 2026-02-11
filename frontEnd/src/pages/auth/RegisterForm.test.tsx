/**
 * Tests pour la validation du formulaire RegisterForm
 * Tests unitaires de la logique de validation pour Visiteur et Professionnel
 */
import { describe, it, expect } from 'vitest';

// Types
type UserType = 'visiteur' | 'professionnel';

interface RegisterFormData {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  confirmPassword: string;
  accepteConditions: boolean;
  // Champs professionnels
  secteur?: string;
  biographie?: string;
}

// Fonctions de validation extraites du composant
const validatePrenom = (prenom: string): string | null => {
  if (!prenom) {
    return 'Le prénom est requis';
  }
  return null;
};

const validateNom = (nom: string): string | null => {
  if (!nom) {
    return 'Le nom est requis';
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email) {
    return "L'email est requis";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email invalide';
  }
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Le mot de passe est requis';
  }
  if (password.length < 12) {
    return 'Le mot de passe doit contenir au moins 12 caractères';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Doit contenir un caractère spécial';
  }
  return null;
};

const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Veuillez confirmer le mot de passe';
  }
  if (password !== confirmPassword) {
    return 'Les mots de passe ne correspondent pas';
  }
  return null;
};

const validateAccepteConditions = (accepte: boolean): string | null => {
  if (!accepte) {
    return 'Vous devez accepter les conditions';
  }
  return null;
};

// Validation spécifique professionnel
const validateSecteur = (secteur: string | undefined): string | null => {
  if (!secteur) {
    return 'Le secteur est requis';
  }
  return null;
};

const validateBiographie = (biographie: string | undefined): string | null => {
  if (!biographie || biographie.length < 50) {
    return 'Minimum 50 caractères';
  }
  return null;
};

// Validation de la photo de profil
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface FileInfo {
  size: number;
  type: string;
}

const validatePhoto = (file: FileInfo | null | undefined): string | null => {
  if (!file) {
    return null; // Photo optionnelle
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return 'Fichier trop volumineux (max 5 MB)';
  }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Format de fichier non supporté';
  }
  
  return null;
};

// Validation complète du formulaire
const validateRegisterForm = (data: RegisterFormData, userType: UserType): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Champs communs visiteur et professionnel
  const prenomError = validatePrenom(data.prenom);
  if (prenomError) errors.prenom = prenomError;
  
  const nomError = validateNom(data.nom);
  if (nomError) errors.nom = nomError;
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;
  
  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;
  
  const confirmError = validateConfirmPassword(data.password, data.confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;
  
  const conditionsError = validateAccepteConditions(data.accepteConditions);
  if (conditionsError) errors.accepteConditions = conditionsError;
  
  // Champs spécifiques professionnel
  if (userType === 'professionnel') {
    const secteurError = validateSecteur(data.secteur);
    if (secteurError) errors.secteur = secteurError;
    
    const biographieError = validateBiographie(data.biographie);
    if (biographieError) errors.biographie = biographieError;
  }
  
  return errors;
};

describe('RegisterForm - Validation', () => {
  describe('validatePrenom', () => {
    it('retourne une erreur si prénom est vide', () => {
      expect(validatePrenom('')).toBe('Le prénom est requis');
    });

    it('retourne null si prénom est fourni', () => {
      expect(validatePrenom('John')).toBeNull();
    });
  });

  describe('validateNom', () => {
    it('retourne une erreur si nom est vide', () => {
      expect(validateNom('')).toBe('Le nom est requis');
    });

    it('retourne null si nom est fourni', () => {
      expect(validateNom('Doe')).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('retourne une erreur si email est vide', () => {
      expect(validateEmail('')).toBe("L'email est requis");
    });

    it('retourne une erreur si email est invalide', () => {
      expect(validateEmail('email-invalide')).toBe('Email invalide');
      expect(validateEmail('test@')).toBe('Email invalide');
    });

    it('retourne null si email est valide', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('retourne une erreur si mot de passe est vide', () => {
      expect(validatePassword('')).toBe('Le mot de passe est requis');
    });

    it('retourne une erreur si mot de passe trop court', () => {
      expect(validatePassword('123')).toBe('Le mot de passe doit contenir au moins 12 caractères');
      expect(validatePassword('12345678901')).toBe('Le mot de passe doit contenir au moins 12 caractères');
    });

    it('retourne une erreur si pas de caractère spécial', () => {
      expect(validatePassword('Password12345')).toBe('Doit contenir un caractère spécial');
    });

    it('retourne null si mot de passe valide avec caractère spécial', () => {
      expect(validatePassword('Password123!@')).toBeNull();
      expect(validatePassword('123456789012!')).toBeNull();
    });
  });

  describe('validateConfirmPassword', () => {
    it('retourne une erreur si confirmation vide', () => {
      expect(validateConfirmPassword('password123', '')).toBe('Veuillez confirmer le mot de passe');
    });

    it('retourne une erreur si mots de passe différents', () => {
      expect(validateConfirmPassword('password123', 'different')).toBe('Les mots de passe ne correspondent pas');
    });

    it('retourne null si mots de passe identiques', () => {
      expect(validateConfirmPassword('password123', 'password123')).toBeNull();
    });
  });

  describe('validateRegisterForm - Visiteur', () => {
    it('retourne des erreurs pour formulaire visiteur vide', () => {
      const errors = validateRegisterForm({
        prenom: '',
        nom: '',
        email: '',
        password: '',
        confirmPassword: '',
        accepteConditions: false
      }, 'visiteur');
      
      expect(errors.prenom).toBe('Le prénom est requis');
      expect(errors.nom).toBe('Le nom est requis');
      expect(errors.email).toBe("L'email est requis");
      expect(errors.password).toBe('Le mot de passe est requis');
      expect(errors.confirmPassword).toBe('Veuillez confirmer le mot de passe');
      expect(errors.accepteConditions).toBe('Vous devez accepter les conditions');
    });

    it('retourne objet vide si formulaire visiteur valide', () => {
      const errors = validateRegisterForm({
        prenom: 'John',
        nom: 'Doe',
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
        accepteConditions: true
      }, 'visiteur');
      
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('visiteur ne requiert pas secteur ni biographie', () => {
      const errors = validateRegisterForm({
        prenom: 'John',
        nom: 'Doe',
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
        accepteConditions: true,
        secteur: '',
        biographie: ''
      }, 'visiteur');
      
      expect(errors.secteur).toBeUndefined();
      expect(errors.biographie).toBeUndefined();
    });
  });

  describe('validateRegisterForm - Professionnel', () => {
    it('professionnel requiert secteur et biographie', () => {
      const errors = validateRegisterForm({
        prenom: 'John',
        nom: 'Doe',
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
        accepteConditions: true,
        secteur: '',
        biographie: ''
      }, 'professionnel');
      
      expect(errors.secteur).toBe('Le secteur est requis');
      expect(errors.biographie).toBe('Minimum 50 caractères');
    });

    it('professionnel biographie trop courte', () => {
      const errors = validateRegisterForm({
        prenom: 'John',
        nom: 'Doe',
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
        accepteConditions: true,
        secteur: 'artiste',
        biographie: 'Trop court'
      }, 'professionnel');
      
      expect(errors.biographie).toBe('Minimum 50 caractères');
      expect(errors.secteur).toBeUndefined();
    });

    it('retourne objet vide si formulaire professionnel valide', () => {
      const errors = validateRegisterForm({
        prenom: 'John',
        nom: 'Doe',
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
        accepteConditions: true,
        secteur: 'artiste',
        biographie: 'Je suis un artiste professionnel avec plus de 10 ans d\'expérience dans le domaine.'
      }, 'professionnel');
      
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('validatePassword - caractère spécial', () => {
    it('retourne erreur si pas de caractère spécial', () => {
      expect(validatePassword('Password12345')).toBe('Doit contenir un caractère spécial');
    });

    it('retourne null si caractère spécial présent', () => {
      expect(validatePassword('Password123!@')).toBeNull();
    });
  });

  describe('validateAccepteConditions', () => {
    it('retourne erreur si conditions non acceptées', () => {
      expect(validateAccepteConditions(false)).toBe('Vous devez accepter les conditions');
    });

    it('retourne null si conditions acceptées', () => {
      expect(validateAccepteConditions(true)).toBeNull();
    });
  });

  describe('validateSecteur', () => {
    it('retourne erreur si secteur vide', () => {
      expect(validateSecteur('')).toBe('Le secteur est requis');
      expect(validateSecteur(undefined)).toBe('Le secteur est requis');
    });

    it('retourne null si secteur fourni', () => {
      expect(validateSecteur('artiste')).toBeNull();
    });
  });

  describe('validateBiographie', () => {
    it('retourne erreur si biographie trop courte', () => {
      expect(validateBiographie('')).toBe('Minimum 50 caractères');
      expect(validateBiographie('Trop court')).toBe('Minimum 50 caractères');
    });

    it('retourne null si biographie assez longue', () => {
      const bio = 'Je suis un artiste professionnel avec plus de 10 ans d\'expérience.';
      expect(validateBiographie(bio)).toBeNull();
    });
  });

  describe('validatePhoto', () => {
    it('retourne erreur si fichier trop volumineux (> 5MB)', () => {
      const result = validatePhoto({ size: 6 * 1024 * 1024, type: 'image/jpeg' });
      expect(result).toBe('Fichier trop volumineux (max 5 MB)');
    });

    it('retourne erreur si type de fichier invalide', () => {
      const result = validatePhoto({ size: 1024, type: 'application/pdf' });
      expect(result).toBe('Format de fichier non supporté');
    });

    it('retourne null si fichier valide (image < 5MB)', () => {
      expect(validatePhoto({ size: 1024 * 1024, type: 'image/jpeg' })).toBeNull();
      expect(validatePhoto({ size: 2 * 1024 * 1024, type: 'image/png' })).toBeNull();
      expect(validatePhoto({ size: 500 * 1024, type: 'image/gif' })).toBeNull();
      expect(validatePhoto({ size: 100 * 1024, type: 'image/webp' })).toBeNull();
    });

    it('retourne null si pas de fichier (optionnel)', () => {
      expect(validatePhoto(null)).toBeNull();
      expect(validatePhoto(undefined)).toBeNull();
    });

    it('accepte exactement 5MB', () => {
      const result = validatePhoto({ size: 5 * 1024 * 1024, type: 'image/jpeg' });
      expect(result).toBeNull();
    });
  });
});
