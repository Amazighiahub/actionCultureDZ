/**
 * HeroSection - VERSION RESPONSIVE COMPLÈTE
 * Corrige tous les problèmes de débordement et d'adaptation aux écrans
 * Statistiques dynamiques depuis l'API
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import { ChevronRight, MapPin, Calendar, Palette, Users, Sparkles } from 'lucide-react';
import { useRTL } from '@/hooks/useRTL';
import { httpClient } from '@/services/httpClient';

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
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([]);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const heroImages = [
    {
      url: 'https://images.pexels.com/photos/19738955/pexels-photo-19738955.jpeg',
      title: 'Casbah d\'Alger',
    },
    {
      url: 'https://as2.ftcdn.net/v2/jpg/03/58/66/17/1000_F_358661751_f23PhAChuJmTE4JWAeXa15uPYcwaDclj.jpg',
      title: 'Timgad',
    },
    {
      url: 'https://images.pexels.com/photos/9180227/pexels-photo-9180227.jpeg',
      title: 'Sahara Algérien',
    },
    {
      url: 'https://images.pexels.com/photos/9254283/pexels-photo-9254283.jpeg',
      title: 'Timgad',
    },
    {
      url: 'https://thumbs.dreamstime.com/z/ruines-d-une-maison-de-berber-au-canyon-ghoufi-en-alg%C3%A9rie-121973610.jpg?ct=jpeg',
      title: 'Ghoufi',
    },
    {
      url: 'https://as2.ftcdn.net/v2/jpg/02/24/00/37/1000_F_224003731_IaY7muvK4NXdBNH1d1mLoBh6vQakVa2d.jpg',
      title: 'Kabylie',
    }
  ];

  // Charger les statistiques publiques depuis l'API
  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        setStatsLoading(true);
        const response = await httpClient.get<PublicStats>('/stats/public');
        if (response.success && response.data) {
          setPublicStats(response.data);
        }
      } catch (error) {
        console.error('Erreur chargement stats publiques:', error);
        // Garder les valeurs par défaut en cas d'erreur
      } finally {
        setStatsLoading(false);
      }
    };

    fetchPublicStats();
  }, []);

  useEffect(() => {
    setImagesLoaded(new Array(heroImages.length).fill(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

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
      style={{ height: 'clamp(500px, 80vh, 700px)' }}
    >
      {/* ===== CAROUSEL D'IMAGES ===== */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {!imagesLoaded[index] && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
            )}
            <img
              src={image.url}
              alt={image.title}
              loading={index === 0 ? "eager" : "lazy"}
              onLoad={() => handleImageLoad(index)}
              className={`w-full h-full object-cover ${
                imagesLoaded[index] ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {/* Overlay sombre */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
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
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
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
              {t('common.appName', 'Patrimoine culturel')}
            </h1>

            {/* ✅ Sous-titre responsive */}
            <p className="
              text-base xs:text-lg sm:text-xl md:text-2xl 
              mb-5 sm:mb-6 md:mb-8 
              text-gray-200
              max-w-2xl
              mx-auto sm:mx-0
            ">
              {t('home.hero.subtitle', 'Explorez, préservez et partagez la richesse culturelle de l\'Algérie')}
            </p>

            {/* ✅ Boutons CTA - Stack sur mobile, côte à côte sur tablet+ */}
            <div className="
              flex flex-col xs:flex-row 
              gap-3 sm:gap-4 
              justify-center sm:justify-start
              mb-8 sm:mb-10 md:mb-12
            ">
              <Button 
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
                onClick={() => navigate('/patrimoine')}
              >
                {t('home.hero.explore', 'Explorer le patrimoine')}
                <ChevronRight className={`h-4 w-4 sm:h-5 sm:w-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>
              
              <Button 
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
                onClick={() => navigate('/auth')}
              >
                {t('home.hero.contribute', 'Contribuer')}
              </Button>
            </div>

            {/* ✅ Stats - Grid responsive 2x2 sur mobile, 4 colonnes sur tablet+ */}
            <div className="
              grid grid-cols-2 sm:grid-cols-4 
              gap-4 sm:gap-6 md:gap-8
              max-w-xl sm:max-w-none
              mx-auto sm:mx-0
            ">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  className="text-center group cursor-pointer"
                >
                  <stat.icon className="
                    h-5 w-5 sm:h-6 sm:w-6 
                    mx-auto mb-1.5 sm:mb-2 
                    text-white/80 
                    group-hover:scale-110 transition-transform
                  " />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                    {stat.value}
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

      {/* ===== INDICATEURS DU CAROUSEL ===== */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`
              h-2 rounded-full transition-all duration-300
              ${index === currentSlide 
                ? 'w-6 sm:w-8 bg-white' 
                : 'w-2 bg-white/50 hover:bg-white/70'
              }
            `}
            aria-label={`Image ${index + 1}`}
          />
        ))}
      </div>

      {/* ===== GRADIENT BAS ===== */}
      <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;