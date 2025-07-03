import React, { useState } from 'react';
import { Search, Menu, X, MapPin, Calendar, Palette, Hammer, Info, User, LogOut, Settings, Shield, UserCheck, Globe } from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/UI/avatar';
import { Badge } from '@/components/UI/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRTL } from '@/utils/rtl';
import { changeLanguage } from 'i18next';


const MadgacenLogo = ({ className = "" }) => (
  <svg 
    viewBox="0 0 200 150" 
    className={className}
    fill="currentColor"
  >
    {/* Silhouette principale */}
    <path d="M 100 30 L 95 35 L 90 40 L 85 45 L 80 50 L 75 55 L 70 60 L 65 65 L 60 70 L 55 75 L 50 80 L 45 85 L 40 90 L 35 95 L 30 100 L 25 105 L 20 110 L 20 115 L 180 115 L 180 110 L 175 105 L 170 100 L 165 95 L 160 90 L 155 85 L 150 80 L 145 75 L 140 70 L 135 65 L 130 60 L 125 55 L 120 50 L 115 45 L 110 40 L 105 35 L 100 30 Z" />
    
    {/* Lignes horizontales pour les étages */}
    <line x1="25" y1="105" x2="175" y2="105" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="30" y1="100" x2="170" y2="100" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="35" y1="95" x2="165" y2="95" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="40" y1="90" x2="160" y2="90" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="45" y1="85" x2="155" y2="85" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="50" y1="80" x2="150" y2="80" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="55" y1="75" x2="145" y2="75" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="60" y1="70" x2="140" y2="70" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="65" y1="65" x2="135" y2="65" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="70" y1="60" x2="130" y2="60" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="75" y1="55" x2="125" y2="55" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="80" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="85" y1="45" x2="115" y2="45" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    <line x1="90" y1="40" x2="110" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    
    {/* Base */}
    <rect x="10" y="115" width="180" height="8" />
    <rect x="5" y="123" width="190" height="5" opacity="0.8"/>
  </svg>
);

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isRtl, rtlClasses } = useRTL(i18n.language);
  
  // Hooks d'authentification et permissions
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { 
    isAdmin, 
    isProfessional, 
    isVisitor,
    needsValidation,
    canCreateOeuvre,
    canCreateEvent,
    canAccessProfessionalDashboard
  } = usePermissions();

  const navigationItems = [
    { icon: Calendar, label: t('header.nav.events'), href: '/evenements' },
    { icon: MapPin, label: t('header.nav.heritage'), href: '/patrimoine' },
    { icon: Palette, label: t('header.nav.works'), href: '/oeuvres' },
    { icon: Hammer, label: t('header.nav.crafts'), href: '/artisanat' },
    { icon: Info, label: t('header.nav.about'), href: '/a-propos' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Initiales pour l'avatar
  const getInitials = () => {
    if (!user) return '?';
    return `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();
  };

  // Badge selon le rôle et statut
  const getRoleBadge = () => {
    if (isAdmin) return <Badge variant="destructive" className={rtlClasses.marginStart(2)}>{t('header.badges.admin')}</Badge>;
    if (isProfessional && needsValidation) return <Badge variant="outline" className={rtlClasses.marginStart(2)}>{t('header.badges.pending')}</Badge>;
    if (isProfessional) return <Badge variant="secondary" className={rtlClasses.marginStart(2)}>{t('header.badges.professional')}</Badge>;
    return null;
  };

  // Déterminer le lien du dashboard selon le rôle
  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (canAccessProfessionalDashboard()) return '/dashboard-pro';
    return '/dashboard-user';
  };

  const normalizeCurrentLang = (lang: string | undefined): string => {
    // Vérifier que lang existe
    if (!lang || typeof lang !== 'string') {
      console.log('[Header] Langue non définie, utilisation du français par défaut');
      return 'fr';
    }
    
    // Convertir en minuscules pour la comparaison
    const langLower = lang.toLowerCase();
    
    // Normaliser les variations possibles
    if (langLower.startsWith('ar')) return 'ar';
    if (langLower.startsWith('fr')) return 'fr';
    if (langLower.startsWith('en')) return 'en';
    if (langLower === 'tz' || langLower === 'tz-ltn' || langLower === 'tz_ltn') return 'tz-ltn';
    if (langLower === 'tz-tfng' || langLower === 'tz_tfng') return 'tz-tfng';
    
    console.log('[Header] Langue non reconnue:', lang, '-> utilisation du français par défaut');
    return 'fr';
  };

  // Sélecteur de langue
  const LanguageSelector = () => {
    const languages = [
      { code: 'ar', name: 'العربية', flag: '🇩🇿' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'tz-ltn', name: 'Tamaziɣt', flag: 'ⵣ' },
      { code: 'tz-tfng', name: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', flag: '⵿' },
    ];
  
    const handleLanguageChange = (langCode: string) => {
      try {
        console.log('[Header] Changement de langue demandé:', langCode);
        
        // Utiliser la fonction changeLanguage importée
        changeLanguage(langCode);
        
        console.log('[Header] Langue changée avec succès');
      } catch (error) {
        console.error('[Header] Erreur lors du changement de langue:', error);
      }
    };
  
    // Obtenir la langue actuelle de manière sûre
    const currentLanguage = i18n.language || localStorage.getItem('i18nextLng') || 'fr';
    const currentLangNormalized = normalizeCurrentLang(currentLanguage);
    const currentLang = languages.find(l => l.code === currentLangNormalized) || languages[1]; // Français par défaut
  
    console.log('[Header] Langue actuelle:', currentLanguage, '-> normalisée:', currentLangNormalized);
  
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Globe className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
            <span className="hidden sm:inline">
              {currentLang.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRtl ? "start" : "end"}>
          {languages.map(lang => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={currentLangNormalized === lang.code ? 'bg-accent' : ''}
            >
              <span className={rtlClasses.marginEnd(2)}>{lang.flag}</span>
              <span>{lang.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo et titre */}
        <Link to="/" className={`flex items-center ${rtlClasses.marginStart(3)}`}>
          <div className="flex h-10 w-10 items-center justify-center">
            <MadgacenLogo className="h-10 w-10 text-primary" />
          </div>
          <div className={`hidden sm:block ${rtlClasses.marginStart(3)}`}>
            <h2 className={`text-xl font-bold text-gradient ${isRtl ? 'font-arabic' : ''}`}>
              {t('header.title')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
          </div>
        </Link>

        {/* Navigation desktop */}
        <nav className={`hidden md:flex items-center ${rtlClasses.marginStart(6)}`}>
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center ${rtlClasses.marginStart(2)} text-sm font-medium text-foreground/80 transition-colors hover:text-primary`}
            >
              <item.icon className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Barre de recherche et actions */}
        <div className={`flex items-center ${rtlClasses.marginStart(4)}`}>
          <div className="relative hidden lg:block">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
            <Input
              type="search"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-64 ${isRtl ? 'pr-10 text-right' : 'pl-10'}`}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>
          
          {/* Sélecteur de langue */}
          <div className={rtlClasses.marginStart(2)}>
            <LanguageSelector />
          </div>
          
          {/* Section utilisateur */}
          {loading ? (
            <div className={`h-8 w-8 animate-pulse bg-muted rounded-full ${rtlClasses.marginStart(2)}`} />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`relative h-auto p-0 ${rtlClasses.marginStart(2)}`}>
                  <div className={`flex items-center ${rtlClasses.marginStart(2)}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photo_url} alt={user.prenom} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className={`hidden sm:flex items-center ${rtlClasses.marginStart(2)}`}>
                      <span className="text-sm font-medium">{user.prenom}</span>
                      {getRoleBadge()}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align={isRtl ? "start" : "end"}>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.prenom} {user.nom}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Tableau de bord - Toujours visible pour tous */}
                <DropdownMenuItem asChild>
                  <Link to={getDashboardLink()}>
                    {isAdmin ? (
                      <>
                        <Shield className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                        <span>{t('header.userMenu.administration')}</span>
                      </>
                    ) : isProfessional && !needsValidation ? (
                      <>
                        <User className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                        <span>{t('header.userMenu.proDashboard')}</span>
                      </>
                    ) : (
                      <>
                        <User className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                        <span>{t('header.userMenu.mySpace')}</span>
                      </>
                    )}
                  </Link>
                </DropdownMenuItem>
                
                {/* Options de création - Seulement pour professionnels validés et admins */}
                {canCreateOeuvre() && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/ajouter-oeuvre">
                        <Palette className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                        <span>{t('header.userMenu.addWork')}</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                {canCreateEvent() && (
                  <DropdownMenuItem asChild>
                    <Link to="/ajouter-evenement">
                      <Calendar className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                      <span>{t('header.userMenu.createEvent')}</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {/* Administration - Seulement pour admins */}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/validation">
                        <UserCheck className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                        <span>{t('header.userMenu.pendingValidations')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/metadata">
                        <Settings className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                        <span>{t('header.userMenu.metadata')}</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                
                {/* Options communes */}
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                    <span>{t('header.userMenu.myProfile')}</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/mes-favoris">
                    <Palette className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                    <span>{t('header.userMenu.myFavorites')}</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                  <span>{t('common.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth" className={rtlClasses.marginStart(2)}>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <User className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                  {t('common.login')}
                </Button>
              </Link>
              
              <Link to="/auth" className={rtlClasses.marginStart(2)}>
                <Button size="sm" className="hidden sm:flex">
                  {t('common.signup')}
                </Button>
              </Link>
            </>
          )}

          {/* Menu mobile */}
          <Button
            variant="ghost"
            size="sm"
            className={`md:hidden ${rtlClasses.marginStart(2)}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {isMenuOpen && (
        <div className="border-t bg-background md:hidden">
          <div className="container py-4 space-y-4">
            <div className="relative">
              <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
              <Input
                type="search"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRtl ? 'pr-10 text-right' : 'pl-10'}
                dir={isRtl ? 'rtl' : 'ltr'}
              />
            </div>
            
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center ${rtlClasses.marginStart(3)} rounded-lg p-3 text-sm font-medium transition-colors hover:bg-muted`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className={`h-5 w-5 ${rtlClasses.marginEnd(3)}`} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* Actions mobile */}
            <div className="pt-4 border-t space-y-2">
              {isAuthenticated && user ? (
                <>
                  <div className={`flex items-center ${rtlClasses.marginStart(3)} p-3`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photo_url} alt={user.prenom} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className={rtlClasses.marginStart(3)}>
                      <p className="font-medium">{user.prenom} {user.nom}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link
                    to={getDashboardLink()}
                    className={`flex items-center ${rtlClasses.marginStart(3)} rounded-lg p-3 text-sm font-medium transition-colors hover:bg-muted`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className={`h-5 w-5 ${rtlClasses.marginEnd(3)}`} />
                    <span>
                      {isAdmin ? t('header.userMenu.administration') : isProfessional && !needsValidation ? t('header.userMenu.proDashboard') : t('header.userMenu.mySpace')}
                    </span>
                  </Link>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                    {t('common.logout')}
                  </Button>
                </>
              ) : (
                <div className="flex space-x-2">
                  <Link to="/auth" className="flex-1">
                    <Button variant="outline" className="w-full">
                      {t('common.login')}
                    </Button>
                  </Link>
                  <Link to="/auth" className="flex-1">
                    <Button className="w-full">
                      {t('common.signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;