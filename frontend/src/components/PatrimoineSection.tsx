
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Star, Navigation } from 'lucide-react';

const PatrimoineSection = () => {
  const sites = [
    {
      id: 1,
      name: 'Casbah d\'Alger',
      type: 'Site historique',
      region: 'Alger',
      description: 'Citadelle historique classée au patrimoine mondial de l\'UNESCO',
      rating: 4.8,
      visitors: '2.5k visiteurs',
      image: 'https://images.unsplash.com/photo-1466442929976-97f336a657be?auto=format&fit=crop&w=800&q=80',
      heritage: 'UNESCO'
    },
    {
      id: 2,
      name: 'Tassili n\'Ajjer',
      type: 'Parc naturel',
      region: 'Illizi',
      description: 'Art rupestre préhistorique dans un paysage lunaire unique',
      rating: 4.9,
      visitors: '800 visiteurs',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
      heritage: 'UNESCO'
    },
    {
      id: 3,
      name: 'Vallée du M\'Zab',
      type: 'Architecture',
      region: 'Ghardaïa',
      description: 'Architecture mozabite traditionnelle et mode de vie ancestral',
      rating: 4.7,
      visitors: '1.2k visiteurs',
      image: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?auto=format&fit=crop&w=800&q=80',
      heritage: 'UNESCO'
    },
  ];

  return (
    <section id="patrimoine" className="py-16 lg:py-20 bg-muted/30">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Patrimoine culturel
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explorez les trésors architecturaux et naturels qui témoignent 
            de la richesse millénaire de l'Algérie
          </p>
        </div>

        {/* Carte interactive placeholder */}
        <Card className="mb-12 overflow-hidden">
          <div className="relative h-64 lg:h-96 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <div className="text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-primary" />
              <div>
                <h3 className="text-xl font-semibold">Carte interactive du patrimoine</h3>
                <p className="text-muted-foreground">Explorez plus de 50 sites culturels à travers l'Algérie</p>
              </div>
              <Button className="group">
                <Navigation className="h-4 w-4 mr-2" />
                Ouvrir la carte
              </Button>
            </div>
          </div>
        </Card>

        {/* Grille des sites */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} className="overflow-hidden hover-lift group">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={site.image}
                  alt={site.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                  {site.heritage === 'UNESCO' && (
                    <Badge className="bg-accent text-accent-foreground">
                      UNESCO
                    </Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-background/90">
                    {site.type}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{site.name}</CardTitle>
                  <div className="flex items-center space-x-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{site.rating}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{site.region}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {site.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{site.visitors}</span>
                  </div>
                  
                  <Button size="sm" variant="ghost" className="text-primary">
                    Découvrir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline">
            Voir tous les sites patrimoniaux
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PatrimoineSection;
