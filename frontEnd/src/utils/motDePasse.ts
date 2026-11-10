/**
 * Règles du mot de passe, les mêmes que le serveur : 12 caractères au moins, une majuscule, une minuscule,
 * un chiffre et un caractère spécial. Avant, elles étaient recopiées dans l'inscription (deux fois) et
 * dans « nouveau mot de passe » ; la carte « Sécurité » du profil les utilise aussi.
 */
import type { TFunction } from 'i18next';

export type ProblemeMotDePasse = 'vide' | 'longueur' | 'majuscule' | 'minuscule' | 'chiffre' | 'special';

/** Première règle non respectée, ou null si le mot de passe convient */
export function problemeMotDePasse(motDePasse: string | null | undefined): ProblemeMotDePasse | null {
  const m = motDePasse || '';
  if (!m) return 'vide';
  if (m.length < 12) return 'longueur';
  if (!/[A-Z]/.test(m)) return 'majuscule';
  if (!/[a-z]/.test(m)) return 'minuscule';
  if (!/[0-9]/.test(m)) return 'chiffre';
  if (!/[^A-Za-z0-9]/.test(m)) return 'special';
  return null;
}

/** Message à afficher sous le champ (null si le mot de passe convient) */
export function erreurMotDePasse(motDePasse: string | null | undefined, t: TFunction): string | null {
  switch (problemeMotDePasse(motDePasse)) {
    case 'vide': return t('auth.errors.passwordRequired', 'Le mot de passe est requis');
    case 'longueur': return t('auth.errors.passwordMinLength', 'Le mot de passe doit contenir au moins 12 caractères');
    case 'majuscule': return t('auth.errors.passwordNeedUppercase', 'Le mot de passe doit contenir au moins une majuscule');
    case 'minuscule': return t('auth.errors.passwordNeedLowercase', 'Le mot de passe doit contenir au moins une minuscule');
    case 'chiffre': return t('auth.errors.passwordNeedDigit', 'Le mot de passe doit contenir au moins un chiffre');
    case 'special': return t('auth.errors.passwordNeedSpecial', 'Le mot de passe doit contenir au moins un caractère spécial');
    default: return null;
  }
}
