// components/Header.tsx - Header unifié pour toute l'application (CORRIGÉ)

import React, { useState, useEffect } from 'react';
import { 
  HiMagnifyingGlass as Search,
  HiGlobeAlt as Globe,
  HiUser,
  HiArrowRightOnRectangle,
  HiChevronDown,
  HiCog6Tooth as Settings
} from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';

// ✅ AJOUT : Types pour les props
interface HeaderProps {
  currentPage?: 'accueil' | 'oeuvres' | 'evenements' | 'patrimoine' | 'a-propos';
  showSearch?: boolean;
  variant?: 'default' | 'listing';
}

const Header: React.FC<HeaderProps> = ({ 
  currentPage = 'accueil', 
  showSearch = true,
  variant = 'default'
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  // Styles personnalisés unifiés
  const customStyles = {
    bgPrimary: variant === 'listing' ? 'bg-white' : 'bg-[#f8fbfa]',
    textPrimary: 'text-[#0e1a13]',
    textSecondary: 'text-[#51946b]',
    bgSecondary: variant === 'listing' ? 'bg-[#f4f3f0]' : 'bg-[#e8f2ec]',
    bgAccent: 'bg-[#eb9f13]',
    borderColor: variant === 'listing' ? 'border-[#f4f3f0]' : 'border-[#e8f2ec]',
    hoverAccent: 'hover:text-[#eb9f13]',
    textAccent: 'text-[#eb9f13]',
    hoverBg: variant === 'listing' ? 'hover:bg-[#e6e2db]' : 'hover:bg-[#dae9e0]'
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

  // Navigation items avec état actif
  const navItems = [
    { href: '/', label: 'Accueil', key: 'accueil' },
    { href: '/evenements', label: 'Événements', key: 'evenements' },
    { href: '/patrimoine', label: 'Patrimoine', key: 'patrimoine' },
    { href: '/oeuvres', label: 'Œuvres', key: 'oeuvres' },
    { href: '/a-propos', label: 'À Propos', key: 'a-propos' },
  ];

  // ✅ CORRECTION : Fonction pour vérifier si l'utilisateur est admin
  const isUserAdmin = (): boolean => {
    if (!user?.roles) return false;
    return user.roles.some(role => role.nomRole === 'Admin');
  };

  return (
    <header className={`flex items-center justify-between whitespace-nowrap border-b border-solid ${customStyles.borderColor} px-10 py-3 ${customStyles.bgPrimary}`}>
      {/* Logo et titre */}
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
      
      {/* Navigation centrale */}
      <div className="flex flex-1 justify-end gap-8">
        <div className="flex items-center gap-9">
          {navItems.map(item => (
            <a 
              key={item.key}
              className={`text-sm font-medium leading-normal transition-colors ${
                currentPage === item.key 
                  ? customStyles.textAccent 
                  : `${customStyles.textPrimary} ${customStyles.hoverAccent}`
              }`} 
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>
        
        {/* Actions et boutons */}
        <div className="flex gap-2">
          {showSearch && (
            <button
              onClick={() => {
                const input = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (input) {
                  input.focus();
                } else {
                  // Si pas d'input sur la page, aller à la page de recherche
                  window.location.href = '/recherche';
                }
              }}
              className={`flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 ${customStyles.bgSecondary} ${customStyles.textPrimary} gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 ${customStyles.hoverBg} transition-colors`}
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          
          <button className={`flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 ${customStyles.bgSecondary} ${customStyles.textPrimary} gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 ${customStyles.hoverBg} transition-colors`}>
            <Globe className="w-5 h-5" />
          </button>
        </div>
        
        {/* Menu utilisateur ou connexion */}
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
                  <p className="text-xs text-gray-400 mt-1">
                    {user?.roles?.[0]?.nomRole || 'Visiteur'}
                  </p>
                </div>
                
                <a
                  href="/mon-profil"
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <HiUser className="w-5 h-5" />
                  <span>Mon profil</span>
                </a>
                
                <a
                  href="/mes-oeuvres"
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Mes créations</span>
                </a>
                
                <a
                  href="/mes-favoris"
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Mes favoris</span>
                </a>
                
                {/* ✅ CORRECTION : Admin uniquement */}
                {isUserAdmin() && (
                  <a
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Administration</span>
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
  );
};

export default Header;