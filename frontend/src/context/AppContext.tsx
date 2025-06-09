// src/contexts/AppContext.tsx - Contexte global de l'application (CORRIGÉ)
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMetadata } from '../hooks/useMetadata';
import { useNotifications } from '../components/UI'; // ✅ CORRIGÉ: Import correct

interface AppState {
  isLoading: boolean;
  isInitialized: boolean;
  theme: 'light' | 'dark';
  language: 'fr' | 'ar' | 'ber';
  sidebarOpen: boolean;
  lastActivity: Date;
  connectionStatus: 'online' | 'offline';
  // Ajout d'états utiles
  searchQuery: string;
  filters: Record<string, any>;
  viewPreferences: {
    cardsPerPage: number;
    defaultView: 'grid' | 'list';
  };
}

type AppAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; payload: 'fr' | 'ar' | 'ber' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'UPDATE_ACTIVITY' }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'online' | 'offline' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: Record<string, any> }
  | { type: 'SET_VIEW_PREFERENCES'; payload: Partial<AppState['viewPreferences']> };

const initialState: AppState = {
  isLoading: true,
  isInitialized: false,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light', // ✅ Persistance
  language: (localStorage.getItem('language') as 'fr' | 'ar' | 'ber') || 'fr', // ✅ Persistance
  sidebarOpen: false,
  lastActivity: new Date(),
  connectionStatus: navigator.onLine ? 'online' : 'offline', // ✅ État initial correct
  searchQuery: '',
  filters: {},
  viewPreferences: {
    cardsPerPage: 12,
    defaultView: 'grid'
  }
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'SET_THEME':
      // ✅ Persistance automatique
      localStorage.setItem('theme', action.payload);
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      // ✅ Persistance automatique
      localStorage.setItem('language', action.payload);
      return { ...state, language: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'UPDATE_ACTIVITY':
      return { ...state, lastActivity: new Date() };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'SET_VIEW_PREFERENCES':
      return { 
        ...state, 
        viewPreferences: { ...state.viewPreferences, ...action.payload }
      };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Actions helpers
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'fr' | 'ar' | 'ber') => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  updateActivity: () => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  setViewPreferences: (preferences: Partial<AppState['viewPreferences']>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // ✅ CORRIGÉ: Import et utilisation correcte des hooks
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // ✅ Propriété correcte
  const { options: metadata, isLoading: metadataLoading } = useMetadata(); // ✅ Propriétés correctes
  const { addNotification } = useNotifications(); // ✅ Import correct

  // Actions helpers
  const setLoading = (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading });
  const setTheme = (theme: 'light' | 'dark') => dispatch({ type: 'SET_THEME', payload: theme });
  const setLanguage = (language: 'fr' | 'ar' | 'ber') => dispatch({ type: 'SET_LANGUAGE', payload: language });
  const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' });
  const setSidebar = (open: boolean) => dispatch({ type: 'SET_SIDEBAR', payload: open });
  const updateActivity = () => dispatch({ type: 'UPDATE_ACTIVITY' });
  const setSearchQuery = (query: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  const setFilters = (filters: Record<string, any>) => dispatch({ type: 'SET_FILTERS', payload: filters });
  const setViewPreferences = (preferences: Partial<AppState['viewPreferences']>) => 
    dispatch({ type: 'SET_VIEW_PREFERENCES', payload: preferences });

  // ✅ CORRIGÉ: Initialisation simplifiée sans fonction inexistante
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // ✅ Attendre que les métadonnées soient chargées (automatiquement par le hook)
        // Pas besoin d'appeler fetchAllMetadata qui n'existe pas
        
        // Simulation d'autres initialisations
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        
        addNotification({
          type: 'success',
          title: 'Application initialisée',
          message: 'Bienvenue sur Action Culture !',
          duration: 3000
        });
        
      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        addNotification({
          type: 'error',
          title: 'Erreur d\'initialisation',
          message: 'Une erreur est survenue lors du chargement de l\'application.'
        });
      } finally {
        setLoading(false);
      }
    };

    // ✅ Initialiser seulement si pas encore fait et que les hooks sont prêts
    if (!state.isInitialized && !authLoading && !metadataLoading) {
      initializeApp();
    }
  }, [state.isInitialized, authLoading, metadataLoading, addNotification]);

  // ✅ Surveillance de la connexion avec gestion d'erreur
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'online' });
      addNotification({
        type: 'success',
        title: 'Connexion rétablie',
        message: 'Vous êtes de nouveau en ligne.',
        duration: 3000
      });
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });
      addNotification({
        type: 'warning',
        title: 'Connexion perdue',
        message: 'Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.',
        duration: 0 // Persiste jusqu'au retour en ligne
      });
    };

    // ✅ Vérification de support
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [addNotification]);

  // ✅ Surveillance de l'activité utilisateur avec throttling
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    let timeout: NodeJS.Timeout;
    
    const handleActivity = () => {
      // ✅ Throttling pour éviter trop d'updates
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        updateActivity();
      }, 1000); // Max 1 update par seconde
    };

    if (typeof document !== 'undefined') {
      events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
      });

      return () => {
        clearTimeout(timeout);
        events.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
      };
    }
  }, []);

  // ✅ Gestion du thème avec support SSR
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
      
      // ✅ Mise à jour de la meta theme-color pour mobile
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', state.theme === 'dark' ? '#2D5A5A' : '#F5F5DC');
      }
    }
  }, [state.theme]);

  // ✅ Gestion de la langue avec support RTL
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = state.language;
      document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
      
      // ✅ Classe CSS pour les styles spécifiques à la langue
      document.documentElement.className = document.documentElement.className
        .replace(/lang-\w+/g, '') + ` lang-${state.language}`;
    }
  }, [state.language]);

  // ✅ Gestion automatique de la sidebar sur mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        // Auto-fermer sur desktop si était ouvert sur mobile
        if (state.sidebarOpen) {
          setSidebar(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [state.sidebarOpen]);

  // ✅ Nettoyage automatique des filtres lors du changement de route
  useEffect(() => {
    const handleRouteChange = () => {
      setFilters({});
      setSearchQuery('');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    setLoading,
    setTheme,
    setLanguage,
    toggleSidebar,
    setSidebar,
    updateActivity,
    setSearchQuery,
    setFilters,
    setViewPreferences
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// ✅ Hook utilitaire pour les préférences thème
export const useTheme = () => {
  const { state, setTheme } = useApp();
  
  const toggleTheme = () => {
    setTheme(state.theme === 'light' ? 'dark' : 'light');
  };
  
  return {
    theme: state.theme,
    setTheme,
    toggleTheme,
    isDark: state.theme === 'dark'
  };
};

// ✅ Hook utilitaire pour la connexion
export const useConnectionStatus = () => {
  const { state } = useApp();
  
  return {
    isOnline: state.connectionStatus === 'online',
    isOffline: state.connectionStatus === 'offline',
    connectionStatus: state.connectionStatus
  };
};

// ✅ Hook utilitaire pour les préférences d'affichage
export const useViewPreferences = () => {
  const { state, setViewPreferences } = useApp();
  
  return {
    viewPreferences: state.viewPreferences,
    setViewPreferences,
    cardsPerPage: state.viewPreferences.cardsPerPage,
    defaultView: state.viewPreferences.defaultView
  };
};