// hooks/useTranslateData.ts
// ⚡ Hook pour traduire les données JSON de la base de données

import { useTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import { getLocalizedText } from '@/utils/getLocalizedText';
import type { TexteMultilingue, TranslatableValue } from '@/types/common/multilingual.types';

interface TranslateDataResult {
  /** Traduit un champ JSON de la BDD */
  td: (field: TexteMultilingue, fallback?: string) => string;
  /** Rend une valeur safe pour JSX (convertit les objets en string) */
  safe: (value: unknown, fallback?: string) => string | number;
  /** Langue actuelle */
  lang: string;
  /** Vérifie si une traduction existe pour la langue actuelle */
  hasTranslation: (field: TranslatableValue | null | undefined) => boolean;
  /** Obtient toutes les traductions disponibles */
  getAllTranslations: (field: TranslatableValue | null | undefined) => TranslatableValue;
  /** Traduit un objet entier (tous ses champs traduisibles) */
  translateObject: <T extends Record<string, unknown>>(obj: T, fields?: string[]) => T;
  /** Traduit un tableau d'objets */
  translateArray: <T extends Record<string, unknown>>(arr: T[], fields?: string[]) => T[];
  /** Direction du texte (ltr ou rtl) */
  dir: 'ltr' | 'rtl';
  /** Vérifie si la langue actuelle est RTL */
  isRTL: boolean;
}

// Liste des champs traduisibles par défaut
const DEFAULT_TRANSLATABLE_FIELDS = [
  'nom',
  'prenom', 
  'titre',
  'description',
  'nom_type',
  'nom_evenement',
  'nom_parcours',
  'nom_specialite',
  'biographie',
  'alt_text',
  'accessibilite'
];

/**
 * Hook pour traduire les données dynamiques de la base de données
 * 
 * @example
 * ```tsx
 * const { td, lang } = useTranslateData();
 * 
 * // Traduire un champ simple
 * <h1>{td(categorie.nom)}</h1>
 * 
 * // Traduire un objet entier
 * const translatedCategorie = translateObject(categorie);
 * ```
 */
export const useTranslateData = (): TranslateDataResult => {
  const { i18n } = useTranslation();
  
  // Langue actuelle
  const lang = i18n.language || 'fr';
  
  // Direction du texte
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  /**
   * Traduit un champ JSON de la base de données, dans l'ordre de getLocalizedText (langue
   * actuelle, autre écriture du tamazight, fr, ar, en, tamazight, première valeur remplie).
   * Retourne TOUJOURS une string (jamais un objet) ; un tableau donne le texte de secours.
   */
  const td = useCallback((field: TexteMultilingue, fallback = ''): string => (
    Array.isArray(field) ? fallback : getLocalizedText(field, lang, fallback)
  ), [lang]);

  /**
   * Rend une valeur safe pour JSX (ne retourne jamais un objet)
   * Utile pour les champs qui peuvent être des objets multilingues ou des valeurs primitives
   */
  const safe = useCallback((value: unknown, fallback: string = ''): string | number => {
    // Null ou undefined
    if (value === null || value === undefined) return fallback;
    // String ou number - safe pour JSX
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    // Boolean
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    // Array - pas safe
    if (Array.isArray(value)) return fallback;
    // Object - lu comme un texte multilingue
    if (typeof value === 'object') return getLocalizedText(value, lang, fallback);
    // Fallback pour autres types
    return String(value) || fallback;
  }, [lang]);

  /**
   * Vérifie si une traduction existe pour la langue actuelle
   */
  const hasTranslation = useCallback((
    field: TranslatableValue | null | undefined
  ): boolean => {
    if (!field || typeof field === 'string') return true;
    return !!field[lang];
  }, [lang]);

  /**
   * Obtient toutes les traductions disponibles pour un champ
   */
  const getAllTranslations = useCallback((
    field: TranslatableValue | null | undefined
  ): TranslatableValue => {
    if (!field) return {};
    if (typeof field === 'string') return { fr: field };
    return field;
  }, []);

  /**
   * Traduit tous les champs traduisibles d'un objet
   */
  const translateObject = useCallback(<T extends Record<string, unknown>>(
    obj: T, 
    fields: string[] = DEFAULT_TRANSLATABLE_FIELDS
  ): T => {
    if (!obj) return obj;
    
    const result = { ...obj };
    
    fields.forEach(field => {
      if (result[field] && typeof result[field] === 'object' && !Array.isArray(result[field])) {
        (result as Record<string, unknown>)[field] = td(result[field] as TranslatableValue);
      }
    });
    
    return result;
  }, [td]);

  /**
   * Traduit un tableau d'objets
   */
  const translateArray = useCallback(<T extends Record<string, unknown>>(
    arr: T[], 
    fields: string[] = DEFAULT_TRANSLATABLE_FIELDS
  ): T[] => {
    if (!arr || !Array.isArray(arr)) return arr;
    return arr.map(item => translateObject(item, fields));
  }, [translateObject]);

  return useMemo(() => ({
    td,
    safe,
    lang,
    hasTranslation,
    getAllTranslations,
    translateObject,
    translateArray,
    dir,
    isRTL
  }), [td, safe, lang, hasTranslation, getAllTranslations, translateObject, translateArray, dir, isRTL]);
};

// Export par défaut
export default useTranslateData;

// ============================================================================
// EXEMPLES D'UTILISATION
// ============================================================================

/*
// 1. Traduction simple d'un champ
import { useTranslateData } from '@/hooks/useTranslateData';

const CategorieCard = ({ categorie }) => {
  const { td } = useTranslateData();
  
  return (
    <div>
      <h2>{td(categorie.nom)}</h2>
      <p>{td(categorie.description)}</p>
    </div>
  );
};

// 2. Avec useTranslation pour les textes statiques
import { useTranslation } from 'react-i18next';
import { useTranslateData } from '@/hooks/useTranslateData';

const OeuvreCard = ({ oeuvre }) => {
  const { t } = useTranslation();      // Textes statiques (interface)
  const { td } = useTranslateData();   // Données BDD
  
  return (
    <div>
      <span>{t('oeuvre.titre')}</span>  // "Titre" ou "العنوان"
      <h1>{td(oeuvre.titre)}</h1>        // "Le Petit Prince" ou "الأمير الصغير"
      <p>{td(oeuvre.description)}</p>
    </div>
  );
};

// 3. Traduction d'un tableau complet
const CategoriesList = ({ categories }) => {
  const { translateArray } = useTranslateData();
  
  const translatedCategories = translateArray(categories);
  
  return (
    <ul>
      {translatedCategories.map(cat => (
        <li key={cat.id_categorie}>{cat.nom}</li>  // Déjà traduit !
      ))}
    </ul>
  );
};

// 4. Vérification si traduction disponible
const LanguageWarning = ({ field }) => {
  const { hasTranslation, lang } = useTranslateData();
  
  if (!hasTranslation(field)) {
    return <span className="warning">Non disponible en {lang}</span>;
  }
  
  return null;
};

// 5. Direction RTL automatique
const TextContainer = ({ children }) => {
  const { dir, isRTL } = useTranslateData();
  
  return (
    <div dir={dir} className={isRTL ? 'text-right' : 'text-left'}>
      {children}
    </div>
  );
};
*/
