import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRTL } from '@/hooks/useRTL';
import { Button } from '@/components/UI/button';
import { Card, CardContent } from '@/components/UI/card';
import { MapPin, Calendar, Palette, ArrowRight } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { rtlClasses, direction } = useRTL();

  // Helper function pour ajouter le préfixe
  const tHero = (key: string) => t(`sections.hero.${key}`);

  const quickActions = [
    {
      id: 'discover',
      icon: MapPin,
      titleKey: 'quickActions.discover.title',
      descriptionKey: 'quickActions.discover.description',
      href: '/patrimoine',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'events',
      icon: Calendar,
      titleKey: 'quickActions.events.title',
      descriptionKey: 'quickActions.events.description',
      href: '/evenements',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'works',
      icon: Palette,
      titleKey: 'quickActions.works.title',
      descriptionKey: 'quickActions.works.description',
      href: '/oeuvres',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <section className="relative bg-gradient-to-br from-background to-muted py-20 md:py-32" dir={direction}>
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Section de texte */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                {tHero('title')}
                <span className="text-primary block">
                  {tHero('titleHighlight')}
                </span>
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                {tHero('subtitle')}
              </p>
            </div>
            
            <div className={`flex flex-col gap-4 sm:flex-row ${rtlClasses.flexRow}`}>
              <Button 
                size="lg" 
                onClick={() => navigate('/patrimoine')}
                className="group"
              >
                {tHero('cta.explore')}
                <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} transition-transform group-hover:translate-x-1`} />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/a-propos')}
              >
                {tHero('cta.learnMore')}
              </Button>
            </div>
          </div>

          {/* Section actions rapides */}
          <div className="lg:pl-8">
            <h2 className="mb-6 text-2xl font-semibold">
              {tHero('quickActions.title')}
            </h2>
            
            <div className="space-y-4">
              {quickActions.map((action) => (
                <Card 
                  key={action.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${action.bgColor}`}
                  onClick={() => navigate(action.href)}
                >
                  <CardContent className="p-6">
                    <div className={`flex items-center gap-4 ${rtlClasses.flexRow}`}>
                      <div className={`rounded-lg bg-white p-3 shadow-sm`}>
                        <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {tHero(action.titleKey)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {tHero(action.descriptionKey)}
                        </p>
                      </div>
                      <ArrowRight className={`h-5 w-5 text-muted-foreground ${rtlClasses.direction === 'rtl' ? 'rotate-180' : ''}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Élément décoratif */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40rem] left-[50%] h-[80rem] w-[80rem] -translate-x-[50%] rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 opacity-20 blur-3xl" />
      </div>
    </section>
  );
};

export default HeroSection;