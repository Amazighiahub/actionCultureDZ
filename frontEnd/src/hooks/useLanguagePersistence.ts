// hooks/useLanguagePersistence.ts
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook personnalisé pour gérer la persistance de la langue
 * lors des changements d'authentification
 */
export const useLanguagePersistence = () => {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  // Clé spéciale pour stocker la langue préférée de l'utilisateur
  const USER_LANG_KEY = 'user_preferred_language';
  
  useEffect(() => {
    // Sauvegarder la langue actuelle comme préférence utilisateur
    const saveUserLanguage = () => {
      const currentLang = i18n.language;
      if (currentLang) {
        try { localStorage.setItem(USER_LANG_KEY, currentLang); } catch { /* storage unavailable */ }
      }
    };

    // Restaurer la langue préférée de l'utilisateur
    const restoreUserLanguage = () => {
      let savedLang: string | null = null;
      try { savedLang = localStorage.getItem(USER_LANG_KEY); } catch { /* storage unavailable */ }
      const currentLang = i18n.language;

      if (savedLang && savedLang !== currentLang) {
        i18n.changeLanguage(savedLang);
      }
    };
    
    // Écouter les changements de langue
    i18n.on('languageChanged', saveUserLanguage);
    
    // Restaurer la langue au montage
    restoreUserLanguage();
    
    // Cleanup
    return () => {
      i18n.off('languageChanged', saveUserLanguage);
    };
  }, [i18n]);
  
  // Fonction pour préserver la langue lors du logout
  const preserveLanguageOnLogout = () => {
    const currentLang = i18n.language;
    if (currentLang) {
      try { sessionStorage.setItem('logout_language', currentLang); } catch { /* storage unavailable */ }
    }
  };

  // Fonction pour restaurer la langue après le login/logout
  const restoreLanguageAfterAuth = () => {
    try {
      // Vérifier d'abord la langue de logout
      const logoutLang = sessionStorage.getItem('logout_language');
      if (logoutLang) {
        sessionStorage.removeItem('logout_language');
        i18n.changeLanguage(logoutLang);
        return;
      }

      // Sinon, utiliser la préférence utilisateur
      const userLang = localStorage.getItem(USER_LANG_KEY);
      if (userLang && userLang !== i18n.language) {
        i18n.changeLanguage(userLang);
      }
    } catch { /* storage unavailable */ }
  };
  
  return {
    preserveLanguageOnLogout,
    restoreLanguageAfterAuth,
  };
};

// Composant pour gérer automatiquement la persistance
export const LanguagePersistenceManager = () => {
  const { restoreLanguageAfterAuth } = useLanguagePersistence();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Restaurer la langue après les changements d'authentification
    restoreLanguageAfterAuth();
  }, [isAuthenticated]);
  
  return null;
};