// pages/HomePage.tsx - Version complète avec méthodes spécifiques
import React, { useState, useEffect } from 'react';
import { 
  HiMagnifyingGlass as Search,
  HiGlobeAlt as Globe,
  HiMapPin,
  HiCalendar,
  HiBookOpen,
  HiArrowRight,
  HiUser,
  HiArrowRightOnRectangle,
  HiChevronDown
} from 'react-icons/hi2';
import {
  FaTwitter,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaYoutube
} from 'react-icons/fa';
import MainLayout  from '../components/Layout/MainLayout';
// Import des hooks avec méthode optimisée
import { 
  useHomePageOptimized,
  useGlobalSearch
} from '../hooks/useHomePage';
import { useAuth } from '../hooks/useAuth';
import { Pagination } from '../components/UI/Pagination';
import { FullPageLoader } from '../components/FullPageLoader';
import { Loading } from '../components/UI';

// Import des styles
import styles from '../styles/HomePage.module.css';

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeSection, setActiveSection] = useState<'evenements' | 'patrimoine' | 'oeuvres' | null>(null);
  
  // Hook optimisé pour toutes les données
  const {
    oeuvres: recentOeuvres,
    evenements: upcomingEvenements,
    sites: popularSites,
    stats,
    loading,
    errors,
    isLoading: dataLoading,
    reload
  } = useHomePageOptimized();

  // Hook d'authentification avec isAdmin
  const { user, isAuthenticated, logout, isAdmin } = useAuth();

  // Debug: afficher les informations de l'utilisateur dans la console
  useEffect(() => {
    if (user) {
      console.log('User data:', user);
      console.log('User roles:', user.roles);
      console.log('User role:', user.roles);
      console.log('User typeUser:', user.typeUser);
      console.log('User type_user:', user.typeUser);
      console.log('isAdmin from hook:', isAdmin);
    }
  }, [user, isAdmin]);

  // Fonction helper pour vérifier si l'utilisateur est admin
  const isUserAdmin = () => {
    if (!user) return false;
    
    // Vérifier différentes structures possibles
    if (user.roles?.some(r => 
      r.nomRole === 'Admin' || 
      r.nomRole === 'Administrateur' || 
      r.nomRole === 'admin' ||
      r.nomRole === 'Admin' ||
      r.nomRole === 'Administrateur' ||
      r.nomRole === 'admin'
    )) {
      return true;
    }
    
    
    
    
    
    return false;
  };

  // Hook de recherche globale
  const {
    query,
    setQuery,
    oeuvres: searchOeuvres,
    evenements: searchEvenements,
    sites: searchSites,
    isSearching,
    hasResults,
    clearSearch
  } = useGlobalSearch();

  // Combiner les états de loading
  const showLoading = initialLoading || dataLoading;

  // Styles personnalisés
  const customStyles = {
    bgPrimary: 'bg-[#f8fbfa]',
    textPrimary: 'text-[#0e1a13]',
    textSecondary: 'text-[#51946b]',
    bgSecondary: 'bg-[#e8f2ec]',
    bgAccent: 'bg-[#eb9f13]',
    borderColor: 'border-[#e8f2ec]',
    hoverAccent: 'hover:text-[#eb9f13]',
    textAccent: 'text-[#eb9f13]'
  };

  // Fonction de recherche
  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/recherche?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Gestionnaire pour la touche Entrée
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Fonction pour effectuer une recherche en temps réel
  const handleRealTimeSearch = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim().length >= 2) {
      setQuery(value.trim());
    } else if (value.trim().length === 0) {
      clearSearch();
    }
  };

  // Gestionnaire de déconnexion
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Fermer le menu utilisateur quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Simuler un délai minimum pour le loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Fonction pour rendre une section sans pagination
  const renderSection = (
    title: string,
    items: any[],
    isLoading: boolean,
    error: string | null,
    renderCard: (item: any) => React.ReactNode,
    emptyMessage: string,
    createLink: string | undefined,
    allItemsLink: string
  ) => (
    <>
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <h2 className={`${customStyles.textPrimary} text-[22px] font-bold leading-tight tracking-[-0.015em]`}>
          {title}
        </h2>
        <a 
          href={allItemsLink}
          className={`text-sm font-medium ${customStyles.textAccent} ${customStyles.hoverAccent} transition-colors`}
        >
          Voir tout →
        </a>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loading />
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-600 mb-4">Erreur lors du chargement: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className={`px-4 py-2 ${customStyles.bgAccent} ${customStyles.textPrimary} rounded-lg font-bold`}
          >
            Réessayer
          </button>
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 p-4">
          {items.map(renderCard)}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className={customStyles.textSecondary}>{emptyMessage}</p>
          {isAuthenticated && createLink && (
            <a 
              href={createLink} 
              className={`inline-block mt-4 px-4 py-2 ${customStyles.bgAccent} ${customStyles.textPrimary} rounded-lg font-bold`}
            >
              Créer le premier
            </a>
          )}
        </div>
      )}
    </>
  );

  // Afficher le loader initial
  if (showLoading) {
    return <FullPageLoader />;
  }

  return (
    <div className={`relative flex size-full min-h-screen flex-col ${customStyles.bgPrimary} group/design-root overflow-x-hidden`} style={{ fontFamily: '"Noto Serif", "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        
        {/* Header */}
        <header className={`flex items-center justify-between whitespace-nowrap border-b border-solid ${customStyles.borderColor} px-10 py-3`}>
          <div className={`flex items-center gap-4 ${customStyles.textPrimary}`}>
            <div className="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2 className={`${customStyles.textPrimary} text-lg font-bold leading-tight tracking-[-0.015em]`}>
              Timlilit Culture – L'écho d'Algérie
            </h2>
          </div>
          
          <div className="flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-9">
              <a className={`${customStyles.textPrimary} text-sm font-medium leading-normal ${customStyles.hoverAccent} transition-colors`} href="/evenements">Événements</a>
              <a className={`${customStyles.textPrimary} text-sm font-medium leading-normal ${customStyles.hoverAccent} transition-colors`} href="/patrimoine">Patrimoine</a>
              <a className={`${customStyles.textPrimary} text-sm font-medium leading-normal ${customStyles.hoverAccent} transition-colors`} href="/oeuvres">Œuvres</a>
              <a className={`${customStyles.textPrimary} text-sm font-medium leading-normal ${customStyles.hoverAccent} transition-colors`} href="/artisanat">Artisanat</a>
              <a className={`${customStyles.textPrimary} text-sm font-medium leading-normal ${customStyles.hoverAccent} transition-colors`} href="/a-propos">À Propos</a>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="search"]') as HTMLInputElement;
                  if (input) input.focus();
                }}
                className={`flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 ${customStyles.bgSecondary} ${customStyles.textPrimary} gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-[#dae9e0] transition-colors`}
              >
                <Search className="w-5 h-5" />
              </button>
              
              <button className={`flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 ${customStyles.bgSecondary} ${customStyles.textPrimary} gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-[#dae9e0] transition-colors`}>
                <Globe className="w-5 h-5" />
              </button>
            </div>
            
            {isAuthenticated ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ${customStyles.bgAccent} text-white font-bold justify-center hover:opacity-90 transition-opacity`}
                >
                  {user?.prenom?.charAt(0).toUpperCase() || 'U'}
                  <HiChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Menu dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{user?.prenom} {user?.nom}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                    
                    <a
                      href="/mon-profil"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <HiUser className="w-5 h-5" />
                      <span>Mon profil</span>
                    </a>
                    
                    {/* Lien Administration - visible pour Admin */}
                    {(isAdmin || isUserAdmin()) && (
                      <a
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Tableau de bord Admin</span>
                      </a>
                    )}
                    
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        <HiArrowRightOnRectangle className="w-5 h-5" />
                        <span>Se déconnecter</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="/connexion"
                className={`flex items-center justify-center px-4 h-10 rounded-lg ${customStyles.bgAccent} ${customStyles.textPrimary} text-sm font-bold hover:opacity-90 transition-opacity`}
              >
                Se connecter
              </a>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            
            {/* Hero Section */}
            <div className="@container">
              <div className="@[480px]:p-4">
                <div
                  className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat @[480px]:gap-8 @[480px]:rounded-lg items-center justify-center p-4 relative"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%), url("https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200")`
                  }}
                >
                  {/* Motif berbère en overlay */}
                  <div className="absolute inset-0 opacity-20">
                    <svg className="w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <pattern id="pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M25 5 L45 25 L25 45 L5 25 Z" stroke="white" strokeWidth="1" fill="none"/>
                        <circle cx="25" cy="25" r="3" fill="white"/>
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#pattern)" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-2 text-center relative z-10">
                    <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] @[480px]:text-5xl @[480px]:font-black @[480px]:leading-tight @[480px]:tracking-[-0.033em]">
                      Explorez la Richesse de Notre Culture
                    </h1>
                    <h2 className="text-white text-sm font-normal leading-normal @[480px]:text-base @[480px]:font-normal @[480px]:leading-normal max-w-2xl">
                      Plongez dans un univers vivant d'événements culturels, de lieux chargés d'histoire et d'œuvres inspirantes.
                    </h2>
                  </div>
                  
                  {/* Barre de recherche avec options */}
                  <div className="relative z-10 w-full max-w-md">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => handleRealTimeSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Rechercher événements, patrimoine, œuvres..."
                      className="w-full px-4 py-3 pr-32 rounded-lg bg-white/95 backdrop-blur text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#eb9f13]/50"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={!searchQuery.trim()}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 ${customStyles.bgAccent} ${customStyles.textPrimary} rounded-md font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSearching ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Rechercher'
                      )}
                    </button>

                    {/* Résultats de recherche en temps réel */}
                    {hasResults && query && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                        {/* Œuvres */}
                        {searchOeuvres && searchOeuvres.length > 0 && (
                          <div className="p-3 border-b border-gray-100">
                            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Œuvres</h4>
                            {searchOeuvres.slice(0, 3).map((oeuvre: any) => (
                              <div 
                                key={oeuvre.id_oeuvre}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => window.location.href = `/oeuvres/${oeuvre.id_oeuvre}`}
                              >
                                <HiBookOpen className="text-[#eb9f13] w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{oeuvre.titre}</p>
                                  <p className="text-xs text-gray-500 truncate">{oeuvre.TypeOeuvre?.nom_type}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Événements */}
                        {searchEvenements && searchEvenements.length > 0 && (
                          <div className="p-3 border-b border-gray-100">
                            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Événements</h4>
                            {searchEvenements.slice(0, 3).map((evenement: any) => (
                              <div 
                                key={evenement.id_evenement}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => window.location.href = `/evenements/${evenement.id_evenement}`}
                              >
                                <HiCalendar className="text-[#eb9f13] w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{evenement.nom_evenement}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {new Date(evenement.date_debut).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sites */}
                        {searchSites && searchSites.length > 0 && (
                          <div className="p-3">
                            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Sites patrimoniaux</h4>
                            {searchSites.slice(0, 3).map((site: any) => (
                              <div 
                                key={site.id_lieu}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => window.location.href = `/patrimoine/${site.id_lieu}`}
                              >
                                <HiMapPin className="text-[#eb9f13] w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{site.nom}</p>
                                  <p className="text-xs text-gray-500 truncate">{site.Wilaya?.nom}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Voir tous les résultats */}
                        <div className="p-3 border-t border-gray-100">
                          <button
                            onClick={handleSearch}
                            className="w-full text-center text-sm text-[#eb9f13] hover:text-[#d4891a] font-medium"
                          >
                            Voir tous les résultats
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <a
                    href="/evenements"
                    className={`flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 @[480px]:h-12 @[480px]:px-5 ${customStyles.bgAccent} ${customStyles.textPrimary} text-sm font-bold leading-normal tracking-[0.015em] @[480px]:text-base @[480px]:font-bold @[480px]:leading-normal @[480px]:tracking-[0.015em] hover:opacity-90 transition-opacity relative z-10`}
                  >
                    <span className="truncate">Découvrir les Événements</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Événements à venir */}
            {renderSection(
              "Événements à Venir",
              upcomingEvenements || [],
              loading.evenements,
              errors.evenements,
              (evenement) => (
                <div 
                  key={evenement.id_evenement} 
                  className="flex h-full flex-1 flex-col gap-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow bg-white p-4" 
                  onClick={() => window.location.href = `/evenements/${evenement.id_evenement}`}
                >
                  <div
                    className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg"
                    style={{
                      backgroundImage: `url("${evenement.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600'}")`
                    }}
                  />
                  <div className="flex-1">
                    <p className={`${customStyles.textPrimary} text-base font-medium leading-normal line-clamp-1`}>
                      {evenement.nom_evenement || evenement.nomEvenement}
                    </p>
                    <p className={`${customStyles.textSecondary} text-sm font-normal leading-normal line-clamp-2 mt-1`}>
                      {evenement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <HiCalendar className="w-3 h-3" />
                      <span>{new Date(evenement.date_debut || evenement.dateDebut).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              ),
              "Aucun événement à venir pour le moment.",
              "/evenements/nouveau",
              "/evenements"
            )}

            {/* Sites Patrimoniaux populaires */}
            {renderSection(
              "Sites Patrimoniaux Populaires",
              popularSites || [],
              loading.sites,
              errors.sites,
              (site) => (
                <div 
                  key={site.id_lieu} 
                  className="flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-lg overflow-hidden" 
                  onClick={() => window.location.href = `/patrimoine/${site.id_lieu}`}
                >
                  <div
                    className="w-full bg-center bg-no-repeat aspect-video bg-cover"
                    style={{
                      backgroundImage: `url("${site.LieuMedias?.[0]?.url || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600'}")`
                    }}
                  />
                  <div className="p-4">
                    <p className={`${customStyles.textPrimary} text-base font-medium leading-normal line-clamp-1`}>
                      {site.nom}
                    </p>
                    <p className={`${customStyles.textSecondary} text-sm font-normal leading-normal line-clamp-2 mt-1`}>
                      {site.detailLieu?.description || site.DetailLieu?.description || 'Aucune description disponible'}
                    </p>
                    {site.wilaya?.nom && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <HiMapPin className="w-3 h-3" />
                        <span>{site.wilaya.nom}</span>
                      </div>
                    )}
                  </div>
                </div>
              ),
              "Aucun site patrimonial référencé pour le moment.",
              "/lieux/nouveau",
              "/patrimoine"
            )}

            {/* Œuvres récentes */}
            {renderSection(
              "Œuvres Récentes",
              recentOeuvres || [],
              loading.oeuvres,
              errors.oeuvres,
              (oeuvre) => (
                <div 
                  key={oeuvre.id_oeuvre || oeuvre.idOeuvre} 
                  className="flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow bg-white rounded-lg overflow-hidden" 
                  onClick={() => window.location.href = `/oeuvres/${oeuvre.id_oeuvre || oeuvre.idOeuvre}`}
                >
                  <div
                    className="w-full bg-center bg-no-repeat aspect-video bg-cover"
                    style={{
                      backgroundImage: `url("${oeuvre.Medias?.[0]?.url || 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=600'}")`
                    }}
                  />
                  <div className="p-4">
                    <p className={`${customStyles.textPrimary} text-base font-medium leading-normal line-clamp-1`}>
                      {oeuvre.titre}
                    </p>
                    <p className={`${customStyles.textSecondary} text-sm font-normal leading-normal mt-1`}>
                      {oeuvre.categories?.[0]?.nom || oeuvre.Categories?.[0]?.nom || 'Sans catégorie'} • {oeuvre.annee_creation || oeuvre.anneeCreation}
                    </p>
                    {oeuvre.Users?.[0] && (
                      <p className="text-xs text-gray-500 mt-1">
                        Par {oeuvre.Users[0].prenom} {oeuvre.Users[0].nom}
                      </p>
                    )}
                  </div>
                </div>
              ),
              "Aucune œuvre disponible pour le moment.",
              "/oeuvres/nouvelle",
              "/oeuvres"
            )}

            {/* Section Statistiques */}
            {stats && !loading.stats && (
              <div className="mt-12 p-8 bg-gradient-to-r from-[#e8f2ec] to-[#f4f9f6] rounded-lg">
                <h3 className="text-2xl font-bold text-center mb-8 text-[#0e1a13]">Notre Impact Culturel</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#eb9f13]">{stats.total_oeuvres || 0}</p>
                    <p className="text-sm text-[#51946b] mt-1">Œuvres référencées</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#eb9f13]">{stats.total_evenements || 0}</p>
                    <p className="text-sm text-[#51946b] mt-1">Événements organisés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#eb9f13]">{stats.total_lieux || 0}</p>
                    <p className="text-sm text-[#51946b] mt-1">Sites patrimoniaux</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#eb9f13]">{stats.total_users || 0}</p>
                    <p className="text-sm text-[#51946b] mt-1">Membres actifs</p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Section - Seulement pour les non-connectés */}
            {!isAuthenticated && (
              <div className="mt-12 p-8 bg-gradient-to-r from-[#0e1a13] to-[#1a2e20] rounded-lg text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Rejoignez Notre Communauté</h3>
                <p className="mb-6 text-gray-200">
                  Créez un compte pour contribuer au patrimoine culturel algérien et participer aux événements.
                </p>
                <div className="flex gap-4 justify-center">
                  <a href="/inscription" className={`px-6 py-3 ${customStyles.bgAccent} text-[#0e1a13] rounded-lg font-bold hover:opacity-90 transition-opacity`}>
                    Créer un compte
                  </a>
                  <a href="/connexion" className="px-6 py-3 border border-white rounded-lg font-bold hover:bg-white/10 transition-colors">
                    Se connecter
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex justify-center">
          <div className="flex max-w-[960px] flex-1 flex-col">
            <footer className="flex flex-col gap-6 px-5 py-10 text-center @container">
              <div className="flex flex-wrap items-center justify-center gap-6 @[480px]:flex-row @[480px]:justify-around">
                <a className="text-[#51946b] text-base font-normal leading-normal min-w-40 hover:text-[#eb9f13] transition-colors" href="/contact">
                  Contactez-nous
                </a>
                <a className="text-[#51946b] text-base font-normal leading-normal min-w-40 hover:text-[#eb9f13] transition-colors" href="/confidentialite">
                  Politique de Confidentialité
                </a>
                <a className="text-[#51946b] text-base font-normal leading-normal min-w-40 hover:text-[#eb9f13] transition-colors" href="/conditions">
                  Conditions d'Utilisation
                </a>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                <a href="https://twitter.com/actionculture" target="_blank" rel="noopener noreferrer">
                  <FaTwitter className="text-[#51946b] w-6 h-6 hover:text-[#eb9f13] transition-colors" />
                </a>
                <a href="https://instagram.com/actionculture" target="_blank" rel="noopener noreferrer">
                  <FaInstagram className="text-[#51946b] w-6 h-6 hover:text-[#eb9f13] transition-colors" />
                </a>
                <a href="https://facebook.com/actionculture" target="_blank" rel="noopener noreferrer">
                  <FaFacebook className="text-[#51946b] w-6 h-6 hover:text-[#eb9f13] transition-colors" />
                </a>
                <a href="https://tiktok.com/@actionculture" target="_blank" rel="noopener noreferrer">
                  <FaTiktok className="text-[#51946b] w-6 h-6 hover:text-[#eb9f13] transition-colors" />
                </a>
                <a href="https://youtube.com/actionculture" target="_blank" rel="noopener noreferrer">
                  <FaYoutube className="text-[#51946b] w-6 h-6 hover:text-[#eb9f13] transition-colors" />
                </a>
              </div>
              
              <p className={`${customStyles.textSecondary} text-base font-normal leading-normal`}>
                @2024 Action Culture. Tous droits réservés.
              </p>
            </footer>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;