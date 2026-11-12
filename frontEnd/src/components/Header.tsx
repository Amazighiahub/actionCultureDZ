import { useEffect, useRef, useState } from 'react';
import { IdCard, Menu, X, MapPin, Calendar, Palette, Hammer, Info, User, LogOut, Shield, UserCheck, BookOpen, Film, Music, FileText, Beaker, Landmark, Building2, Trees, Compass, Utensils, Store, Library, Users, ShoppingBag, PlusCircle, Map as MapIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRTL } from '@/hooks/useRTL';
import LanguageSelector from '@/components/LanguageSelector';
import { InstallerTalaDz } from '@/components/shared/PiedDePageApplication';
import NotificationBell from '@/components/NotificationBell';
import { professionnelPath } from '@/utils/slug';
import { lienSommaireGuides } from '@/utils/lienGuide';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isRtl } = useRTL(i18n.language);

  const { user, isAuthenticated, logout } = useAuth();
  const {
    isAdmin,
    isProfessional,
    needsValidation,
    canCreateOeuvre,
    canCreateEvent,
    canAccessProfessionalDashboard
  } = usePermissions();

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Rubrique de la page courante (aria-current="page" dans la navigation)
  const isCurrentSection = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Menu mobile : le focus entre dans le menu à l'ouverture
  useEffect(() => {
    if (isMenuOpen) {
      mobileMenuRef.current?.querySelector<HTMLElement>('a[href], button')?.focus();
    }
  }, [isMenuOpen]);

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  // Échap ferme le menu ; Tab boucle entre les éléments du menu et le bouton qui l'ouvre
  const handleMobileMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMobileMenu();
      return;
    }
    if (e.key !== 'Tab' || !mobileMenuRef.current) return;
    const focusables = mobileMenuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      menuButtonRef.current?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      menuButtonRef.current?.focus();
    }
  };

  // Fermer le menu ☰ quand l'écran devient assez large pour le menu complet (xl : 1280 px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
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
    { icon: Users, label: t('professionnels.menu', 'Professionnels'), href: '/professionnels' },
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

  // Portfolio public : professionnels validés uniquement
  const portfolioLink = user && isProfessional && !needsValidation
    ? professionnelPath(user.id_user, String(user.prenom || ''), String(user.nom || ''))
    : null;

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (canAccessProfessionalDashboard()) return '/dashboard-pro';
    return '/dashboard-user';
  };

  // Catégories de chaque rubrique (sous-navigation)
  const SOUS_NAV: Record<string, Array<{ to: string; label: string; icon?: typeof BookOpen }>> = {
    '/oeuvres': [
      { to: '/oeuvres', label: t('common.all', 'Tous') },
      { to: '/oeuvres?type=1', label: t('header.nav.books', 'Livres'), icon: BookOpen },
      { to: '/oeuvres?type=2', label: t('header.nav.films', 'Films'), icon: Film },
      { to: '/oeuvres?type=3', label: t('header.nav.music', 'Musique'), icon: Music },
      { to: '/oeuvres?type=4', label: t('header.nav.articles', 'Articles'), icon: FileText },
      { to: '/oeuvres?type=5', label: t('header.nav.research', 'Recherche scientifique'), icon: Beaker },
      { to: '/oeuvres?type=6', label: t('header.nav.art', 'Œuvres d\'art'), icon: Palette },
      // Annuaire des organisations, filtré sur les maisons d'édition
      { to: '/organisations?categorie=edition', label: t('organisations.menu.edition', 'Maisons d\'édition'), icon: Library },
    ],
    // Libellés au pluriel propres à la bande : les clés events.types.* servent aussi
    // aux badges de type (au singulier), on ne les touche pas (audit V11 UX-31).
    '/evenements': [
      { to: '/evenements', label: t('common.all', 'Tous') },
      { to: '/evenements?type=exposition', label: t('events.types.exposition', 'Expositions') },
      { to: '/evenements?type=concert', label: t('header.nav.concerts', 'Concerts') },
      { to: '/evenements?type=festival', label: t('header.nav.festivals', 'Festivals') },
      { to: '/evenements?type=conference', label: t('header.nav.conferences', 'Conférences') },
      { to: '/evenements?type=atelier', label: t('events.types.atelier', 'Ateliers') },
      { to: '/evenements?type=spectacle', label: t('events.types.spectacle', 'Spectacles') },
      // Annuaire des organisations, filtré sur les associations
      { to: '/organisations?categorie=associations', label: t('organisations.menu.associations', 'Associations et organisateurs'), icon: Users },
    ],
    '/patrimoine': [
      { to: '/patrimoine', label: t('common.all', 'Tous') },
      { to: '/patrimoine?type=monument', label: t('patrimoine.types.monument', 'Monuments'), icon: Landmark },
      { to: '/patrimoine?type=musee', label: t('patrimoine.types.musee', 'Musées'), icon: Building2 },
      { to: '/patrimoine?type=site_archeologique', label: t('patrimoine.types.site_archeologique', 'Sites archéologiques'), icon: Building2 },
      { to: '/patrimoine?type=site_naturel', label: t('patrimoine.types.site_naturel', 'Sites naturels'), icon: Trees },
      { to: '/patrimoine?type=ville_village', label: t('patrimoine.types.ville_village', 'Villes historiques'), icon: Compass },
      { to: '/patrimoine?type=edifice_religieux', label: t('patrimoine.types.edifice_religieux', 'Édifices religieux'), icon: Landmark },
      { to: '/patrimoine/services', label: t('servicesVisiteurs.menu', 'Services aux visiteurs'), icon: Store },
    ],
    '/artisanat': [
      { to: '/artisanat', label: t('common.all', 'Tous') },
      { to: '/artisanat?materiau=bois', label: t('artisanat.materiaux.bois', 'Bois') },
      { to: '/artisanat?materiau=cuir', label: t('artisanat.materiaux.cuir', 'Cuir') },
      { to: '/artisanat?materiau=ceramique', label: t('artisanat.materiaux.ceramique', 'Céramique') },
      { to: '/artisanat?materiau=textile', label: t('artisanat.materiaux.textile', 'Textile') },
      { to: '/artisanat?materiau=metal', label: t('artisanat.materiaux.metal', 'Métal') },
      { to: '/artisanat?materiau=bijoux', label: t('artisanat.materiaux.bijoux', 'Bijoux') },
      { to: '/artisanat/gastronomie', label: t('gastronomie.menu', 'Gastronomie'), icon: Utensils },
    ],
  };
  // La sous-page Gastronomie garde le menu de l'Artisanat
  SOUS_NAV['/artisanat/gastronomie'] = SOUS_NAV['/artisanat'];
  // La sous-page Services aux visiteurs garde le menu du Patrimoine
  SOUS_NAV['/patrimoine/services'] = SOUS_NAV['/patrimoine'];
  const sousNav = SOUS_NAV[location.pathname];

  return (
    <>
      <header className="fixed top-0 start-0 end-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4">

            {/* Logo et titre */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {/* Le Madghacen (mausolée numide, Batna) en miniature. Photo : Bernard Gagnon, CC BY 4.0 */}
              <img
                src="/medracen.webp"
                alt=""
                width={96}
                height={96}
                className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-stone-200 dark:ring-stone-700"
              />
              <div className="flex flex-col">
                {/* Logo TALADZ (pas de h1 : le seul h1 de chaque page est celui de son contenu) ;
                    fond clair en mode sombre, le vert du logo y serait peu lisible */}
                <img
                  src="/logo-taladz.webp"
                  alt={t('header.title')}
                  width={350}
                  height={87}
                  className="h-5 sm:h-6 w-auto self-start dark:bg-stone-100 dark:rounded dark:px-1"
                />
                {/* Phrase sous le logo : masquée de 1280 à 1535 px, où le menu complet a besoin de la place */}
                <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 hidden sm:block xl:hidden 2xl:block whitespace-nowrap">
                  {t('header.subtitle')}
                </p>
              </div>
            </Link>

            {/* Menu complet à partir de 1280 px (xl). Avant : dès 1024 px, et l'en-tête (≈ 1 365 px en français)
                poussait « Se connecter », « S'inscrire » et la langue hors de l'écran (audit V11 UX-1).
                De 1280 à 1535 px : liens sans icône, plus serrés ; icônes à partir de 1536 px (2xl). */}
            <nav className="hidden xl:flex items-center min-w-0" aria-label={t('header.nav.mainLabel', 'Navigation principale')}>
              <div className="flex items-center gap-0.5 2xl:gap-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    aria-current={isCurrentSection(item.href) ? 'page' : undefined}
                    className="flex items-center gap-1.5 px-2.5 2xl:px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap aria-[current=page]:bg-stone-100 dark:aria-[current=page]:bg-stone-800"
                  >
                    <item.icon className="hidden 2xl:block h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Actions droite */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">

              {/* Installer l'application : rond vert, visible de tous tant qu'elle n'est pas installée */}
              <InstallerTalaDz rond />

              {/* Recherche générale : tout le site en une fois (audit V11 UX-13) */}
              <Button variant="ghost" asChild className="min-w-[44px] min-h-[44px] p-0">
                <Link to="/recherche" aria-label={t('recherche.ouvrir', 'Rechercher sur le site')} title={t('recherche.ouvrir', 'Rechercher sur le site')}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>

              {/* Selecteur de langue */}
              <LanguageSelector
                variant="compact"
                className="hover:bg-stone-100 dark:hover:bg-stone-800 min-w-[44px] min-h-[44px]"
              />

              {/* Notifications d'un compte connecté (nombre de non lues) */}
              {isAuthenticated && user && <NotificationBell />}

              {/* Utilisateur connecté */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0"
                      aria-label={t('header.userMenu.open', 'Menu de mon compte')}
                    >
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage src={user.photo_url} alt={user.prenom} />
                        <AvatarFallback className="bg-gradient-to-r from-stone-600 to-stone-700 text-white text-xs">
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

                    {/* Un administrateur peut aussi publier : son tableau professionnel reste accessible */}
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard-pro" className="flex items-center gap-2 min-h-[44px]">
                          <Palette className="h-4 w-4" />
                          <span>{t('header.userMenu.proDashboard')}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {portfolioLink && (
                      <DropdownMenuItem asChild>
                        <Link to={portfolioLink} className="flex items-center gap-2 min-h-[44px]">
                          <IdCard className="h-4 w-4" aria-hidden="true" />
                          <span>{t('header.userMenu.myPortfolio', 'Mon portfolio')}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

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
                      </>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to="/dashboard-user?onglet=profil" className="flex items-center gap-2 min-h-[44px]">
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

                    <DropdownMenuItem asChild>
                      <Link to="/mes-commandes" className="flex items-center gap-2 min-h-[44px]">
                        <ShoppingBag className="h-4 w-4" />
                        <span>{t('header.userMenu.myOrders', 'Mes commandes')}</span>
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
                  {/* Liens stylés en bouton (asChild) : pas de <button> dans un <a> */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[36px]"
                  >
                    <Link to="/auth">
                      <User className="h-4 w-4 sm:me-2" aria-hidden="true" />
                      {/* masqué visuellement entre sm et md, mais toujours lu par les lecteurs d'écran */}
                      <span className="sr-only md:not-sr-only">{t('common.login')}</span>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white shadow-sm min-h-[36px] px-3 sm:px-4"
                  >
                    <Link to="/auth?tab=inscription">
                      <span className="text-xs sm:text-sm">{t('common.signup')}</span>
                    </Link>
                  </Button>
                </>
              )}

              {/* Bouton menu ☰ : téléphone, tablette et petit portable (< 1280 px, xl) */}
              <Button
                variant="ghost"
                size="sm"
                className="xl:hidden min-w-[40px] min-h-[40px] p-0"
                ref={menuButtonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                onKeyDown={(e) => { if (e.key === 'Escape' && isMenuOpen) { e.preventDefault(); setIsMenuOpen(false); } }}
                aria-label={isMenuOpen ? t('header.menu.close', 'Fermer le menu') : t('header.menu.open', 'Ouvrir le menu')}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sous-navigation des rubriques (œuvres, événements, patrimoine, artisanat).
          Fixe sous l'en-tête : l'espaceur réserve sa hauteur pour ne pas masquer le titre de la page. */}
      {sousNav && (
        <>
          <nav className="fixed top-[52px] sm:top-[60px] start-0 end-0 z-40 w-full h-11 bg-stone-800 dark:bg-stone-900 border-b border-stone-700" aria-label={t('header.nav.subLabel', 'Catégories de la rubrique')}>
            <div className="w-full h-full px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
              {/* Sur téléphone, bords estompés des deux côtés (quel que soit le sens d'écriture) :
                  ils signalent que la bande défile (audit V11 UX-14). */}
              <ul className="flex h-full items-center justify-start sm:justify-center gap-1 overflow-x-auto scrollbar-hide px-3 sm:px-0 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)] sm:[mask-image:none]">
                {sousNav.map(({ to, label, icon: Icon }) => {
                  const actif = `${location.pathname}${location.search}` === to;
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        aria-current={actif ? 'page' : undefined}
                        className={`flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${actif ? 'bg-stone-100 text-stone-900' : 'text-stone-300 hover:text-white hover:bg-stone-700'}`}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
          <div className="h-11" aria-hidden="true" />
        </>
      )}

      {/* Menu mobile déroulant — visible uniquement sur mobile (< lg) */}
      {isMenuOpen && (
        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          onKeyDown={handleMobileMenuKeyDown}
          className={`fixed inset-0 ${sousNav ? 'top-[96px] sm:top-[104px]' : 'top-[52px] sm:top-[60px]'} z-40 bg-background xl:hidden overflow-y-auto`}
          style={{ height: sousNav ? 'calc(100dvh - 96px)' : 'calc(100dvh - 52px)' }}
        >
          <div className="px-4 py-4 space-y-3">
            {/* Recherche générale, en tête du menu (audit V11 UX-13) */}
            <form
              role="search"
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                const q = String(new FormData(e.currentTarget).get('q') || '').trim();
                setIsMenuOpen(false);
                navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche');
              }}
            >
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <input
                name="q"
                type="search"
                placeholder={t('recherche.placeholderCourt', 'Rechercher un lieu, un événement…')}
                aria-label={t('recherche.ouvrir', 'Rechercher sur le site')}
                className="w-full h-12 rounded-lg border bg-background !ps-10 pe-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
            <nav className="space-y-1" aria-label={t('header.nav.mainLabel', 'Navigation principale')}>
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  aria-current={isCurrentSection(item.href) ? 'page' : undefined}
                  className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px] aria-[current=page]:bg-stone-100 dark:aria-[current=page]:bg-stone-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Liens qui n'étaient que dans le pied de page, 10 à 12 écrans plus bas : la contribution
                citoyenne, les organisations, les wilayas et le guide (audit V11 UX-12). La langue est déjà
                dans la barre du haut. */}
            <Button asChild className="w-full min-h-[48px] text-base">
              <Link to="/ajouter-patrimoine" onClick={() => setIsMenuOpen(false)}>
                <PlusCircle className="h-5 w-5 me-2" aria-hidden="true" />
                {t('header.mobile.contribuer', 'Contribuer : proposer un lieu')}
              </Link>
            </Button>
            <nav className="space-y-1 pt-2 border-t" aria-label={t('header.mobile.aussi', 'À découvrir aussi')}>
              {[
                { icon: Building2, label: t('organisations.menu.toutes', 'Organisations'), href: '/organisations' },
                { icon: MapIcon, label: t('wilaya.toutes', 'Les wilayas'), href: '/wilayas' },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={isCurrentSection(item.href) ? 'page' : undefined}
                  className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px] aria-[current=page]:bg-stone-100 dark:aria-[current=page]:bg-stone-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
              {/* Guides : pages statiques, hors de l'application (lien ordinaire, comme le pied de page) */}
              <a
                href={lienSommaireGuides(i18n.language)}
                className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px]"
                onClick={() => setIsMenuOpen(false)}
              >
                <BookOpen className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span>{t('common.contributorGuide', 'Guide du contributeur')}</span>
              </a>
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

                  {isAdmin && (
                    <Link
                      to="/dashboard-pro"
                      className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Palette className="h-5 w-5 flex-shrink-0" />
                      <span>{t('header.userMenu.proDashboard')}</span>
                    </Link>
                  )}

                  {portfolioLink && (
                    <Link
                      to={portfolioLink}
                      className="flex items-center gap-3 rounded-lg p-3 text-base font-medium transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 min-h-[48px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <IdCard className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span>{t('header.userMenu.myPortfolio', 'Mon portfolio')}</span>
                    </Link>
                  )}

                  <Button
                    variant="destructive"
                    className="w-full min-h-[48px] text-base"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-5 w-5 me-2" />
                    {t('common.logout')}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" className="flex-1 w-full min-h-[48px] text-base">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>{t('common.login')}</Link>
                  </Button>
                  <Button asChild className="flex-1 w-full min-h-[48px] text-base bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white">
                    <Link to="/auth?tab=inscription" onClick={() => setIsMenuOpen(false)}>{t('common.signup')}</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;