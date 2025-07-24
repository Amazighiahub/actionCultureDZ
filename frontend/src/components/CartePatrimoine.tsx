/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/UI/dialog';
import { MapPin, Clock, Users, Star, Route, Maximize2, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes Leaflet
import { useTranslation } from "react-i18next";import { t } from 'i18next';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

interface Monument {
  id: number;
  nom: string;
  position: [number, number];
  region: string;
  type: string;
  description: string;
  image: string;
  visiteurs: string;
  duree: string;
  heritage: string;
  annee?: string;
}

const monuments: Monument[] = [
{
  id: 1,
  nom: "Casbah d'Alger",
  position: [36.7828, 3.0594],
  region: "Alger",
  type: "Citadelle historique",
  description: t("common_cartepatrimoine.description_citadelle_historique_inscrit"),
  image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=600&q=80",
  visiteurs: "250k/an",
  duree: "2-3h",
  heritage: "UNESCO",
  annee: "XVIe siècle"
},
{
  id: 2,
  nom: "Tassili n'Ajjer",
  position: [25.5000, 9.5000],
  region: "Illizi",
  type: "Parc national",
  description: t("common_cartepatrimoine.description_plateau_montagneux_avec"),
  image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80",
  visiteurs: "15k/an",
  duree: "1-2 jours",
  heritage: "UNESCO",
  annee: "Préhistoire"
},
{
  id: 3,
  nom: "Vallée du M'zab",
  position: [32.4840, 3.6730],
  region: "Ghardaïa",
  type: "Architecture traditionnelle",
  description: t("common_cartepatrimoine.description_ensemble_architectural_mozab"),
  image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80",
  visiteurs: "45k/an",
  duree: "1 jour",
  heritage: "UNESCO",
  annee: "XIe siècle"
},
{
  id: 4,
  nom: "Timgad",
  position: [35.4833, 6.4667],
  region: "Batna",
  type: "Site archéologique",
  description: t("common_cartepatrimoine.description_ancienne_cit_romaine"),
  image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=600&q=80",
  visiteurs: "80k/an",
  duree: "2-3h",
  heritage: "UNESCO",
  annee: "100 ap. J.-C."
},
{
  id: 5,
  nom: "Djémila",
  position: [36.3167, 5.7333],
  region: "Sétif",
  type: "Site archéologique",
  description: t("common_cartepatrimoine.description_cuicul_ancienne_ville"),
  image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=600&q=80",
  visiteurs: "60k/an",
  duree: "2h",
  heritage: "UNESCO",
  annee: "Ier siècle"
},
{
  id: 6,
  nom: "Tipaza",
  position: [36.5833, 2.4333],
  region: "Tipaza",
  type: "Site archéologique",
  description: t("common_cartepatrimoine.description_vestiges_puniques_romains"),
  image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=600&q=80",
  visiteurs: "120k/an",
  duree: "2-3h",
  heritage: "UNESCO",
  annee: "IIe siècle av. J.-C."
}];


const parcours = [
{
  nom: "Circuit Algérois",
  monuments: [1, 6], // Casbah, Tipaza
  duree: "1 jour",
  difficulte: "Facile"
},
{
  nom: "Route Romaine",
  monuments: [4, 5, 6], // Timgad, Djémila, Tipaza
  duree: "3 jours",
  difficulte: "Modéré"
},
{
  nom: "Patrimoine UNESCO",
  monuments: [1, 2, 3, 4, 5, 6],
  duree: "1 semaine",
  difficulte: "Aventurier"
}];


const CartePatrimoine = () => {
  const [monumentSelectionne, setMonumentSelectionne] = useState<Monument | null>(null);
  const [parcoursActif, setParcoursActif] = useState<number | null>(null);
  const [carteOuverte, setCarteOuverte] = useState(false);const { t } = useTranslation();

  const obtenirCouleurParcours = (index: number) => {
    const couleurs = ['#6B8E23', '#4A6FA5', '#16A085'];
    return couleurs[index] || '#6B8E23';
  };

  const activerParcours = (index: number) => {
    setParcoursActif(index);
  };

  const obtenirLignesParcours = () => {
    if (parcoursActif === null) return [];

    const parcoursCourant = parcours[parcoursActif];
    const monumentsParcours = monuments.filter((m) => parcoursCourant.monuments.includes(m.id));

    if (monumentsParcours.length < 2) return [];

    return monumentsParcours.map((m) => m.position);
  };

  const MapComponent = ({ height = "400px", showFullControls = false }) =>
  <div style={{ height, width: '100%' }}>
      <MapContainer
      center={[32.0, 3.0]}
      zoom={6}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}>

        <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

        
        {/* Marqueurs des monuments */}
        {monuments.map((monument) =>
      <Marker
        key={monument.id}
        position={monument.position}
        eventHandlers={{
          click: () => setMonumentSelectionne(monument)
        }}>

            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-semibold font-serif">{monument.nom}</h3>
                <p className="text-sm text-muted-foreground mb-2">{monument.region}</p>
                <img
              src={monument.image}
              alt={monument.nom}
              className="w-full h-24 object-cover rounded mb-2" />

                <p className="text-xs mb-2">{monument.description}</p>
                <div className="flex justify-between text-xs">
                  <span>{monument.visiteurs}</span>
                  <span>{monument.duree}</span>
                </div>
              </div>
            </Popup>
          </Marker>
      )}
        
        {/* Ligne du parcours */}
        {parcoursActif !== null &&
      <Polyline
        positions={obtenirLignesParcours()}
        color={obtenirCouleurParcours(parcoursActif)}
        weight={3}
        opacity={0.7} />

      }
      </MapContainer>
    </div>;


  return (
    <div className="space-y-8">
      {/* Aperçu de la carte avec option d'ouverture */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 font-serif">
              <Navigation className="h-6 w-6 text-primary" />
              <span>{t("common_cartepatrimoine.carte_interactive_patrimoine")}</span>
            </CardTitle>
            <Dialog open={carteOuverte} onOpenChange={setCarteOuverte}>
              <DialogTrigger asChild>
                <Button variant="outline" className="group">
                  <Maximize2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />{t("common_cartepatrimoine.ouvrir_grand")}

                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[95vw] h-[90vh]">
                <DialogHeader>
                  <DialogTitle className="font-serif">{t("common_cartepatrimoine.exploration_patrimoine_algrien")}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 mt-4">
                  <MapComponent height="calc(90vh - 120px)" showFullControls={true} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-muted-foreground">{t("common_cartepatrimoine.explorez_plus_sites")}

          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <MapComponent height="300px" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Contrôles des parcours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-serif">
            <Route className="h-5 w-5 text-primary" />
            <span>{t("common_cartepatrimoine.parcours_dcouverte")}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("common_cartepatrimoine.choisissez_itinraire_thmatique")}

          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {parcours.map((p, index) =>
            <Card
              key={index}
              className={`cursor-pointer transition-all hover:shadow-md hover-lift ${
              parcoursActif === index ? 'ring-2 ring-primary bg-primary/5' : ''}`
              }
              onClick={() => activerParcours(index)}>

                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold font-serif">{p.nom}</h4>
                      <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: obtenirCouleurParcours(index) }} />

                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{p.monuments.length}{t("common_cartepatrimoine.sites")}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{p.duree}</span>
                      </span>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {p.difficulte}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {parcoursActif !== null &&
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{t("common_cartepatrimoine.parcours_actif")}{parcours[parcoursActif].nom}</h4>
                  <p className="text-sm text-muted-foreground">{t("common_cartepatrimoine.itinraire_trac_sur")}
                  {parcours[parcoursActif].monuments.length}{t("common_cartepatrimoine.monuments")}
                </p>
                </div>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setParcoursActif(null)}>{t("common_cartepatrimoine.effacer")}


              </Button>
              </div>
            </div>
          }
        </CardContent>
      </Card>

      {/* Détails du monument sélectionné */}
      {monumentSelectionne &&
      <Card className="bg-gradient-to-r from-accent/10 to-primary/5">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-serif text-xl">{monumentSelectionne.nom}</CardTitle>
                <p className="text-muted-foreground flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{monumentSelectionne.region}</span>
                </p>
              </div>
              <div className="flex space-x-2">
                <Badge variant="secondary">{monumentSelectionne.type}</Badge>
                {monumentSelectionne.heritage === 'UNESCO' &&
              <Badge className="bg-accent text-accent-foreground">{t("common_cartepatrimoine.unesco")}</Badge>
              }
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <img
            src={monumentSelectionne.image}
            alt={monumentSelectionne.nom}
            className="w-full h-64 object-cover rounded-lg shadow-md" />

            <p className="text-muted-foreground leading-relaxed">{monumentSelectionne.description}</p>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{monumentSelectionne.visiteurs}</p>
                  <p className="text-xs text-muted-foreground">{t("common_cartepatrimoine.visiteurs")}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{monumentSelectionne.duree}</p>
                  <p className="text-xs text-muted-foreground">{t("common_cartepatrimoine.dure")}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{monumentSelectionne.annee}</p>
                  <p className="text-xs text-muted-foreground">{t("common_cartepatrimoine.poque")}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-lg">
                <Star className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{monumentSelectionne.heritage}</p>
                  <p className="text-xs text-muted-foreground">{t("common_cartepatrimoine.statut")}</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button className="flex-1 btn-hover">{t("common_cartepatrimoine.rserver_une_visite")}

            </Button>
              <Button variant="outline" className="flex-1">{t("common_cartepatrimoine.plus_dinformations")}

            </Button>
              <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonumentSelectionne(null)}>{t("common_cartepatrimoine.fermer")}


            </Button>
            </div>
          </CardContent>
        </Card>
      }
    </div>);

};

export default CartePatrimoine;