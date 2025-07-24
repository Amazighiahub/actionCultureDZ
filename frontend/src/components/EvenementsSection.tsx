
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';import { useTranslation } from "react-i18next";

const EvenementsSection = () => {const { t } = useTranslation();
  const events = [
  {
    id: 1,
    title: t("common_evenementssection.title_festival_international_musique"),
    type: 'Musique',
    date: '15-20 Juillet 2024',
    location: 'Tlemcen',
    participants: 156,
    maxParticipants: 300,
    status: 'À venir',
    description: t("common_evenementssection.description_clbration_lhritage_musical"),
    price: 'Gratuit',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    title: t("common_evenementssection.title_exposition_dart_contemporain"),
    type: 'Art visuel',
    date: '5-25 Août 2024',
    location: 'Oran',
    participants: 89,
    maxParticipants: 200,
    status: 'Inscriptions ouvertes',
    description: t("common_evenementssection.description_dcouverte_des_uvres"),
    price: '500 DA',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    title: t("common_evenementssection.title_journes_patrimoine_amazigh"),
    type: 'Culture',
    date: '10-12 Septembre 2024',
    location: 'Batna',
    participants: 234,
    maxParticipants: 400,
    status: 'Presque complet',
    description: t("common_evenementssection.description_immersion_dans_culture"),
    price: '300 DA',
    image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?auto=format&fit=crop&w=800&q=80'
  }];


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'À venir':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Inscriptions ouvertes':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Presque complet':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <section id="evenements" className="py-16 lg:py-20">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">{t("common_evenementssection.vnements_culturels")}

          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("common_evenementssection.participez_aux_festivals")}


          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event) =>
          <Card key={event.id} className="overflow-hidden hover-lift">
              <div className="relative h-48 overflow-hidden">
                <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover" />

                <div className="absolute top-4 left-4">
                  <Badge className={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-background/90">
                    {event.type}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 leading-tight">
                  {event.title}
                </CardTitle>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{event.participants}/{event.maxParticipants}</span>
                    </div>
                    <span className="font-semibold text-primary">{event.price}</span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${event.participants / event.maxParticipants * 100}%`
                    }} />

                  </div>
                  
                  <Button className="w-full" size="sm">{t("common_evenementssection.sinscrire_lvnement")}

                </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline">{t("common_evenementssection.voir_tous_les")}

          </Button>
        </div>
      </div>
    </section>);

};

export default EvenementsSection;