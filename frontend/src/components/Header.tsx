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

const MadgacenLogo = ({ className = "" }) => (
  <svg 
    viewBox="0 0 200 150" 
    className={className}
    fill="currentColor"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b7355" />
        <stop offset="50%" stopColor="#a0826d" />
        <stop offset="100%" stopColor="#c9aa88" />
      </linearGradient>
    </defs>
    
    <path 
      d="M 100 30 L 95 35 L 90 40 L 85 45 L 80 50 L 75 55 L 70 60 L 65 65 L 60 70 L 55 75 L 50 80 L 45 85 L 40 90 L 35 95 L 30 100 L 25 105 L 20 110 L 20 115 L 180 115 L 180 110 L 175 105 L 170 100 L 165 95 L 160 90 L 155 85 L 150 80 L 145 75 L 140 70 L 135 65 L 130 60 L 125 55 L 120 50 L 115 45 L 110 40 L 105 35 L 100 30 Z" 
      fill="url(#logoGradient)"
    />
    
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
    
    <rect x="10" y="115" width="180" height="8" fill="url(#logoGradient)" opacity="0.8"/>
    <rect x="5" y="123" width="190" height="5" fill="currentColor" opacity="0.6"/>
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
    if (isAdmin) return <Badge className={`bg-gradient-to-r from-stone-700 to-stone-800 text-white border-0 ${rtlClasses.marginStart(2)}`}>{t('header.badges.admin')}</Badge>;
    if (isProfessional && needsValidation) return <Badge className={`bg-gradient-to-r from-amber-800 to-amber-900 text-white border-0 ${rtlClasses.marginStart(2)}`}>{t('header.badges.pending')}</Badge>;
    if (isProfessional) return <Badge className={`bg-gradient-to-r from-stone-600 to-stone-700 text-white border-0 ${rtlClasses.marginStart(2)}`}>{t('header.badges.professional')}</Badge>;
    return null;
  };

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (canAccessProfessionalDashboard()) return '/dashboard-pro';
    return '/dashboard-user';
  };

  const normalizeCurrentLang = (lang) => {
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
  
    const handleLanguageChange = (langCode) => {
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
            className="hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors duration-200 px-2 sm:px-3"
          >
            <Globe className="h-4 w-4 mr-1 sm:mr-1.5" />
            <span className="font-medium">{currentLang.short}</span>
            <ChevronDown className={`h-3 w-3 ml-0.5 sm:ml-1 opacity-60 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
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
              className={`${currentLangNormalized === lang.code ? 'bg-stone-100 dark:bg-stone-800' : ''} hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer`}
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo et titre */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10">
              <MadgacenLogo className="h-full w-full text-stone-700 dark:text-stone-400" />
            </div>
            <div className="hidden sm:block">
              <h2 className={`text-lg sm:text-xl font-bold bg-gradient-to-r from-stone-700 to-stone-800 dark:from-stone-400 dark:to-stone-500 bg-clip-text text-transparent ${isRtl ? 'font-arabic' : ''}`}>
                {t('header.title')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
            </div>
          </Link>

          {/* Navigation desktop */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-lg"
              >
                <item.icon className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Sélecteur de langue */}
            <LanguageSelector />
            
            {/* Section utilisateur */}
            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-stone-200 dark:bg-stone-700 rounded-full" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photo_url} alt={user.prenom} />
                      <AvatarFallback className="bg-gradient-to-r from-stone-600 to-stone-700 text-white text-xs">{getInitials()}</AvatarFallback>
                    </Avatar>
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
                <Link to="/auth" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800">
                    <User className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                    {t('common.login')}
                  </Button>
                </Link>
                
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white shadow-sm">
                    <span className="hidden sm:inline">{t('common.signup')}</span>
                    <span className="sm:hidden">{t('common.signup').substring(0, 7)}</span>
                  </Button>
                </Link>
              </>
            )}

            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {isMenuOpen && (
        <div className="border-t bg-background lg:hidden">
          <div className="px-4 py-4 space-y-3">
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex items-center rounded-lg p-3 text-sm font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className={`h-5 w-5 ${rtlClasses.marginEnd(3)}`} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* Actions mobile */}
            <div className="pt-3 border-t space-y-2">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photo_url} alt={user.prenom} />
                      <AvatarFallback className="bg-gradient-to-r from-stone-600 to-stone-700 text-white">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className={rtlClasses.marginStart(3)}>
                      <p className="font-medium">{user.prenom} {user.nom}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center rounded-lg p-3 text-sm font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
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
                <div className="flex gap-2">
                  <Link to="/auth" className="flex-1">
                    <Button variant="outline" className="w-full">
                      {t('common.login')}
                    </Button>
                  </Link>
                  <Link to="/auth" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white">
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