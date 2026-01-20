// components/LanguageSelector.tsx
// Sélecteur de langue global pour tout le site
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SUPPORTED_LANGUAGES, 
  LANGUAGE_LABELS, 
  LANGUAGE_FLAGS, 
  LANGUAGE_DIRECTIONS,
  type SupportedLanguage 
} from '@/types/common/multilingual.types';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'default' | 'compact' | 'flag-only';
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'default',
  showLabel = true
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    // Sauvegarder dans localStorage
    localStorage.setItem('i18nextLng', lang);
    // Forcer le rechargement pour appliquer la direction RTL/LTR
    if (LANGUAGE_DIRECTIONS[lang] !== LANGUAGE_DIRECTIONS[currentLang]) {
      window.location.reload();
    }
  };

  const getCurrentLanguageInfo = () => {
    return {
      code: currentLang,
      label: LANGUAGE_LABELS[currentLang] || currentLang,
      flag: LANGUAGE_FLAGS[currentLang] || '🌐',
      direction: LANGUAGE_DIRECTIONS[currentLang] || 'ltr'
    };
  };

  const currentLangInfo = getCurrentLanguageInfo();

  if (variant === 'flag-only') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-10 h-10 p-0", className)}
          >
            <span className="text-lg">{currentLangInfo.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="flex items-center gap-2"
            >
              <span className="text-lg">{LANGUAGE_FLAGS[lang]}</span>
              <span>{LANGUAGE_LABELS[lang]}</span>
              {lang === currentLang && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex items-center gap-2 px-3", className)}
          >
            <span className="text-sm">{currentLangInfo.flag}</span>
            {showLabel && (
              <span className="text-sm font-medium">{currentLangInfo.label}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="flex items-center gap-2"
            >
              <span className="text-sm">{LANGUAGE_FLAGS[lang]}</span>
              <span className="text-sm">{LANGUAGE_LABELS[lang]}</span>
              {lang === currentLang && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", className)}
        >
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentLangInfo.flag}</span>
          {showLabel && (
            <span className="font-medium">{currentLangInfo.label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            Choisir la langue
          </p>
        </div>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className="flex items-center gap-3 py-2"
          >
            <span className="text-lg">{LANGUAGE_FLAGS[lang]}</span>
            <div className="flex-1">
              <div className="font-medium">{LANGUAGE_LABELS[lang]}</div>
              <div className="text-xs text-muted-foreground">
                {LANGUAGE_DIRECTIONS[lang] === 'rtl' ? 'RTL' : 'LTR'}
              </div>
            </div>
            {lang === currentLang && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
