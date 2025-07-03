import React from 'react';
import { Globe, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  fontClass?: string;
}

const languages: Language[] = [
  { 
    code: 'ar', 
    name: 'Arabic', 
    nativeName: 'العربية', 
    flag: '🇩🇿', 
    dir: 'rtl',
    fontClass: 'font-arabic'
  },
  { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français', 
    flag: '🇫🇷', 
    dir: 'ltr' 
  },
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English', 
    flag: '🇬🇧', 
    dir: 'ltr' 
  },
  { 
    code: 'tz-ltn', 
    name: 'Tamazight (Latin)', 
    nativeName: 'Tamaziɣt', 
    flag: 'ⵣ', 
    dir: 'ltr' 
  },
  { 
    code: 'tz-tfng', 
    name: 'Tamazight (Tifinagh)', 
    nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', 
    flag: '⵿', 
    dir: 'ltr',
    fontClass: 'tifinagh-font'
  },
];

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'full' | 'minimal';
  align?: 'start' | 'center' | 'end';
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'default',
  align = 'end',
  showFlag = true,
  showNativeName = true,
  className,
}) => {
  const { i18n } = useTranslation();
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const isRTL = currentLanguage.dir === 'rtl';

  const handleLanguageChange = async (langCode: string) => {
    try {
      await i18n.changeLanguage(langCode);
      
      // Trouver les détails de la nouvelle langue
      const newLang = languages.find(lang => lang.code === langCode);
      if (newLang) {
        // Mettre à jour la direction et la langue du document
        document.documentElement.dir = newLang.dir;
        document.documentElement.lang = langCode;
        
        // Gérer les classes de police
        document.documentElement.classList.remove('font-arabic', 'tifinagh-font');
        if (newLang.fontClass) {
          document.documentElement.classList.add(newLang.fontClass);
        }
        
        // Déclencher un événement personnalisé pour notifier d'autres composants
        window.dispatchEvent(new CustomEvent('languageChanged', { 
          detail: { language: langCode, direction: newLang.dir } 
        }));
      }
      
      // Sauvegarder dans le localStorage
      localStorage.setItem('i18nextLng', langCode);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const renderTrigger = () => {
    const baseClasses = cn(
      "inline-flex items-center justify-center",
      className
    );

    switch (variant) {
      case 'minimal':
        return (
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(baseClasses, "h-8 w-8")}
            aria-label="Change language"
          >
            <Languages className="h-4 w-4" />
          </Button>
        );
      
      case 'compact':
        return (
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(baseClasses, "h-8 px-2 gap-1")}
          >
            {showFlag && <span className="text-lg leading-none">{currentLanguage.flag}</span>}
            <span className="text-xs font-medium">{currentLanguage.code.toUpperCase()}</span>
          </Button>
        );
      
      case 'full':
        return (
          <Button 
            variant="outline" 
            size="default" 
            className={cn(baseClasses, "gap-2", currentLanguage.fontClass)}
          >
            <Globe className="h-4 w-4" />
            {showFlag && <span className="text-lg leading-none">{currentLanguage.flag}</span>}
            <span className="hidden sm:inline">
              {showNativeName ? currentLanguage.nativeName : currentLanguage.name}
            </span>
          </Button>
        );
      
      default:
        return (
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(baseClasses, "gap-2", currentLanguage.fontClass)}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">
              {showNativeName ? currentLanguage.nativeName : currentLanguage.name}
            </span>
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
          Select Language / Choisir la langue
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "cursor-pointer",
              i18n.language === lang.code && "bg-accent",
              lang.fontClass
            )}
          >
            <div className={cn(
              "flex items-center w-full gap-3",
              lang.dir === 'rtl' && "flex-row-reverse"
            )}>
              {showFlag && (
                <span className="text-lg leading-none flex-shrink-0">
                  {lang.flag}
                </span>
              )}
              <div className={cn(
                "flex-1 min-w-0",
                lang.dir === 'rtl' && "text-right"
              )}>
                {showNativeName ? (
                  <div>
                    <div className="font-medium truncate">{lang.nativeName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {lang.name}
                    </div>
                  </div>
                ) : (
                  <span className="truncate">{lang.name}</span>
                )}
              </div>
              {i18n.language === lang.code && (
                <span className="text-primary flex-shrink-0">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Export par défaut pour la compatibilité
export default LanguageSwitcher;