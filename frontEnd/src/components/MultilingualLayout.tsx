// components/MultilingualLayout.tsx
// Layout principal avec support multilingue complet

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import LanguageSelector from './LanguageSelector';
import { LANGUAGE_DIRECTIONS, type SupportedLanguage } from '@/types/common/multilingual.types';

interface MultilingualLayoutProps {
  children: React.ReactNode;
  /** Forcer une direction spécifique */
  dir?: 'ltr' | 'rtl';
  /** Classe CSS additionnelle */
  className?: string;
  /** Afficher le sélecteur de langue */
  showLanguageSelector?: boolean;
  /** Position du sélecteur de langue */
  languageSelectorPosition?: 'header' | 'sidebar' | 'floating';
  /** Titre de la page (multilingue) */
  title?: Record<SupportedLanguage, string> | string;
  /** Description de la page (multilingue) */
  description?: Record<SupportedLanguage, string> | string;
  /** Mots-clés (multilingue) */
  keywords?: Record<SupportedLanguage, string> | string;
}

export const MultilingualLayout: React.FC<MultilingualLayoutProps> = ({
  children,
  dir,
  className = '',
  showLanguageSelector = true,
  languageSelectorPosition = 'header',
  title,
  description,
  keywords
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  // Déterminer la direction du texte
  const textDirection = dir || LANGUAGE_DIRECTIONS[currentLang] || 'ltr';

  // Extraire les métadonnées multilingues
  const getTitle = () => {
    if (!title) return '';
    if (typeof title === 'string') return title;
    return title[currentLang] || title.fr || title.ar || title.en || '';
  };

  const getDescription = () => {
    if (!description) return '';
    if (typeof description === 'string') return description;
    return description[currentLang] || description.fr || description.ar || description.en || '';
  };

  const getKeywords = () => {
    if (!keywords) return '';
    if (typeof keywords === 'string') return keywords;
    return keywords[currentLang] || keywords.fr || keywords.ar || keywords.en || '';
  };

  // Mettre à jour la direction du document
  useEffect(() => {
    document.documentElement.dir = textDirection;
    document.documentElement.lang = currentLang;
    
    // Ajouter des classes CSS pour la direction
    document.body.classList.remove('ltr', 'rtl');
    document.body.classList.add(textDirection);
    
    return () => {
      document.body.classList.remove('ltr', 'rtl');
    };
  }, [textDirection, currentLang]);

  // Mettre à jour le titre du document
  useEffect(() => {
    const pageTitle = getTitle();
    if (pageTitle) {
      document.title = pageTitle;
    }
  }, [title, currentLang]);

  const renderLanguageSelector = () => {
    if (!showLanguageSelector) return null;

    switch (languageSelectorPosition) {
      case 'header':
        return (
          <header className="multilingual-header">
            <LanguageSelector variant="compact" />
          </header>
        );
      case 'sidebar':
        return (
          <aside className="multilingual-sidebar">
            <LanguageSelector variant="default" />
          </aside>
        );
      case 'floating':
        return (
          <div className="fixed top-4 right-4 z-50 multilingual-floating">
            <LanguageSelector variant="flag-only" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={cn(
        'multilingual-layout',
        `direction-${textDirection}`,
        `lang-${currentLang}`,
        className
      )}
      dir={textDirection}
      lang={currentLang}
    >
        {renderLanguageSelector()}
        
        <main className="multilingual-main">
          {children}
        </main>

        {/* Footer avec informations multilingues */}
        <footer className="multilingual-footer">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-muted-foreground">
                © 2024 Écho Algérie - {currentLang === 'fr' ? 'Tous droits réservés' : 
                                 currentLang === 'ar' ? 'جميع الحقوق محفوظة' :
                                 currentLang === 'en' ? 'All rights reserved' :
                                 currentLang === 'tz-ltn' ? 'Tikkal n warrac' :
                                 'ⵜⵉⴽⴽⴰⵍ ⵏ ⵡⴰⵔⴰⵛ'}
              </div>
              
              {showLanguageSelector && (
                <div className="mt-4 md:mt-0">
                  <LanguageSelector variant="compact" showLabel={false} />
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MultilingualLayout;
