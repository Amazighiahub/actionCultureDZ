
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartePatrimoine from '@/components/CartePatrimoine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users, QrCode, Compass } from 'lucide-react';

const Patrimoine = () => {
  const lieuxComplements = [
    {
      nom: 'Ksar de Beni Isguen',
      region: 'Ghardaïa',
      type: 'Architecture berbère',
      description: 'Ville fortifiée traditionnelle du M\'zab avec architecture défensive unique',
      image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80',
      visiteurs: '25k/an',
      duree: '1-2h'
    },
    {
      nom: 'Pont de Sidi M\'Cid',
      region: 'Constantine',
      type: 'Monument moderne',
      description: 'Pont suspendu emblématique de la ville des ponts suspendus',
      image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=600&q=80',
      visiteurs: '180k/an',
      duree: '30min'
    },
    {
      nom: 'Musée du Bardo',
      region: 'Alger',
      type: 'Musée ethnographique',
      description: 'Collections d\'art et traditions populaires algériennes',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=600&q=80',
      visiteurs: '95k/an',
      duree: '1-2h'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            Patrimoine culturel
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Découvrez les trésors historiques et culturels de l'Algérie à travers une carte interactive
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <Button variant="outline" size="sm">Toutes les régions</Button>
          <Button variant="outline" size="sm">Monuments UNESCO</Button>
          <Button variant="outline" size="sm">Sites archéologiques</Button>
          <Button variant="outline" size="sm">Architecture traditionnelle</Button>
        </div>

        {/* Carte interactive */}
        <div className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <Compass className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold font-serif">Explorez sur la carte</h2>
          </div>
          <CartePatrimoine />
        </div>

        {/* Sites complémentaires */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold font-serif mb-6 text-center">Autres sites remarquables</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {lieuxComplements.map((lieu) => (
              <Card key={lieu.nom} className="overflow-hidden hover-lift">
                <div className="aspect-video">
                  <img 
                    src={lieu.image} 
                    alt={lieu.nom}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-serif">{lieu.nom}</CardTitle>
                      <p className="text-sm text-muted-foreground">{lieu.region}</p>
                    </div>
                    <Badge variant="secondary">{lieu.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {lieu.description}
                  </p>
                  
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{lieu.visiteurs}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{lieu.duree}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button className="flex-1 btn-hover">
                      Découvrir
                    </Button>
                    <Button variant="outline" size="icon">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Section informative */}
        <Card className="text-center p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="space-y-4">
            <MapPin className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-2xl font-semibold font-serif">Planifiez votre visite</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Utilisez notre carte interactive pour créer votre itinéraire personnalisé et découvrir 
              les merveilles du patrimoine algérien. Choisissez un parcours thématique ou explorez 
              librement les sites qui vous intéressent.
            </p>
            <div className="flex justify-center space-x-4">
              <Button size="lg">
                Commencer l'exploration
              </Button>
              <Button size="lg" variant="outline">
                Guide pratique
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Patrimoine;
