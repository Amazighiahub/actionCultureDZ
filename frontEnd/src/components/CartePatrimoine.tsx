/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, ZoomControl, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Maximize2, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { patrimoineService } from '@/services/patrimoine.service';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet
// Icônes des marqueurs servies localement (voir src/lib/leafletIcons.ts)
import '@/lib/leafletIcons';

interface Monument {
  id: number;
  nom: string;
  position: [number, number];
  region: string;
  type: string;
  image: string;
  heritage: string;
}

/** Cadre la carte sur les sites présents (sinon ils pouvaient rester hors de la vue) */
const CadrerSurSites: React.FC<{ positions: Array<[number, number]> }> = ({ positions }) => {
  const carte = useMap();
  useEffect(() => {
    // Marges serrées (40 px partout laissaient voir surtout la mer et l'Espagne sur téléphone), sauf en haut :
    // le dessin du repère (≈ 41 px) dépasse au-dessus de son point
    if (positions.length > 0) carte.fitBounds(positions, { paddingTopLeft: [20, 48], paddingBottomRight: [20, 12], maxZoom: 9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement quand la liste des sites change
  }, [positions.length, carte]);
  return null;
};

/**
 * Carte des sites, déclarée HORS de CartePatrimoine. Avant, elle était déclarée dans son rendu : chaque
 * changement d'état (toucher un repère) la détruisait et la recréait, la fenêtre du lieu ne s'ouvrait pas,
 * la carte revenait au cadrage de départ et Leaflet levait « _leaflet_pos » (audit V11 UX-4).
 */
const CarteSites: React.FC<{ monuments: Monument[]; height: string }> = ({ monuments, height }) => {
  const { t } = useTranslation();
  const positions = useMemo(() => monuments.map((m) => m.position), [monuments]);
  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={[32.0, 3.0]}
        zoom={6}
        // Crans de zoom fins : le cadrage serre au plus près des sites (crans entiers : trop large)
        zoomSnap={0.25}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        zoomControl={false}
      >
        <ZoomControl zoomInTitle={t('carte.zoomAvant', 'Zoomer')} zoomOutTitle={t('carte.zoomArriere', 'Dézoomer')} />
        <CadrerSurSites positions={positions} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        />
        {monuments.map((monument) => (
          <Marker
            key={monument.id}
            position={monument.position}
            // Nom du marqueur pour les lecteurs d'écran (sinon « Marker »)
            title={monument.nom}
            alt={monument.nom}
          >
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 dir="auto" className="font-semibold font-serif">{monument.nom}</h3>
                {monument.region && <p dir="auto" className="text-sm text-muted-foreground mb-2">{monument.region}</p>}
                <img
                  src={monument.image}
                  alt=""
                  className="w-full h-24 object-cover rounded mb-2"
                  loading="lazy"
                />
                <Link to={`/patrimoine/${monument.id}`} className="text-sm font-medium text-primary hover:underline">
                  {t('common_cartepatrimoine.plus_dinformations')}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const CartePatrimoine: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [carteOuverte, setCarteOuverte] = useState(false);
  const [dbMonuments, setDbMonuments] = useState<Monument[]>([]);

  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const lang = i18n.language || 'fr';
        // (appelait patrimoineService.list, qui n'existe pas : la carte restait sur les sites d'exemple)
        const response = await patrimoineService.getCarte();
        if (response.success && response.data) {
          const items: any[] = Array.isArray(response.data) ? response.data : [];
          const mapped: Monument[] = items
            .filter((s: any) => s.latitude != null && s.longitude != null)
            .map((s: any) => ({
              id: s.id_lieu || s.id,
              nom: typeof s.nom === 'object' ? (s.nom[lang] || s.nom.fr || '') : (s.nom || ''),
              position: [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number],
              region: s.Commune?.nom || s.wilaya || '',
              type: s.typePatrimoine || 'monument',
              image: s.image_url || s.medias?.[0]?.url || '/images/placeholder-patrimoine.svg',
              heritage: s.classement || '',
            }));
          if (mapped.length > 0) setDbMonuments(mapped);
        }
      } catch (e) {
        // Fallback to static data
      }
    };
    loadFromDb();
  }, [i18n.language]);

  const allMonuments = dbMonuments;

  return (
    <div className="space-y-8">
      {/* Carte principale */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-serif">
              <Navigation className="h-6 w-6 text-primary" />
              <span>{t("common_cartepatrimoine.carte_interactive_patrimoine")}</span>
            </CardTitle>
            <Dialog open={carteOuverte} onOpenChange={setCarteOuverte}>
              <DialogTrigger asChild>
                <Button variant="outline" className="group">
                  <Maximize2 className="h-4 w-4 me-2 group-hover:scale-110 transition-transform" />
                  {t("common_cartepatrimoine.ouvrir_grand")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[95vw] h-[90vh]">
                <DialogHeader>
                  <DialogTitle className="font-serif">
                    {t("common_cartepatrimoine.exploration_patrimoine_algrien")}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 mt-4">
                  <CarteSites monuments={allMonuments} height="calc(90vh - 120px)" />
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-muted-foreground">
            {t('common_cartepatrimoine.explorezSites', 'Explorez les sites et monuments historiques à travers l’Algérie')}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <CarteSites monuments={allMonuments} height="300px" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none rounded-lg" />
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default CartePatrimoine;
