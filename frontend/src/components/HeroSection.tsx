
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, MapPin, Calendar, Palette } from 'lucide-react';

const HeroSection = () => {
  const quickActions = [
    {
      icon: MapPin,
      title: 'Découvrir un lieu',
      description: 'Explorez le patrimoine algérien',
      color: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      icon: Calendar,
      title: 'Voir un événement',
      description: 'Événements culturels à venir',
      color: 'bg-accent/10 text-accent border-accent/20',
    },
    {
      icon: Palette,
      title: 'Parcourir une œuvre',
      description: 'Art, littérature et cinéma',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary/30 to-background">
      {/* Motif géométrique de fond */}
      <div className="absolute inset-0 pattern-geometric" />
      
      <div className="container relative py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Contenu principal */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Découvrez la richesse culturelle de l'
                <span className="text-gradient">Algérie</span>
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl">
                Plongez dans la richesse du patrimoine, vivez les événements culturels et admirez les œuvres qui font rayonner notre culture.
              </p>
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="group">
                Commencer l'exploration
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="lg">
                En savoir plus
              </Button>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center lg:text-left">
              Actions rapides
            </h2>
            <div className="grid gap-4">
              {quickActions.map((action, index) => (
                <Card 
                  key={action.title}
                  className={`p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer border-2 ${action.color}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-current/10">
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm opacity-80">{action.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-60" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
