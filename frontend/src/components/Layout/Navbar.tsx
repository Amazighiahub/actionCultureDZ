// components/Layout/Navbar.tsx
import React, { useState } from 'react';
import { 
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineUser,
  HiOutlineLogin,
  HiBookOpen,
  HiCalendar,
  HiMap,
  HiInformationCircle
} from 'react-icons/hi';
import { useAuth } from '../../hooks/useAuth';


const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Œuvres', href: '/oeuvres', icon: HiBookOpen },
    { name: 'Événements', href: '/evenements', icon: HiCalendar },
    { name: 'Patrimoine', href: '/patrimoine', icon: HiMap },
    { name: 'À propos', href: '/a-propos', icon: HiInformationCircle },
  ];

  return (
    <nav className="bg-gradient-to-r from-green-800 to-green-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-green-900 font-bold text-xl">AC</span>
              </div>
              <span className="font-bold text-xl hidden sm:block">Action Culture</span>
            </a>
          </div>

          {/* Navigation desktop */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 hover:text-white transition-all duration-200"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Boutons d'authentification */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <a
                  href="/profil"
                  className="flex items-center space-x-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg transition-all duration-200"
                >
                  <HiOutlineUser className="h-5 w-5" />
                  <span>{user.prenom}</span>
                </a>
                <button
                  onClick={logout}
                  className="px-4 py-2 border border-white/30 hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <a
                  href="/connexion"
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-green-700 rounded-lg transition-all duration-200"
                >
                  <HiOutlineLogin className="h-5 w-5" />
                  <span>Se connecter</span>
                </a>
                <a
                  href="/inscription"
                  className="px-4 py-2 bg-yellow-500 text-green-900 hover:bg-yellow-400 rounded-lg font-medium transition-all duration-200"
                >
                  Inscription
                </a>
              </>
            )}
          </div>

          {/* Menu mobile */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:bg-green-700 focus:outline-none"
            >
              {isMenuOpen ? (
                <HiOutlineX className="h-6 w-6" />
              ) : (
                <HiOutlineMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden bg-green-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </a>
            ))}
            
            <div className="border-t border-green-700 pt-2 mt-2">
              {user ? (
                <>
                  <a
                    href="/profil"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                  >
                    <HiOutlineUser className="h-5 w-5" />
                    <span>Mon profil</span>
                  </a>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/connexion"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium hover:bg-green-700"
                  >
                    <HiOutlineLogin className="h-5 w-5" />
                    <span>Se connecter</span>
                  </a>
                  <a
                    href="/inscription"
                    className="block px-3 py-2 rounded-md text-base font-medium bg-yellow-500 text-green-900 hover:bg-yellow-400 text-center mt-2"
                  >
                    Inscription
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;