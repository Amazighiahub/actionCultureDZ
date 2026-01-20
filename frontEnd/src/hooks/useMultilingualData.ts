// hooks/useMultilingualData.ts
// Hook pour gérer les données multilingues dans les composants

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  type SupportedLanguage, 
  getTranslation, 
  createEmptyTranslation,
  setTranslation,
  hasRequiredTranslations 
} from '@/types/common/multilingual.types';

interface UseMultilingualDataOptions {
  /** Langue initiale */
  initialLanguage?: SupportedLanguage;
  /** Sauvegarder automatiquement dans localStorage */
  autoSave?: boolean;
  /** Clé localStorage */
  storageKey?: string;
}

interface UseMultilingualDataReturn<T> {
  /** Données multilingues */
  data: T;
  /** Langue courante */
  currentLanguage: SupportedLanguage;
  /** Mettre à jour une traduction */
  updateTranslation: (field: keyof T, language: SupportedLanguage, value: string) => void;
  /** Mettre à jour toutes les traductions d'un champ */
  updateFieldTranslations: (field: keyof T, translations: Record<SupportedLanguage, string>) => void;
  /** Obtenir une traduction spécifique */
  getTranslation: (field: keyof T, language?: SupportedLanguage) => string;
  /** Obtenir la meilleure traduction disponible */
  getBestTranslation: (field: keyof T) => string;
  /** Vérifier si le champ a des traductions valides */
  hasValidTranslations: (field: keyof T) => boolean;
  /** Réinitialiser un champ */
  resetField: (field: keyof T) => void;
  /** Réinitialiser toutes les données */
  resetAll: () => void;
  /** Changer la langue courante */
  setLanguage: (language: SupportedLanguage) => void;
  /** Obtenir le pourcentage de complétion */
  getCompletionPercentage: () => number;
}

/**
 * Hook pour gérer les données multilingues
 * @param initialData Données initiales
 * @param options Options de configuration
 */
export function useMultilingualData<T extends Record<string, any>>(
  initialData: T,
  options: UseMultilingualDataOptions = {}
): UseMultilingualDataReturn<T> {
  const { i18n } = useTranslation();
  const {
    initialLanguage = i18n.language as SupportedLanguage,
    autoSave = true,
    storageKey = 'multilingual-data'
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(initialLanguage);

  // Charger depuis localStorage au montage
  useEffect(() => {
    if (autoSave && storageKey) {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setData(prevData => ({ ...prevData, ...parsedData }));
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des données multilingues:', error);
      }
    }
  }, [autoSave, storageKey]);

  // Sauvegarder dans localStorage quand les données changent
  useEffect(() => {
    if (autoSave && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des données multilingues:', error);
      }
    }
  }, [data, autoSave, storageKey]);

  // Mettre à jour une traduction spécifique
  const updateTranslation = useCallback((field: keyof T, language: SupportedLanguage, value: string) => {
    setData(prevData => {
      const currentValue = prevData[field];
      let updatedValue;

      if (typeof currentValue === 'object' && currentValue !== null) {
        updatedValue = setTranslation(currentValue, language, value);
      } else {
        // Créer un nouvel objet multilingue
        updatedValue = createEmptyTranslation();
        updatedValue[language] = value;
      }

      return {
        ...prevData,
        [field]: updatedValue
      };
    });
  }, []);

  // Mettre à jour toutes les traductions d'un champ
  const updateFieldTranslations = useCallback((field: keyof T, translations: Record<SupportedLanguage, string>) => {
    setData(prevData => ({
      ...prevData,
      [field]: translations
    }));
  }, []);

  // Obtenir une traduction spécifique
  const getTranslationValue = useCallback((field: keyof T, language?: SupportedLanguage): string => {
    const targetLang = language || currentLanguage;
    const value = data[field];
    return getTranslation(value, targetLang);
  }, [data, currentLanguage]);

  // Obtenir la meilleure traduction disponible
  const getBestTranslation = useCallback((field: keyof T): string => {
    const value = data[field];
    return getTranslation(value, currentLanguage);
  }, [data, currentLanguage]);

  // Vérifier si le champ a des traductions valides
  const hasValidTranslations = useCallback((field: keyof T): boolean => {
    const value = data[field];
    return hasRequiredTranslations(value);
  }, [data]);

  // Réinitialiser un champ
  const resetField = useCallback((field: keyof T) => {
    setData(prevData => ({
      ...prevData,
      [field]: createEmptyTranslation()
    }));
  }, []);

  // Réinitialiser toutes les données
  const resetAll = useCallback(() => {
    const resetData = {} as T;
    Object.keys(initialData).forEach(key => {
      const fieldKey = key as keyof T;
      resetData[fieldKey] = {
        fr: '',
        ar: '',
        en: '',
        'tz-ltn': '',
        'tz-tfng': ''
      } as T[keyof T];
    });
    setData(resetData);
  }, [initialData]);

  // Changer la langue courante
  const setLanguage = useCallback((language: SupportedLanguage) => {
    setCurrentLanguage(language);
    if (autoSave) {
      localStorage.setItem('i18nextLng', language);
    }
  }, [autoSave]);

  // Calculer le pourcentage de complétion
  const getCompletionPercentage = useCallback((): number => {
    const fields = Object.keys(data);
    if (fields.length === 0) return 0;

    let totalTranslations = 0;
    let completedTranslations = 0;

    fields.forEach(field => {
      const value = data[field];
      if (typeof value === 'object' && value !== null) {
        totalTranslations += 5; // 5 langues supportées
        completedTranslations += Object.values(value).filter(v => v && typeof v === 'string' && v.trim()).length;
      }
    });

    return totalTranslations > 0 ? Math.round((completedTranslations / totalTranslations) * 100) : 0;
  }, [data]);

  return {
    data,
    currentLanguage,
    updateTranslation,
    updateFieldTranslations,
    getTranslation: getTranslationValue,
    getBestTranslation,
    hasValidTranslations,
    resetField,
    resetAll,
    setLanguage,
    getCompletionPercentage
  };
}

/**
 * Hook simplifié pour les champs multilingues individuels
 */
export function useMultilingualField(
  initialValue: Record<SupportedLanguage, string> = {
    fr: '',
    ar: '',
    en: '',
    'tz-ltn': '',
    'tz-tfng': ''
  },
  options: UseMultilingualDataOptions = {}
) {
  const { i18n } = useTranslation();
  const currentLang = options.initialLanguage || (i18n.language as SupportedLanguage);

  const [translations, setTranslations] = useState<Record<SupportedLanguage, string>>(initialValue);

  const updateTranslation = useCallback((language: SupportedLanguage, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [language]: value
    }));
  }, []);

  const getTranslation = useCallback((language?: SupportedLanguage): string => {
    const targetLang = language || currentLang;
    return translations[targetLang] || translations.fr || translations.ar || translations.en || '';
  }, [translations, currentLang]);

  const reset = useCallback(() => {
    setTranslations({
      fr: '',
      ar: '',
      en: '',
      'tz-ltn': '',
      'tz-tfng': ''
    });
  }, []);

  const getCompletionPercentage = useCallback((): number => {
    const completed = Object.values(translations).filter(v => v && v.trim()).length;
    return Math.round((completed / 5) * 100);
  }, [translations]);

  return {
    translations,
    currentLanguage: currentLang,
    updateTranslation,
    getTranslation,
    reset,
    getCompletionPercentage
  };
}

export default useMultilingualData;
