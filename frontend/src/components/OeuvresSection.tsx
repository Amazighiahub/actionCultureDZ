
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Star, Download, Eye, BookOpen, Film, Palette } from 'lucide-react';import { useTranslation } from "react-i18next";

const OeuvresSection = () => {const { t } = useTranslation();
  const oeuvres = [
  {
    id: 1,
    title: t("common_oeuvressection.title_ltranger"),
    author: 'Albert Camus',
    type: 'Littérature',
    category: 'Roman',
    rating: 4.8,
    reviews: 324,
    price: '800 DA',
    description: t("common_oeuvressection.description_chefduvre_littrature_existen"),
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
    icon: BookOpen,
    downloads: '2.1k'
  },
  {
    id: 2,
    title: t("common_oeuvressection.title_bataille_dalger"),
    author: 'Gillo Pontecorvo',
    type: 'Cinéma',
    category: 'Film historique',
    rating: 4.9,
    reviews: 187,
    price: '1200 DA',
    description: t("common_oeuvressection.description_film_emblmatique_sur"),
    image: 'https://images.unsplash.com/photo-1489599446429-e69b6a9ad163?auto=format&fit=crop&w=800&q=80',
    icon: Film,
    downloads: '856'
  },
  {
    id: 3,
    title: t("common_oeuvressection.title_calligraphie_maghrbine_contemporai"),
    author: 'Rachid Koraïchi',
    type: 'Art visuel',
    category: 'Collection',
    rating: 4.7,
    reviews: 92,
    price: '1500 DA',
    description: t("common_oeuvressection.description_uvres_calligraphiques_mlant"),
    image: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=800&q=80',
    icon: Palette,
    downloads: '423'
  }];


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
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">{t("common_oeuvressection.bibliothque_numrique")}

          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("common_oeuvressection.dcouvrez_tlchargez_les")}


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
                    className="h-full w-full object-cover" />

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
                  <p className="text-sm text-muted-foreground">{t("common_oeuvressection.par")}
                    {oeuvre.author}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{oeuvre.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({oeuvre.reviews}{t("common_oeuvressection.avis")}
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
                      <span>{oeuvre.downloads}{t("common_oeuvressection.tlchargements")}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{t("common_oeuvressection.aperu_disponible")}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />{t("common_oeuvressection.aperu")}

                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />{t("common_oeuvressection.acheter")}

                    </Button>
                  </div>
                </CardContent>
              </Card>);

          })}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline">{t("common_oeuvressection.explorer_toute_bibliothque")}

          </Button>
        </div>
      </div>
    </section>);

};

export default OeuvresSection;