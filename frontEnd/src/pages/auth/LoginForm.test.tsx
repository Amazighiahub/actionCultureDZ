/**
 * Tests pour la validation du formulaire LoginForm
 * Tests unitaires de la logique de validation
 */
import { describe, it, expect } from 'vitest';

// Test de la logique de validation email
const validateEmail = (email: string): string | null => {
  if (!email) {
    return "L'email est requis";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email invalide';
  }
  return null;
};

// Test de la logique de validation mot de passe
const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Le mot de passe est requis';
  }
  return null;
};

// Test de la validation complète du formulaire
const validateLoginForm = (data: { email: string; password: string }): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;
  
  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;
  
  return errors;
};

describe('LoginForm - Validation', () => {
  describe('validateEmail', () => {
    it('retourne une erreur si email est vide', () => {
      expect(validateEmail('')).toBe("L'email est requis");
    });

    it('retourne une erreur si email est invalide', () => {
      expect(validateEmail('email-invalide')).toBe('Email invalide');
      expect(validateEmail('test@')).toBe('Email invalide');
      expect(validateEmail('@test.com')).toBe('Email invalide');
    });

    it('retourne null si email est valide', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@domain.org')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('retourne une erreur si mot de passe est vide', () => {
      expect(validatePassword('')).toBe('Le mot de passe est requis');
    });

    it('retourne null si mot de passe est fourni', () => {
      expect(validatePassword('password123')).toBeNull();
      expect(validatePassword('a')).toBeNull();
    });
  });

  describe('validateLoginForm', () => {
    it('retourne des erreurs pour formulaire vide', () => {
      const errors = validateLoginForm({ email: '', password: '' });
      expect(errors.email).toBe("L'email est requis");
      expect(errors.password).toBe('Le mot de passe est requis');
    });

    it('retourne erreur email invalide', () => {
      const errors = validateLoginForm({ email: 'invalid', password: 'pass123' });
      expect(errors.email).toBe('Email invalide');
      expect(errors.password).toBeUndefined();
    });

    it('retourne objet vide si formulaire valide', () => {
      const errors = validateLoginForm({ email: 'test@example.com', password: 'password123' });
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});
