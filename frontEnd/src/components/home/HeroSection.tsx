/**
 * HeroSection - VERSION RESPONSIVE COMPLÈTE
 * Corrige tous les problèmes de débordement et d'adaptation aux écrans
 * Statistiques dynamiques depuis l'API
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin, Calendar, Palette, Users, Sparkles, Pause, Play } from 'lucide-react';
import { useRTL } from '@/hooks/useRTL';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicStats {
  sites_patrimoniaux: number;
  sites_patrimoniaux_formatted: string;
  evenements: number;
  evenements_formatted: string;
  oeuvres: number;
  oeuvres_formatted: string;
  membres: number;
  membres_formatted: string;
}

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  const { isAuthenticated } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([]);
  // Images déjà montées : une image n'est téléchargée qu'au moment d'être affichée
  const [mountedSlides, setMountedSlides] = useState<Set<number>>(() => new Set([0]));
  const [paused, setPaused] = useState(false);

  // Réglage système « réduire les animations » : pas de défilement automatique
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  // Images locales du patrimoine algérien : plusieurs largeurs (srcSet), le navigateur
  // télécharge la plus adaptée à l'écran (66 Ko sur mobile au lieu de 500 Ko)
  const heroImages = [
    {
      url: '/images/hero/timgad-1280.webp',
      srcSet: '/images/hero/timgad-768.webp 768w, /images/hero/timgad-1280.webp 1280w, /images/hero/timgad-1920.webp 1920w',
      fallback: '/images/hero/timgad.jpg',
      title: t('home.hero.slides.timgad', 'Ruines romaines de Timgad'),
    },
    {
      url: '/images/hero/sahara-1280.webp',
      srcSet: '/images/hero/sahara-768.webp 768w, /images/hero/sahara-1280.webp 1280w, /images/hero/sahara-1920.webp 1920w',
      fallback: '/images/hero/sahara.jpg',
      title: t('home.hero.slides.sahara', 'Sahara algérien'),
    },
    {
      url: '/images/hero/casbah-alger.webp',
      srcSet: '/images/hero/casbah-alger-768.webp 768w, /images/hero/casbah-alger.webp 1029w',
      fallback: '/images/hero/casbah-alger.jpg',
      title: t('home.hero.slides.casbah', "Casbah d'Alger"),
    },
    {
      url: '/images/hero/grenier.webp',
      srcSet: '/images/hero/grenier-768.webp 768w, /images/hero/grenier.webp 960w',
      fallback: '/images/hero/grenier.jpg',
      title: t('home.hero.slides.grenier', 'Grenier traditionnel'),
    }
  ];

  // Statistiques publiques (React Query : en cache, pas rechargées à chaque retour sur l'accueil).
  // En cas d'erreur, les valeurs par défaut ("...") restent affichées.
  const { data: publicStats = null, isLoading: statsLoading } = useQuery({
    queryKey: ['home', 'stats', 'public'],
    queryFn: async (): Promise<PublicStats | null> => {
      const response = await httpClient.get<PublicStats>('/stats/public');
      return response.success && response.data ? response.data : null;
    },
  });

  useEffect(() => {
    setImagesLoaded(new Array(heroImages.length).fill(false));
  }, []);

  // Défilement automatique, sauf en pause ou si l'utilisateur limite les animations
  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length, paused, reduceMotion]);

  // Monter l'image courante et précharger la suivante juste avant son tour
  useEffect(() => {
    setMountedSlides((prev) => {
      const next = (currentSlide + 1) % heroImages.length;
      if (prev.has(currentSlide) && prev.has(next)) return prev;
      return new Set([...prev, currentSlide, next]);
    });
  }, [currentSlide, heroImages.length]);

  const handleImageLoad = (index: number) => {
    setImagesLoaded(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  // Statistiques dynamiques depuis l'API ou valeurs par défaut
  const stats = [
    { 
      icon: MapPin, 
      value: publicStats?.sites_patrimoniaux_formatted || '...', 
      label: t('home.stats.heritage', 'sites patrimoniaux') 
    },
    { 
      icon: Calendar, 
      value: publicStats?.evenements_formatted || '...', 
      label: t('home.stats.events', 'événements') 
    },
    { 
      icon: Palette, 
      value: publicStats?.oeuvres_formatted || '...', 
      label: t('home.stats.works', 'œuvres') 
    },
    { 
      icon: Users, 
      value: publicStats?.membres_formatted || '...', 
      label: t('home.stats.members', 'membres') 
    }
  ];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: '100vh', minHeight: '600px', maxHeight: '900px' }}
    >
      {/* ===== CAROUSEL D'IMAGES ===== */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={image.url}
            // Images masquées : invisibles aussi pour les lecteurs d'écran
            aria-hidden={index !== currentSlide}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {!imagesLoaded[index] && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
            )}
            {mountedSlides.has(index) && (
              <img
                src={image.url}
                srcSet={image.srcSet}
                sizes="100vw"
                alt={image.title}
                // Première image = élément principal de la page (LCP) : priorité haute, affichée
                // dès le début de son chargement ; les suivantes en priorité basse
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'low'}
                decoding={index === 0 ? 'sync' : 'async'}
                onLoad={() => handleImageLoad(index)}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (image.fallback && !target.src.endsWith(image.fallback)) {
                    target.srcset = '';
                    target.src = image.fallback;
                  }
                }}
                className={`w-full h-full object-cover object-center ${
                  index === 0 || imagesLoaded[index] ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
            {/* Overlay sombre */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </div>
        ))}
      </div>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div className="relative z-10 h-full flex items-center">
        {/* ✅ Container avec padding responsive */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24">
          {/* ✅ Contenu centré sur mobile, décalé vers la droite sur desktop */}
          <div className={`
            w-full max-w-4xl
            text-center sm:text-left
            ${isRtl
              ? 'sm:mr-0 sm:ml-auto sm:text-right'
              : 'sm:ml-8 md:ml-16 lg:ml-24 xl:ml-32 2xl:ml-40 sm:mr-auto'
            }
          `}>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 backdrop-blur-sm mb-4 sm:mb-6">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium text-white">
                {t('home.hero.badge', 'Découvrez le patrimoine culturel algérien')}
              </span>
            </div>

            {/* ✅ Titre responsive - Taille adaptative */}
            <h1 className="
              text-3xl xs:text-4xl sm:text-5xl md:text-6xl 
              font-bold mb-3 sm:mb-4 md:mb-6 
              font-serif text-white
              leading-tight
            ">
              {t('common.appName', 'Tala DZ')}
            </h1>

            {/* ✅ Sous-titre responsive */}
            <p className="
              text-base xs:text-lg sm:text-xl md:text-2xl 
              mb-5 sm:mb-6 md:mb-8 
              text-gray-200
              max-w-2xl
              mx-auto sm:mx-0
            ">
              {t('home.hero.subtitle', 'La source de la culture algérienne')}
            </p>

            {/* ✅ Boutons CTA - Stack sur mobile, côte à côte sur tablet+ */}
            <div className="
              flex flex-col xs:flex-row 
              gap-3 sm:gap-4 
              justify-center sm:justify-start
              mb-8 sm:mb-10 md:mb-12
            ">
              {/* Vrais liens (explorables par les moteurs, ouvrables dans un nouvel onglet) */}
              <Button
                asChild
                size="lg"
                className="
                  w-full xs:w-auto
                  bg-primary hover:bg-primary/90
                  shadow-xl hover:shadow-2xl
                  transition-all
                  text-sm sm:text-base
                  h-11 sm:h-12
                  px-5 sm:px-6
                "
              >
                <Link to="/patrimoine">
                  {t('home.hero.explore', 'Explorer le patrimoine')}
                  <ChevronRight aria-hidden="true" className={`h-4 w-4 sm:h-5 sm:w-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="
                  w-full xs:w-auto
                  bg-white/10 text-white
                  border-2 border-white/80
                  hover:bg-white hover:text-black
                  backdrop-blur-sm
                  transition-all duration-300
                  text-sm sm:text-base
                  h-11 sm:h-12
                  px-5 sm:px-6
                "
              >
                <Link to={isAuthenticated ? '/ajouter-patrimoine' : '/auth'}>
                  {isAuthenticated ? t('home.hero.addSite', 'Ajouter un site') : t('home.hero.contribute', 'Contribuer')}
                </Link>
              </Button>
            </div>

            {/* ✅ Stats - Grid responsive 2x2 sur mobile, 4 colonnes sur tablet+ */}
            <div className="
              grid grid-cols-2 sm:grid-cols-4 
              gap-4 sm:gap-6 md:gap-8
              max-w-xl sm:max-w-none
              mx-auto sm:mx-0
            ">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center group"
                >
                  <stat.icon aria-hidden="true" className="
                    h-5 w-5 sm:h-6 sm:w-6 
                    mx-auto mb-1.5 sm:mb-2 
                    text-white/80 
                    group-hover:scale-110 transition-transform
                  " />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12 mx-auto bg-white/20" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300 leading-tight">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== INDICATEURS DU CAROUSEL + PAUSE ===== */}
      {/* Zone cliquable de 24 px autour de chaque point (cible tactile suffisante) */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
        {heroImages.map((img, index) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setCurrentSlide(index)}
            aria-current={index === currentSlide ? 'true' : undefined}
            aria-label={t('home.hero.goToSlide', 'Image {{index}} sur {{total}} : {{title}}', {
              index: index + 1,
              total: heroImages.length,
              title: img.title,
            })}
            className="group flex h-6 items-center justify-center px-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span
              aria-hidden="true"
              className={`
                block h-2 rounded-full transition-all duration-300
                ${index === currentSlide
                  ? 'w-6 sm:w-8 bg-white'
                  : 'w-2 bg-white/50 group-hover:bg-white/70'
                }
              `}
            />
          </button>
        ))}
        {!reduceMotion && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t('home.hero.play', 'Reprendre le défilement') : t('home.hero.pause', 'Mettre en pause le défilement')}
            aria-pressed={paused}
            className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {paused ? <Play className="h-3 w-3" aria-hidden="true" /> : <Pause className="h-3 w-3" aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* ===== GRADIENT BAS ===== */}
      <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;