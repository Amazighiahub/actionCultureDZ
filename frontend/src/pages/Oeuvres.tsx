
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Eye, ShoppingCart } from 'lucide-react';

const Oeuvres = () => {
  const oeuvres = [
    {
      titre: 'L\'Étranger',
      auteur: 'Albert Camus',
      type: 'Littérature',
      note: 4.8,
      avis: 1250,
      telechargements: '15k',
      prix: '800 DA',
      description: 'Roman emblématique de la littérature française du XXe siècle',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80',
      tags: ['Classique', 'Philosophie', 'Absurde']
    },
    {
      titre: 'La Bataille d\'Alger',
      auteur: 'Gillo Pontecorvo',
      type: 'Cinéma',
      note: 4.9,
      avis: 892,
      telechargements: '8.5k',
      prix: '1200 DA',
      description: 'Film historique sur la guerre d\'indépendance algérienne',
      image: 'https://images.unsplash.com/photo-1489599849568-75adb9eeb544?auto=format&fit=crop&w=400&q=80',
      tags: ['Histoire', 'Guerre', 'Indépendance']
    },
    {
      titre: 'Calligraphie Maghrébine Contemporaine',
      auteur: 'Collectif d\'artistes',
      type: 'Art visuel',
      note: 4.6,
      avis: 423,
      telechargements: '3.2k',
      prix: '1500 DA',
      description: 'Collection d\'œuvres de calligraphie moderne du Maghreb',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=80',
      tags: ['Calligraphie', 'Art contemporain', 'Tradition']
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            Bibliothèque numérique
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Téléchargez les œuvres littéraires, cinématographiques et artistiques
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          <Button variant="outline" size="sm">Toutes catégories</Button>
          <Button variant="outline" size="sm">Littérature</Button>
          <Button variant="outline" size="sm">Cinéma</Button>
          <Button variant="outline" size="sm">Art visuel</Button>
          <Button variant="outline" size="sm">Musique</Button>
        </div>

        {/* Liste des œuvres */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {oeuvres.map((oeuvre) => (
            <Card key={oeuvre.titre} className="overflow-hidden hover-lift">
              <div className="aspect-[3/4]">
                <img 
                  src={oeuvre.image} 
                  alt={oeuvre.titre}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="space-y-2">
                  <Badge variant="secondary" className="self-start">
                    {oeuvre.type}
                  </Badge>
                  <CardTitle className="font-serif leading-tight">
                    {oeuvre.titre}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{oeuvre.auteur}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {oeuvre.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {oeuvre.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{oeuvre.note}</span>
                    <span className="text-muted-foreground">({oeuvre.avis})</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{oeuvre.telechargements}</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-primary">{oeuvre.prix}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Aperçu
                    </Button>
                    <Button size="sm" className="flex-1 btn-hover">
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Acheter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Oeuvres;
