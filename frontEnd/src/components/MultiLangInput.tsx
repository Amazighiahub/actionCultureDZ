// components/MultiLangInput.tsx
// ⚡ Composant de saisie multilingue pour les formulaires

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/Utils';

// Import dynamique pour éviter les erreurs de chargement
import { KeyboardHelper } from '@/utils/keyboardHelper';

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
  requiredLanguages = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'],
  placeholder,
  rows = 3,
  className = '',
  disabled = false,
  errors = {},
}) => {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<string>('fr');
  const keyboardHelpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // État pour détecter les claviers tamazight
  const [keyboardStatus, setKeyboardStatus] = useState<{ tifinagh: boolean; latin: boolean; any: boolean }>({
    tifinagh: false,
    latin: false,
    any: false
  });
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Détecter les claviers tamazight au montage
  useEffect(() => {
    const detectKeyboard = () => {
      try {
        // Vérifier si KeyboardHelper est disponible
        if (KeyboardHelper && typeof KeyboardHelper.detectTamazightKeyboard === 'function') {
          const detected = KeyboardHelper.detectTamazightKeyboard();
          setKeyboardStatus(detected);
        } else {
          console.warn('KeyboardHelper non disponible');
          setKeyboardStatus({ tifinagh: false, latin: false, any: false });
        }
      } catch (error) {
        console.error('Erreur lors de la détection du clavier:', error);
        // Valeurs par défaut en cas d'erreur
        setKeyboardStatus({ tifinagh: false, latin: false, any: false });
      }
    };

    // Exécuter la détection après le montage
    const timer = setTimeout(detectKeyboard, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Cleanup keyboard help timer on unmount
  useEffect(() => {
    return () => {
      if (keyboardHelpTimerRef.current) clearTimeout(keyboardHelpTimerRef.current);
    };
  }, []);

  // Gérer le changement de langue active avec adaptation du clavier
  const handleLanguageChange = useCallback((langCode: string) => {
    setActiveLang(langCode);

    // Afficher l'aide pour le tamazight si nécessaire
    if (
      (langCode === 'tz-tfng' && !keyboardStatus.tifinagh) ||
      (langCode === 'tz-ltn' && !keyboardStatus.latin)
    ) {
      // Clear previous timer to avoid stacking
      if (keyboardHelpTimerRef.current) clearTimeout(keyboardHelpTimerRef.current);
      setShowKeyboardHelp(true);
      keyboardHelpTimerRef.current = setTimeout(() => setShowKeyboardHelp(false), 5000);
    }
  }, [keyboardStatus]);

  return (
    <div className={`multi-lang-input ${className}`}>
      {/* Label */}
      <Label className="mb-1">
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </Label>

      {/* Onglets de langue */}
      <div className="flex flex-wrap border-b border-border mb-2">
        {AVAILABLE_LANGUAGES.map((lang) => {
          const hasValue = !!value[lang.code]?.trim();
          const isRequired = requiredLanguages.includes(lang.code);
          const hasError = errors[lang.code];

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                activeLang === lang.code
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                hasError && 'text-destructive'
              )}
            >
              <span className="me-1">{lang.flag}</span>
              <span>{lang.label}</span>
              {isRequired && !hasValue && (
                <span className="ms-1 text-destructive">•</span>
              )}
              {hasValue && (
                <span className="ms-1 text-primary">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Aide clavier tamazight */}
      {showKeyboardHelp && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <span>⚠️</span>
            <span>
              {activeLang === 'tz-tfng' ? t('multilang.keyboardTifinaghNotDetected', 'Tifinagh keyboard not detected') : t('multilang.keyboardTamazightNotDetected', 'Tamazight Latin keyboard not detected')}
            </span>
          </div>
          <p className="mt-1 text-amber-700">
            {activeLang === 'tz-tfng' 
              ? t('multilang.installTifinagh', 'Install Tifinagh keyboard from your device settings')
              : t('multilang.installTamazight', 'Install Tamazight Latin keyboard from your device settings')
            }
          </p>
          <div className="mt-2 text-amber-600">
            <details className="cursor-pointer">
              <summary className="font-medium">{t('multilang.seeInstructions', 'See instructions')}</summary>
              <div className="mt-1 space-y-1">
                {KeyboardHelper && KeyboardHelper.getInstallationGuide && 
                  KeyboardHelper.getInstallationGuide().slice(0, 2).map((guide: any, index: number) => (
                    <div key={index}>
                      <strong>{guide.platform}:</strong>
                      <ul className="ml-4 list-disc text-xs">
                        {guide.steps.map((step: any, stepIndex: number) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                }
                {!KeyboardHelper && (
                  <div>
                    <strong>{t('multilang.generalInstructions', 'General instructions')}:</strong>
                    <ul className="ml-4 list-disc text-xs">
                      <li>{t('multilang.installKeyboard', 'Install a Tamazight keyboard from your device settings')}</li>
                      <li>{t('multilang.searchStore', 'Search for "Tifinagh" or "Tamazight Latin" in your store')}</li>
                      <li>{t('multilang.activateKeyboard', 'Activate the keyboard in language settings')}</li>
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Champ de saisie */}
      <div dir={activeLanguage.dir}>
        {type === 'textarea' ? (
          <Textarea
            id={`${name}-${activeLang}`}
            name={`${name}.${activeLang}`}
            value={value[activeLang] || ''}
            onChange={(e) => handleChange(activeLang, e.target.value)}
            placeholder={placeholder || t('common.enterText', { lang: activeLanguage.label })}
            rows={rows}
            disabled={disabled}
            lang={activeLang === 'ar' ? 'ar' : activeLang === 'tz-tfng' ? 'ber' : activeLang === 'tz-ltn' ? 'ber-Latn' : activeLang}
            spellCheck={activeLang === 'fr' || activeLang === 'en'}
            aria-invalid={!!errors[activeLang] || undefined}
            aria-describedby={errors[activeLang] ? `${name}-${activeLang}-error` : undefined}
            className={cn(
              activeLanguage.dir === 'rtl' && 'text-right',
              errors[activeLang] && 'border-destructive'
            )}
          />
        ) : (
          <Input
            type="text"
            id={`${name}-${activeLang}`}
            name={`${name}.${activeLang}`}
            value={value[activeLang] || ''}
            onChange={(e) => handleChange(activeLang, e.target.value)}
            placeholder={placeholder || t('common.enterText', { lang: activeLanguage.label })}
            disabled={disabled}
            lang={activeLang === 'ar' ? 'ar' : activeLang === 'tz-tfng' ? 'ber' : activeLang === 'tz-ltn' ? 'ber-Latn' : activeLang}
            autoCapitalize={activeLang === 'ar' ? 'none' : 'sentences'}
            autoComplete={activeLang === 'ar' ? 'off' : 'on'}
            spellCheck={activeLang === 'fr' || activeLang === 'en'}
            aria-invalid={!!errors[activeLang] || undefined}
            aria-describedby={errors[activeLang] ? `${name}-${activeLang}-error` : undefined}
            className={cn(
              activeLanguage.dir === 'rtl' && 'text-right',
              errors[activeLang] && 'border-destructive'
            )}
          />
        )}
      </div>

      {/* Message d'erreur */}
      {errors[activeLang] && (
        <p id={`${name}-${activeLang}-error`} role="alert" className="mt-1 text-sm text-destructive">{errors[activeLang]}</p>
      )}

      {/* Indicateur de progression */}
      <div className="mt-2 flex items-center text-xs text-muted-foreground">
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
import { useTranslation } from 'react-i18next';

const CategorieForm = () => {
  const { t } = useTranslation();
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
        label={t('category.form.name')}
        value={formData.nom}
        onChange={(value) => setFormData({ ...formData, nom: value })}
        required
        requiredLanguages={['fr']}
      />

      <MultiLangInput
        name="description"
        label={t('common.description')}
        value={formData.description}
        onChange={(value) => setFormData({ ...formData, description: value })}
        type="textarea"
        rows={4}
      />

      <button type="submit">
        {t('common.save')}
      </button>
    </form>
  );
};
*/

export default MultiLangInput;
