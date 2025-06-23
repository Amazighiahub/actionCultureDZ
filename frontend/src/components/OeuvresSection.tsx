
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Eye, BookOpen, Film, Palette } from 'lucide-react';

const OeuvresSection = () => {
  const oeuvres = [
    {
      id: 1,
      title: 'L\'Étranger',
      author: 'Albert Camus',
      type: 'Littérature',
      category: 'Roman',
      rating: 4.8,
      reviews: 324,
      price: '800 DA',
      description: 'Chef-d\'œuvre de la littérature existentialiste par l\'auteur franco-algérien',
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
      icon: BookOpen,
      downloads: '2.1k'
    },
    {
      id: 2,
      title: 'La Bataille d\'Alger',
      author: 'Gillo Pontecorvo',
      type: 'Cinéma',
      category: 'Film historique',
      rating: 4.9,
      reviews: 187,
      price: '1200 DA',
      description: 'Film emblématique sur la guerre d\'indépendance algérienne',
      image: 'https://images.unsplash.com/photo-1489599446429-e69b6a9ad163?auto=format&fit=crop&w=800&q=80',
      icon: Film,
      downloads: '856'
    },
    {
      id: 3,
      title: 'Calligraphie Maghrébine Contemporaine',
      author: 'Rachid Koraïchi',
      type: 'Art visuel',
      category: 'Collection',
      rating: 4.7,
      reviews: 92,
      price: '1500 DA',
      description: 'Œuvres calligraphiques mêlant tradition arabe et modernité',
      image: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=800&q=80',
      icon: Palette,
      downloads: '423'
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Littérature':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Cinéma':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Art visuel':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <section id="oeuvres" className="py-16 lg:py-20 bg-muted/30">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Bibliothèque numérique
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez et téléchargez les œuvres littéraires, cinématographiques 
            et artistiques qui enrichissent le patrimoine culturel algérien
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {oeuvres.map((oeuvre) => {
            const IconComponent = oeuvre.icon;
            return (
              <Card key={oeuvre.id} className="overflow-hidden hover-lift">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={oeuvre.image}
                    alt={oeuvre.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className={getTypeColor(oeuvre.type)}>
                      <IconComponent className="h-3 w-3 mr-1" />
                      {oeuvre.type}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-background/90">
                      {oeuvre.category}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-1 text-lg">
                    {oeuvre.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    par {oeuvre.author}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{oeuvre.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({oeuvre.reviews} avis)
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {oeuvre.price}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {oeuvre.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Download className="h-3 w-3" />
                      <span>{oeuvre.downloads} téléchargements</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>Aperçu disponible</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Aperçu
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Acheter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline">
            Explorer toute la bibliothèque
          </Button>
        </div>
      </div>
    </section>
  );
};

export default OeuvresSection;
