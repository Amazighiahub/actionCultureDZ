import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import { ChevronRight, MapPin, Calendar, Palette, Users } from 'lucide-react';

const EnhancedHeroSection = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Images du carousel
  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1600',
      title: 'Casbah d\'Alger',
      subtitle: 'Patrimoine mondial UNESCO'
    },
    {
      url: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=1600',
      title: 'Sahara Algérien',
      subtitle: 'Beauté naturelle exceptionnelle'
    },
    {
      url: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=1600',
      title: 'Architecture Traditionnelle',
      subtitle: 'Art et savoir-faire ancestral'
    }
  ];

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[600px] md:h-[700px] overflow-hidden">
      {/* Carousel d'images */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
        ))}
      </div>

      {/* Contenu */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container">
          <div className="max-w-3xl text-white">
            {/* Badge animé */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6 animate-fade-in">
              <span className="text-sm font-medium">
                {t('home.hero.badge', 'Découvrez le patrimoine culturel algérien')}
              </span>
            </div>

            {/* Titre principal avec animation */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up">
              {t('home.hero.title', 'Bienvenue sur Patrimoine DZ')}
            </h1>

            {/* Sous-titre */}
            <p className="text-xl md:text-2xl mb-8 text-gray-200 animate-slide-up animation-delay-200">
              {t('home.hero.subtitle', 'Explorez, préservez et partagez la richesse culturelle de l\'Algérie')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 animate-slide-up animation-delay-400">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {t('home.hero.explore', 'Explorer le patrimoine')}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/20">
                {t('home.hero.contribute', 'Contribuer')}
              </Button>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 animate-fade-in animation-delay-600">
              {[
                { icon: MapPin, value: '1000+', label: t('home.hero.sites', 'Sites patrimoniaux') },
                { icon: Calendar, value: '500+', label: t('home.hero.events', 'Événements') },
                { icon: Palette, value: '2000+', label: t('home.hero.works', 'Œuvres') },
                { icon: Users, value: '10k+', label: t('home.hero.members', 'Membres') }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary-foreground/80" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicateurs de carousel */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'w-8 bg-white' : 'bg-white/50'
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Motif décoratif en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default EnhancedHeroSection;