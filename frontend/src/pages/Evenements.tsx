
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, DollarSign } from 'lucide-react';

const Evenements = () => {
  const evenements = [
    {
      nom: 'Festival de Musique Andalouse',
      lieu: 'Tlemcen',
      date: '15-20 Mars 2024',
      statut: 'À venir',
      type: 'Festival',
      description: 'Célébration de la musique andalouse avec des artistes renommés',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
      participants: '450/500',
      tarif: 'Gratuit'
    },
    {
      nom: 'Exposition d\'Art Contemporain Maghrébin',
      lieu: 'Alger',
      date: '10-25 Avril 2024',
      statut: 'À venir',
      type: 'Exposition',
      description: 'Découverte de l\'art contemporain du Maghreb',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=600&q=80',
      participants: '120/200',
      tarif: '300 DA'
    },
    {
      nom: 'Journées du Patrimoine Amazigh',
      lieu: 'Béjaïa',
      date: '5-7 Mai 2024',
      statut: 'À venir',
      type: 'Conférence',
      description: 'Conférences et ateliers sur la culture amazighe',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
      participants: '80/150',
      tarif: '500 DA'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            Événements culturels
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Participez aux événements qui animent la scène culturelle algérienne
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <Button variant="outline" size="sm">Tous les statuts</Button>
          <Button variant="outline" size="sm">À venir</Button>
          <Button variant="outline" size="sm">En cours</Button>
          <Button variant="outline" size="sm">Passés</Button>
        </div>

        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          <Button variant="outline" size="sm">Toutes catégories</Button>
          <Button variant="outline" size="sm">Festivals</Button>
          <Button variant="outline" size="sm">Expositions</Button>
          <Button variant="outline" size="sm">Conférences</Button>
          <Button variant="outline" size="sm">Ateliers</Button>
        </div>

        {/* Liste des événements */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {evenements.map((evenement) => (
            <Card key={evenement.nom} className="overflow-hidden hover-lift">
              <div className="aspect-video">
                <img 
                  src={evenement.image} 
                  alt={evenement.nom}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="font-serif text-lg leading-tight">
                    {evenement.nom}
                  </CardTitle>
                  <Badge variant={evenement.statut === 'À venir' ? 'default' : 'secondary'}>
                    {evenement.statut}
                  </Badge>
                </div>
                <Badge variant="outline" className="self-start">
                  {evenement.type}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {evenement.description}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{evenement.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{evenement.lieu}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{evenement.participants}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-medium">{evenement.tarif}</span>
                  </div>
                </div>
                
                <Button className="w-full btn-hover">
                  S'inscrire
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Evenements;
