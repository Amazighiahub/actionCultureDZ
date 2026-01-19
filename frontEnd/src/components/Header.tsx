import React, { useEffect, useState } from 'react';
import { Menu, X, MapPin, Calendar, Palette, Hammer, Info, User, LogOut, Settings, Shield, UserCheck, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/UI/button';
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

const MadgacenLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
  >
    <defs>
      {/* Gradient principal pour le monument */}
      <linearGradient id="monumentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B7355" />
        <stop offset="30%" stopColor="#A0826D" />
        <stop offset="70%" stopColor="#C4A882" />
        <stop offset="100%" stopColor="#D4BC9A" />
      </linearGradient>

      {/* Gradient pour l'ombre */}
      <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6B5344" />
        <stop offset="100%" stopColor="#4A3828" />
      </linearGradient>

      {/* Gradient pour le ciel/fond */}
      <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#E8DFD0" />
        <stop offset="100%" stopColor="#F5EFE6" />
      </linearGradient>
    </defs>

    {/* Cercle de fond */}
    <circle cx="50" cy="50" r="48" fill="url(#skyGradient)" stroke="#C4A882" strokeWidth="2"/>

    {/* Base du monument Madghacen - forme cylindrique étagée */}
    {/* Niveau 1 - Base large */}
    <ellipse cx="50" cy="82" rx="38" ry="8" fill="url(#shadowGradient)" opacity="0.6"/>
    <path d="M12 78 L12 82 Q50 90 88 82 L88 78 Q50 86 12 78" fill="url(#monumentGradient)"/>

    {/* Niveau 2 */}
    <ellipse cx="50" cy="74" rx="34" ry="7" fill="url(#shadowGradient)" opacity="0.5"/>
    <path d="M16 70 L16 74 Q50 81 84 74 L84 70 Q50 77 16 70" fill="url(#monumentGradient)"/>

    {/* Niveau 3 */}
    <ellipse cx="50" cy="66" rx="30" ry="6" fill="url(#shadowGradient)" opacity="0.4"/>
    <path d="M20 62 L20 66 Q50 72 80 66 L80 62 Q50 68 20 62" fill="url(#monumentGradient)"/>

    {/* Niveau 4 */}
    <ellipse cx="50" cy="58" rx="26" ry="5" fill="url(#shadowGradient)" opacity="0.3"/>
    <path d="M24 54 L24 58 Q50 63 76 58 L76 54 Q50 59 24 54" fill="url(#monumentGradient)"/>

    {/* Niveau 5 */}
    <path d="M28 46 L28 54 Q50 59 72 54 L72 46 Q50 51 28 46" fill="url(#monumentGradient)"/>

    {/* Sommet conique */}
    <path d="M32 46 L50 22 L68 46 Q50 51 32 46" fill="url(#monumentGradient)"/>

    {/* Détails - lignes de pierre */}
    <line x1="50" y1="22" x2="50" y2="46" stroke="#6B5344" strokeWidth="0.5" opacity="0.3"/>
    <line x1="38" y1="38" x2="62" y2="38" stroke="#6B5344" strokeWidth="0.3" opacity="0.2"/>
    <line x1="35" y1="42" x2="65" y2="42" stroke="#6B5344" strokeWidth="0.3" opacity="0.2"/>

    {/* Porte/entrée symbolique */}
    <rect x="46" y="70" width="8" height="10" rx="4" fill="#4A3828" opacity="0.6"/>

    {/* Reflet lumineux */}
    <path d="M40 30 Q50 25 55 35" stroke="#F5EFE6" strokeWidth="1.5" fill="none" opacity="0.4"/>
  </svg>
);

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isRtl, rtlClasses } = useRTL(i18n.language);
  
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { 
    isAdmin, 
    isProfessional, 
    needsValidation,
    canCreateOeuvre,
    canCreateEvent,
    canAccessProfessionalDashboard
  } = usePermissions();

  // ✅ Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [navigate]);

  // ✅ Fermer le menu mobile quand on redimensionne vers desktop (3xl: 1600px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1600) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

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

  const getInitials = () => {
    if (!user) return '?';
    return `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadge = () => {
    if (isAdmin) return <Badge className="bg-gradient-to-r from-stone-700 to-stone-800 text-white border-0 text-xs">{t('header.badges.admin')}</Badge>;
    if (isProfessional && needsValidation) return <Badge className="bg-gradient-to-r from-amber-800 to-amber-900 text-white border-0 text-xs">{t('header.badges.pending')}</Badge>;
    if (isProfessional) return <Badge className="bg-gradient-to-r from-stone-600 to-stone-700 text-white border-0 text-xs">{t('header.badges.professional')}</Badge>;
    return null;
  };

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (canAccessProfessionalDashboard()) return '/dashboard-pro';
    return '/dashboard-user';
  };

  const normalizeCurrentLang = (lang: string | null | undefined): string => {
    if (!lang || typeof lang !== 'string') return 'fr';
    const langLower = lang.toLowerCase();
    if (langLower.startsWith('ar')) return 'ar';
    if (langLower.startsWith('fr')) return 'fr';
    if (langLower.startsWith('en')) return 'en';
    if (langLower === 'tz' || langLower === 'tz-ltn' || langLower === 'tz_ltn') return 'tz-ltn';
    if (langLower === 'tz-tfng' || langLower === 'tz_tfng') return 'tz-tfng';
    return 'fr';
  };

  const LanguageSelector = () => {
    const languages = [
      { code: 'ar', short: 'AR', name: 'العربية' },
      { code: 'fr', short: 'FR', name: 'Français' },
      { code: 'en', short: 'EN', name: 'English' },
      { code: 'tz-ltn', short: 'TZ', name: 'Tamaziɣt' },
      { code: 'tz-tfng', short: 'ⵜⵖ', name: 'ⵜⴰⵎⴰⵣⵉⵖⵜ' },
    ];
  
    const handleLanguageChange = (langCode: string) => {
      changeLanguage(langCode);
      setLangDropdownOpen(false);
    };
  
    const currentLanguage = i18n.language || localStorage.getItem('i18nextLng') || 'fr';
    const currentLangNormalized = normalizeCurrentLang(currentLanguage);
    const currentLang = languages.find(l => l.code === currentLangNormalized) || languages[1];
  
    return (
      <DropdownMenu open={langDropdownOpen} onOpenChange={setLangDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors duration-200 px-2 min-w-[44px] min-h-[44px]"
          >
            <Globe className="h-4 w-4" />
            <span className="font-medium hidden xs:inline ml-1">{currentLang.short}</span>
            <ChevronDown className={`h-3 w-3 ml-0.5 opacity-60 transition-transform duration-200 hidden xs:inline ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={isRtl ? "start" : "end"} 
          className="w-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-stone-200/50 dark:border-stone-700/50"
        >
          {languages.map(lang => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`${currentLangNormalized === lang.code ? 'bg-stone-100 dark:bg-stone-800' : ''} hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer min-h-[44px]`}
            >
              <span className="font-medium mr-3">{lang.short}</span>
              <span className="text-sm text-muted-foreground">{lang.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
        {/* ✅ CORRECTION: Utilisation de gap au lieu de space-x pour RTL */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">

          {/* Logo et titre */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0">
              <MadgacenLogo className="w-full h-full" />
            </div>
            <div className="hidden xs:flex flex-col">
              <h1 className="text-xs sm:text-sm font-bold text-gradient whitespace-nowrap">
                {t('header.title')}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block whitespace-nowrap">
                {t('header.subtitle')}
              </p>
            </div>
          </Link>

          {/* Navigation desktop - Visible uniquement sur très grands écrans (≥1600px) */}
          <nav className="hidden 3xl:flex items-center">
            <div className="flex items-center gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Actions - ✅ CORRECTION: Meilleure gestion responsive */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Sélecteur de langue */}
            <LanguageSelector />
            
            {/* Utilisateur connecté */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0"
                  >
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                      <AvatarImage src={user.photo_url} alt={user.prenom} />
                      <AvatarFallback className="bg-gradient-to-r from-stone-600 to-stone-700 text-white text-xs sm:text-sm">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-64" 
                  align={isRtl ? "start" : "end"}
                >
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photo_url} alt={user.prenom} />
                        <AvatarFallback className="bg-gradient-to-r from-stone-600 to-stone-700 text-white">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.prenom} {user.nom}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    {getRoleBadge() && (
                      <div className="mt-2">{getRoleBadge()}</div>
                    )}
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="flex items-center gap-2 min-h-[44px]">
                      {isAdmin ? (
                        <>
                          <Shield className="h-4 w-4" />
                          <span>{t('header.userMenu.administration')}</span>
                        </>
                      ) : isProfessional && !needsValidation ? (
                        <>
                          <Palette className="h-4 w-4" />
                          <span>{t('header.userMenu.proDashboard')}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4" />
                          <span>{t('header.userMenu.mySpace')}</span>
                        </>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  
                  {canCreateOeuvre() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/ajouter-oeuvre" className="flex items-center gap-2 min-h-[44px]">
                          <Palette className="h-4 w-4" />
                          <span>{t('header.userMenu.addWork')}</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {canCreateEvent() && (
                    <DropdownMenuItem asChild>
                      <Link to="/ajouter-evenement" className="flex items-center gap-2 min-h-[44px]">
                        <Calendar className="h-4 w-4" />
                        <span>{t('header.userMenu.createEvent')}</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin/validation" className="flex items-center gap-2 min-h-[44px]">
                          <UserCheck className="h-4 w-4" />
                          <span>{t('header.userMenu.pendingValidations')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/metadata" className="flex items-center gap-2 min-h-[44px]">
                          <Settings className="h-4 w-4" />
                          <span>{t('header.userMenu.metadata')}</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 min-h-[44px]">
                      <User className="h-4 w-4" />
                      <span>{t('header.userMenu.myProfile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/mes-favoris" className="flex items-center gap-2 min-h-[44px]">
                      <Palette className="h-4 w-4" />
                      <span>{t('header.userMenu.myFavorites')}</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-destructive min-h-[44px] flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('common.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                {/* Boutons connexion/inscription - ✅ CORRECTION: Responsive */}
                <Link to="/auth" className="hidden sm:block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[40px]"
                  >
                    <User className="h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">{t('common.login')}</span>
                  </Button>
                </Link>
                
                <Link to="/auth">
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white shadow-sm min-h-[40px] px-3 sm:px-4"
                  >
                    <span className="text-xs sm:text-sm">{t('common.signup')}</span>
                  </Button>
                </Link>
              </>
            )}

            {/* Menu mobile - ✅ CORRECTION: Visible jusqu'à 3xl (1600px) */}
            <Button
              variant="ghost"
              size="sm"
              className="3xl:hidden min-w-[44px] min-h-[44px] p-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu mobile déroulant - ✅ CORRECTION: Visible jusqu'à 3xl (1600px) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 top-14 sm:top-16 z-40 bg-background 3xl:hidden overflow-y-auto"
          style={{ height: 'calc(100dvh - 56px)' }}
        >
          <div className="px-4 py-4 space-y-3">
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* Actions mobile */}
            <div className="pt-4 border-t space-y-3">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={user.photo_url} alt={user.prenom} />
                      <AvatarFallback className="bg-gradient-to-r from-stone-600 to-stone-700 text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.prenom} {user.nom}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {getRoleBadge() && (
                        <div className="mt-1">{getRoleBadge()}</div>
                      )}
                    </div>
                  </div>
                  
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span>
                      {isAdmin ? t('header.userMenu.administration') : isProfessional && !needsValidation ? t('header.userMenu.proDashboard') : t('header.userMenu.mySpace')}
                    </span>
                  </Link>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full min-h-[48px] text-base"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    {t('common.logout')}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/auth" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full min-h-[48px] text-base">
                      {t('common.login')}
                    </Button>
                  </Link>
                  <Link to="/auth" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full min-h-[48px] text-base bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white">
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