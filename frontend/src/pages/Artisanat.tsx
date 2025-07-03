
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Mountain, Brush, ShoppingBag } from 'lucide-react';import { useTranslation } from "react-i18next";

const Artisanat = () => {const { t } = useTranslation();
  const artisanatCategories = [
  {
    icon: Palette,
    title: t("artisanat.title_tissage_textile_traditionnel"),
    description: t("artisanat.description_fouta_hak_tissus"),
    image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=600&q=80',
    items: ['Fouta traditionnelle', 'Haïk de mariée', 'Broderies kabyles', 'Tapis berbères'],
    color: 'bg-primary/10 border-primary/20'
  },
  {
    icon: Mountain,
    title: t("artisanat.title_cramique_poterie_sud"),
    description: t("artisanat.description_techniques_ancestrales_forme"),
    image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80',
    items: ['Poteries de Biskra', 'Céramiques de Ghardaïa', 'Jarres traditionnelles', 'Art géométrique'],
    color: 'bg-accent/10 border-accent/20'
  },
  {
    icon: Brush,
    title: t("artisanat.title_peinture_calligraphie"),
    description: t("artisanat.description_arabesque_art_contemporain"),
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=600&q=80',
    items: ['Calligraphie arabe', 'Art amazigh', 'Peintures sur bois', 'Arabesques contemporaines'],
    color: 'bg-secondary/10 border-secondary/20'
  }];


  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">{t("artisanat.artisanat_algrien")}

          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t("artisanat.dcouvrez_les_mtiers")}

          </p>
        </div>

        {/* Catégories d'artisanat */}
        <div className="grid gap-8 lg:gap-12 mb-16">
          {artisanatCategories.map((category, index) =>
          <Card key={category.title} className={`overflow-hidden hover-lift ${category.color}`}>
              <div className="grid md:grid-cols-2 gap-0">
                <div className="aspect-square md:aspect-auto">
                  <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover" />

                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-current/10">
                      <category.icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-semibold font-serif">{category.title}</h2>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    {category.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {category.items.map((item) =>
                  <Badge key={item} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                  )}
                  </div>
                  
                  <Button variant="outline" className="self-start btn-hover">{t("artisanat.explorer_cette_catgorie")}

                </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Section boutique à venir */}
        <Card className="p-12 text-center bg-gradient-to-br from-cultural-sand/20 to-cultural-terracotta/20 border-2 border-dashed">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold font-serif">{t("artisanat.boutique_ligne")}

            </h2>
            
            <p className="text-lg text-muted-foreground">{t("artisanat.bientt_disponible_achetez")}


            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" disabled className="opacity-60">{t("artisanat.acheter_produit_local")}

              </Button>
              <Button variant="outline" size="lg">{t("artisanat.tre_notifi_lancement")}

              </Button>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>);

};

export default Artisanat;