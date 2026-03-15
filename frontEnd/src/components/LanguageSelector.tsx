// components/LanguageSelector.tsx
// Selecteur de langue global unifie pour tout le site
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Languages } from 'lucide-react';
import { cn } from '@/lib/Utils';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
  LANGUAGE_DIRECTIONS,
  LANGUAGE_FONT_CLASSES,
  type SupportedLanguage
} from '@/types/common/multilingual.types';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'default' | 'compact' | 'flag-only' | 'minimal';
  align?: 'start' | 'center' | 'end';
  showFlag?: boolean;
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className,
  variant = 'default',
  align = 'end',
  showFlag = true,
  showLabel = true,
}) => {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language || 'fr') as SupportedLanguage;
  const isRTL = LANGUAGE_DIRECTIONS[currentLang] === 'rtl';

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(lang);

      // Mettre a jour la direction et la langue du document
      document.documentElement.dir = LANGUAGE_DIRECTIONS[lang] || 'ltr';
      document.documentElement.lang = lang;

      // Gerer les classes de police (arabe, tifinagh)
      const allFontClasses = Object.values(LANGUAGE_FONT_CLASSES).filter(Boolean) as string[];
      document.documentElement.classList.remove(...allFontClasses);
      const fontClass = LANGUAGE_FONT_CLASSES[lang];
      if (fontClass) {
        document.documentElement.classList.add(fontClass);
      }

      // Notifier les autres composants
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language: lang, direction: LANGUAGE_DIRECTIONS[lang] }
      }));

      localStorage.setItem('i18nextLng', lang);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const currentFlag = LANGUAGE_FLAGS[currentLang] || '🌐';
  const currentLabel = LANGUAGE_LABELS[currentLang] || currentLang;

  const renderTrigger = () => {
    switch (variant) {
      case 'minimal':
        return (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", className)}
            aria-label="Change language"
          >
            <Languages className="h-4 w-4" />
          </Button>
        );

      case 'flag-only':
        return (
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-10 h-10 p-0", className)}
          >
            <span className="text-lg">{currentFlag}</span>
          </Button>
        );

      case 'compact':
        return (
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex items-center gap-1 h-8 px-2", className)}
          >
            {showFlag && <span className="text-sm leading-none">{currentFlag}</span>}
            {showLabel && <span className="text-xs font-medium">{currentLabel}</span>}
          </Button>
        );

      default:
        return (
          <Button
            variant="outline"
            className={cn("flex items-center gap-2", className)}
          >
            <Globe className="h-4 w-4 flex-shrink-0" />
            {showFlag && <span className="text-lg">{currentFlag}</span>}
            {showLabel && (
              <span className="hidden sm:inline font-medium">{currentLabel}</span>
            )}
          </Button>
        );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {renderTrigger()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : align} className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('languageSelector.chooseLanguage', 'Choisir la langue')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={cn(
              "cursor-pointer py-2",
              lang === currentLang && "bg-accent",
            )}
          >
            <div className={cn(
              "flex items-center w-full gap-3",
              LANGUAGE_DIRECTIONS[lang] === 'rtl' && "flex-row-reverse"
            )}>
              <span className="text-sm leading-none flex-shrink-0">
                {LANGUAGE_FLAGS[lang]}
              </span>
              <div className={cn(
                "flex-1 min-w-0",
                LANGUAGE_DIRECTIONS[lang] === 'rtl' && "text-right"
              )}>
                <div className="font-medium text-sm truncate">{LANGUAGE_LABELS[lang]}</div>
                <div className="text-xs text-muted-foreground">
                  {LANGUAGE_DIRECTIONS[lang] === 'rtl' ? 'RTL' : 'LTR'}
                </div>
              </div>
              {lang === currentLang && (
                <span className="text-primary flex-shrink-0">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
