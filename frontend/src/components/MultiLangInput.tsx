// components/MultiLangInput.tsx
// ⚡ Composant de saisie multilingue pour les formulaires

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Types
interface TranslatableValue {
  fr?: string;
  ar?: string;
  en?: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
  [key: string]: string | undefined;
}

interface Language {
  code: string;
  label: string;
  dir: 'ltr' | 'rtl';
  flag?: string;
}

interface MultiLangInputProps {
  /** Nom du champ (pour le formulaire) */
  name: string;
  /** Label du champ */
  label: string;
  /** Valeur actuelle (objet JSON avec les traductions) */
  value: TranslatableValue;
  /** Callback appelé quand la valeur change */
  onChange: (value: TranslatableValue) => void;
  /** Type de champ: input ou textarea */
  type?: 'input' | 'textarea';
  /** Champ requis? */
  required?: boolean;
  /** Langues requises */
  requiredLanguages?: string[];
  /** Placeholder */
  placeholder?: string;
  /** Nombre de lignes pour textarea */
  rows?: number;
  /** Classes CSS additionnelles */
  className?: string;
  /** Désactivé? */
  disabled?: boolean;
  /** Erreurs de validation */
  errors?: Record<string, string>;
}

// Langues disponibles
const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', dir: 'rtl', flag: '🇩🇿' },
  { code: 'en', label: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'tz-ltn', label: 'Tamaziɣt', dir: 'ltr', flag: 'ⵣ' },
  { code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr', flag: 'ⵣ' },
];

/**
 * Composant de saisie multilingue
 * Permet de saisir du texte dans plusieurs langues
 */
export const MultiLangInput: React.FC<MultiLangInputProps> = ({
  name,
  label,
  value = {},
  onChange,
  type = 'input',
  required = false,
  requiredLanguages = ['fr'],
  placeholder,
  rows = 3,
  className = '',
  disabled = false,
  errors = {},
}) => {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<string>('fr');

  // Gérer le changement de valeur pour une langue
  const handleChange = useCallback((langCode: string, newValue: string) => {
    const updatedValue = {
      ...value,
      [langCode]: newValue,
    };
    onChange(updatedValue);
  }, [value, onChange]);

  // Obtenir la langue active
  const activeLanguage = AVAILABLE_LANGUAGES.find(l => l.code === activeLang) || AVAILABLE_LANGUAGES[0];

  return (
    <div className={`multi-lang-input ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Onglets de langue */}
      <div className="flex border-b border-gray-200 mb-2">
        {AVAILABLE_LANGUAGES.map((lang) => {
          const hasValue = !!value[lang.code];
          const isRequired = requiredLanguages.includes(lang.code);
          const hasError = errors[lang.code];
          
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveLang(lang.code)}
              className={`
                px-3 py-2 text-sm font-medium border-b-2 transition-colors
                ${activeLang === lang.code 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                ${hasError ? 'text-red-500' : ''}
              `}
            >
              <span className="mr-1">{lang.flag}</span>
              <span>{lang.label}</span>
              {isRequired && !hasValue && (
                <span className="ml-1 text-red-500">•</span>
              )}
              {hasValue && (
                <span className="ml-1 text-green-500">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Champ de saisie */}
      <div dir={activeLanguage.dir}>
        {type === 'textarea' ? (
          <textarea
            name={`${name}.${activeLang}`}
            value={value[activeLang] || ''}
            onChange={(e) => handleChange(activeLang, e.target.value)}
            placeholder={placeholder || t('common.enterText', { lang: activeLanguage.label })}
            rows={rows}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm
              focus:ring-blue-500 focus:border-blue-500
              ${activeLanguage.dir === 'rtl' ? 'text-right' : 'text-left'}
              ${errors[activeLang] ? 'border-red-500' : 'border-gray-300'}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            `}
          />
        ) : (
          <input
            type="text"
            name={`${name}.${activeLang}`}
            value={value[activeLang] || ''}
            onChange={(e) => handleChange(activeLang, e.target.value)}
            placeholder={placeholder || t('common.enterText', { lang: activeLanguage.label })}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm
              focus:ring-blue-500 focus:border-blue-500
              ${activeLanguage.dir === 'rtl' ? 'text-right' : 'text-left'}
              ${errors[activeLang] ? 'border-red-500' : 'border-gray-300'}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            `}
          />
        )}
      </div>

      {/* Message d'erreur */}
      {errors[activeLang] && (
        <p className="mt-1 text-sm text-red-500">{errors[activeLang]}</p>
      )}

      {/* Indicateur de progression */}
      <div className="mt-2 flex items-center text-xs text-gray-500">
        <span>
          {Object.values(value).filter(v => v).length} / {AVAILABLE_LANGUAGES.length} {t('common.languages')}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// EXEMPLE D'UTILISATION DANS UN FORMULAIRE
// ============================================================================

/*
import { MultiLangInput } from '@/components/MultiLangInput';
import { useState } from 'react';

const CategorieForm = () => {
  const [formData, setFormData] = useState({
    nom: { fr: '', ar: '', en: '' },
    description: { fr: '', ar: '', en: '' },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Envoyer au backend
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <MultiLangInput
        name="nom"
        label="Nom de la catégorie"
        value={formData.nom}
        onChange={(value) => setFormData({ ...formData, nom: value })}
        required
        requiredLanguages={['fr', 'ar']}
      />

      <MultiLangInput
        name="description"
        label="Description"
        value={formData.description}
        onChange={(value) => setFormData({ ...formData, description: value })}
        type="textarea"
        rows={4}
      />

      <button type="submit">
        Enregistrer
      </button>
    </form>
  );
};
*/

export default MultiLangInput;
