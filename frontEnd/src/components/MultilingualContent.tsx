// components/MultilingualContent.tsx
// Composant pour afficher du contenu multilingue avec fallback automatique

import React from 'react';
import { useTranslation } from 'react-i18next';
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';

interface MultilingualContentProps {
  /** Contenu multilingue (objet ou chaîne) */
  content: Record<string, string> | string | undefined;
  /** Langue cible (optionnel, utilise la langue courante par défaut) */
  targetLanguage?: SupportedLanguage;
  /** Classe CSS additionnelle */
  className?: string;
  /** Tag HTML à utiliser */
  as?: keyof JSX.IntrinsicElements;
  /** Contenu de fallback si aucune traduction trouvée */
  fallback?: string;
  /** Afficher les flags des langues disponibles */
  showLanguageFlags?: boolean;
  /** Mode d'affichage */
  displayMode?: 'single' | 'all' | 'with-fallbacks';
}

export const MultilingualContent: React.FC<MultilingualContentProps> = ({
  content,
  targetLanguage,
  className = '',
  as: Component = 'span',
  fallback = '',
  showLanguageFlags = false,
  displayMode = 'single'
}) => {
  const { i18n } = useTranslation();
  const currentLang = targetLanguage || (i18n.language as SupportedLanguage);

  // Extraire la traduction
  const translation = getTranslation(content, currentLang) || fallback;

  // Mode d'affichage : toutes les langues
  if (displayMode === 'all' && typeof content === 'object') {
    return (
      <div className={`multilingual-content ${className}`}>
        {Object.entries(content).map(([lang, text]) => (
          <div key={lang} className="multilingual-item">
            <span className="language-flag">
              {getLanguageFlag(lang)}
            </span>
            <span className="language-code">{lang}:</span>
            <span className="language-text">{text}</span>
          </div>
        ))}
      </div>
    );
  }

  // Mode d'affichage : avec fallbacks
  if (displayMode === 'with-fallbacks' && typeof content === 'object') {
    const availableLanguages = Object.keys(content).filter(lang => content[lang]);
    
    return (
      <div className={`multilingual-content-with-fallbacks ${className}`}>
        <Component className="primary-translation">
          {translation}
        </Component>
        {availableLanguages.length > 1 && (
          <div className="fallback-languages">
            {availableLanguages
              .filter(lang => lang !== currentLang && content[lang])
              .map(lang => (
                <span key={lang} className="fallback-item">
                  {showLanguageFlags && <span className="language-flag">{getLanguageFlag(lang)}</span>}
                  <span className="fallback-text">{content[lang]}</span>
                </span>
              ))}
          </div>
        )}
      </div>
    );
  }

  // Mode normal : traduction unique
  return (
    <Component className={`multilingual-text ${className}`}>
      {showLanguageFlags && typeof content === 'object' && (
        <span className="language-flag mr-1">
          {getLanguageFlag(currentLang)}
        </span>
      )}
      {translation}
    </Component>
  );
};

// Helper pour obtenir le flag d'une langue
function getLanguageFlag(language: string): string {
  const flags: Record<string, string> = {
    fr: '🇫🇷',
    ar: '🇩🇿',
    en: '🇬🇧',
    'tz-ltn': 'ⵣ',
    'tz-tfng': 'ⵣ'
  };
  return flags[language] || '🌐';
}

// Composant spécialisé pour les titres
export const MultilingualTitle: React.FC<Omit<MultilingualContentProps, 'as'>> = (props) => (
  <MultilingualContent {...props} as="h1" className={`multilingual-title ${props.className}`} />
);

export const MultilingualHeading: React.FC<Omit<MultilingualContentProps, 'as'> & { level?: 2 | 3 | 4 | 5 | 6 }> = ({ 
  level = 2, 
  ...props 
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <MultilingualContent 
      {...props} 
      as={HeadingTag} 
      className={`multilingual-heading multilingual-h${level} ${props.className}`} 
    />
  );
};

// Composant spécialisé pour les descriptions
export const MultilingualDescription: React.FC<Omit<MultilingualContentProps, 'as'>> = (props) => (
  <MultilingualContent {...props} as="p" className={`multilingual-description ${props.className}`} />
);

// Composant pour les textes courts
export const MultilingualText: React.FC<MultilingualContentProps> = (props) => (
  <MultilingualContent {...props} as="span" className={`multilingual-text ${props.className}`} />
);

// Hook pour utiliser le contenu multilingue
export const useMultilingualContent = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  const getMultilingualText = (content: Record<string, string> | string | undefined, fallback = '') => {
    return getTranslation(content, currentLang) || fallback;
  };

  const getAllLanguages = (content: Record<string, string> | string | undefined) => {
    if (typeof content === 'object') {
      return Object.entries(content)
        .filter(([_, text]) => text && text.trim())
        .map(([lang, text]) => ({ language: lang, text, flag: getLanguageFlag(lang) }));
    }
    return [];
  };

  const hasTranslation = (content: Record<string, string> | string | undefined, language?: SupportedLanguage) => {
    const targetLang = language || currentLang;
    if (typeof content === 'object') {
      return !!(content[targetLang] || content.fr || content.ar || content.en);
    }
    return !!content;
  };

  return {
    currentLang,
    getMultilingualText,
    getAllLanguages,
    hasTranslation,
    getLanguageFlag
  };
};

export default MultilingualContent;
