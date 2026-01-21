/**
 * VisitePlanner - Planificateur de visite intelligent
 * Permet de planifier une visite autour d'un site patrimonial
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/UI/dialog';
import { Button } from '@/components/UI/button';
import { Card, CardContent } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Label } from '@/components/UI/label';
import { Slider } from '@/components/UI/slider';
import { Checkbox } from '@/components/UI/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/UI/radio-group';
import { Separator } from '@/components/UI/separator';
import { ScrollArea } from '@/components/UI/scroll-area';
import {
  Calendar,
  Clock,
  MapPin,
  Route,
  Car,
  Footprints,
  Bike,
  Utensils,
  Hotel,
  Landmark,
  Camera,
  TreePine,
  Church,
  Loader2,
  Navigation,
  Download,
  Share2,
  CheckCircle2,
  Star,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisitePlannerProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: number;
  siteName: string;
  siteLatitude: number;
  siteLongitude: number;
  siteType?: string;
}

interface ParcoursEtape {
  id: number;
  nom: string;
  type: string;
  distance: number;
  duree: number;
  description?: string;
  image?: string;
  horaires?: string;
  note?: number;
}

interface ParcoursGenere {
  etapes: ParcoursEtape[];
  distanceTotale: number;
  dureeEstimee: number;
  pointsInteret: number;
}

// Icônes par type de site
const TYPE_ICONS: Record<string, React.ElementType> = {
  monument: Landmark,
  musee: Camera,
  site_naturel: TreePine,
  edifice_religieux: Church,
  restaurant: Utensils,
  hotel: Hotel,
  default: MapPin,
};

const VisitePlanner: React.FC<VisitePlannerProps> = ({
  isOpen,
  onClose,
  siteId,
  siteName,
  siteLatitude,
  siteLongitude,
  siteType,
}) => {
  const { t } = useTranslation();

  // États du formulaire
  const [step, setStep] = useState<'config' | 'loading' | 'result'>('config');
  const [duration, setDuration] = useState(240); // 4 heures par défaut
  const [transport, setTransport] = useState<'marche' | 'velo' | 'voiture'>('voiture');
  const [interests, setInterests] = useState<string[]>(['histoire', 'architecture']);
  const [includeRestaurants, setIncludeRestaurants] = useState(true);
  const [includeHotels, setIncludeHotels] = useState(false);
  const [accessibility, setAccessibility] = useState(false);
  const [familyFriendly, setFamilyFriendly] = useState(false);
  const [maxSites, setMaxSites] = useState(5);

  // Résultat du parcours
  const [parcours, setParcours] = useState<ParcoursGenere | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options d'intérêts
  const INTERESTS_OPTIONS = [
    { value: 'histoire', label: t('visit.interests.history', 'Histoire'), icon: Landmark },
    { value: 'architecture', label: t('visit.interests.architecture', 'Architecture'), icon: Landmark },
    { value: 'art', label: t('visit.interests.art', 'Art'), icon: Camera },
    { value: 'nature', label: t('visit.interests.nature', 'Nature'), icon: TreePine },
    { value: 'religion', label: t('visit.interests.religion', 'Religion'), icon: Church },
    { value: 'gastronomie', label: t('visit.interests.gastronomy', 'Gastronomie'), icon: Utensils },
  ];

  // Toggle un intérêt
  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  // Générer le parcours
  const generateParcours = async () => {
    setStep('loading');
    setError(null);

    try {
      const response = await fetch('/api/parcours-intelligent/personnalise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          latitude: siteLatitude,
          longitude: siteLongitude,
          interests,
          duration,
          transport,
          accessibility,
          familyFriendly,
          maxSites,
          includeRestaurants,
          includeHotels,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setParcours(data.data);
        setStep('result');
      } else {
        throw new Error(data.error || 'Erreur lors de la génération');
      }
    } catch (err) {
      console.error('Erreur génération parcours:', err);
      setError(t('visit.error.generation', 'Impossible de générer le parcours. Veuillez réessayer.'));
      setStep('config');
    }
  };

  // Formater la durée
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}`;
  };

  // Réinitialiser
  const handleClose = () => {
    setStep('config');
    setParcours(null);
    setError(null);
    onClose();
  };

  // Ouvrir dans Google Maps
  const openInMaps = () => {
    if (!parcours) return;
    const waypoints = parcours.etapes
      .map(e => `${e.nom}`)
      .join('/');
    const url = `https://www.google.com/maps/dir/${siteName}/${waypoints}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            {t('visit.title', 'Planifier votre visite')}
          </DialogTitle>
          <DialogDescription>
            {t('visit.subtitle', 'Créez un parcours personnalisé autour de')} <strong>{siteName}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Étape Configuration */}
          {step === 'config' && (
            <div className="space-y-6 py-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Durée de la visite */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('visit.duration', 'Durée de la visite')}
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[duration]}
                    onValueChange={(v) => setDuration(v[0])}
                    min={60}
                    max={480}
                    step={30}
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="min-w-[60px] justify-center">
                    {formatDuration(duration)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('visit.durationHint', 'De 1h à 8h selon votre disponibilité')}
                </p>
              </div>

              <Separator />

              {/* Mode de transport */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  {t('visit.transport', 'Mode de transport')}
                </Label>
                <RadioGroup
                  value={transport}
                  onValueChange={(v) => setTransport(v as typeof transport)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="marche" id="marche" />
                    <Label htmlFor="marche" className="flex items-center gap-1 cursor-pointer">
                      <Footprints className="h-4 w-4" />
                      {t('visit.transport.walk', 'À pied')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="velo" id="velo" />
                    <Label htmlFor="velo" className="flex items-center gap-1 cursor-pointer">
                      <Bike className="h-4 w-4" />
                      {t('visit.transport.bike', 'Vélo')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="voiture" id="voiture" />
                    <Label htmlFor="voiture" className="flex items-center gap-1 cursor-pointer">
                      <Car className="h-4 w-4" />
                      {t('visit.transport.car', 'Voiture')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Centres d'intérêt */}
              <div className="space-y-3">
                <Label>{t('visit.interests', 'Centres d\'intérêt')}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTERESTS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = interests.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleInterest(option.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Nombre de sites */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('visit.maxSites', 'Nombre de sites à visiter')}
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[maxSites]}
                    onValueChange={(v) => setMaxSites(v[0])}
                    min={2}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="min-w-[40px] justify-center">
                    {maxSites}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Options supplémentaires */}
              <div className="space-y-3">
                <Label>{t('visit.options', 'Options')}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="restaurants"
                      checked={includeRestaurants}
                      onCheckedChange={(c) => setIncludeRestaurants(!!c)}
                    />
                    <Label htmlFor="restaurants" className="flex items-center gap-2 cursor-pointer">
                      <Utensils className="h-4 w-4 text-orange-500" />
                      {t('visit.includeRestaurants', 'Inclure des restaurants')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hotels"
                      checked={includeHotels}
                      onCheckedChange={(c) => setIncludeHotels(!!c)}
                    />
                    <Label htmlFor="hotels" className="flex items-center gap-2 cursor-pointer">
                      <Hotel className="h-4 w-4 text-blue-500" />
                      {t('visit.includeHotels', 'Inclure des hébergements')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accessibility"
                      checked={accessibility}
                      onCheckedChange={(c) => setAccessibility(!!c)}
                    />
                    <Label htmlFor="accessibility" className="cursor-pointer">
                      {t('visit.accessibility', 'Accessibilité PMR')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="family"
                      checked={familyFriendly}
                      onCheckedChange={(c) => setFamilyFriendly(!!c)}
                    />
                    <Label htmlFor="family" className="cursor-pointer">
                      {t('visit.familyFriendly', 'Adapté aux familles')}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape Chargement */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{t('visit.generating', 'Génération du parcours...')}</p>
              <p className="text-sm text-muted-foreground">
                {t('visit.generatingHint', 'Nous analysons les meilleurs sites autour de vous')}
              </p>
            </div>
          )}

          {/* Étape Résultat */}
          {step === 'result' && parcours && (
            <div className="space-y-6 py-4">
              {/* Résumé */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{parcours.etapes.length}</p>
                        <p className="text-xs text-muted-foreground">{t('visit.sites', 'sites')}</p>
                      </div>
                      <Separator orientation="vertical" className="h-10" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{parcours.distanceTotale.toFixed(1)} km</p>
                        <p className="text-xs text-muted-foreground">{t('visit.distance', 'distance')}</p>
                      </div>
                      <Separator orientation="vertical" className="h-10" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{formatDuration(parcours.dureeEstimee)}</p>
                        <p className="text-xs text-muted-foreground">{t('visit.estimatedTime', 'durée')}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Liste des étapes */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  {t('visit.itinerary', 'Votre itinéraire')}
                </Label>

                {/* Point de départ */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                      A
                    </div>
                    <div className="w-0.5 h-8 bg-border" />
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-medium">{siteName}</p>
                    <p className="text-sm text-muted-foreground">{t('visit.startPoint', 'Point de départ')}</p>
                  </div>
                </div>

                {/* Étapes */}
                {parcours.etapes.map((etape, index) => {
                  const Icon = TYPE_ICONS[etape.type] || TYPE_ICONS.default;
                  const isLast = index === parcours.etapes.length - 1;

                  return (
                    <div key={etape.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        {!isLast && <div className="w-0.5 h-8 bg-border" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{etape.nom}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{etape.distance.toFixed(1)} km</span>
                              <span>•</span>
                              <span>{formatDuration(etape.duree)}</span>
                              {etape.note && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {etape.note.toFixed(1)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                        {etape.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {etape.description}
                          </p>
                        )}
                        {etape.horaires && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {etape.horaires}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {t('visit.info', 'Les horaires et disponibilités peuvent varier. Nous vous conseillons de vérifier avant votre visite.')}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'config' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button onClick={generateParcours} disabled={interests.length === 0}>
                <Route className="h-4 w-4 mr-2" />
                {t('visit.generate', 'Générer le parcours')}
              </Button>
            </>
          )}

          {step === 'result' && (
            <>
              <Button variant="outline" onClick={() => setStep('config')}>
                {t('visit.modify', 'Modifier')}
              </Button>
              <Button variant="outline" onClick={openInMaps}>
                <Navigation className="h-4 w-4 mr-2" />
                {t('visit.openMaps', 'Ouvrir dans Maps')}
              </Button>
              <Button onClick={handleClose}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('common.done', 'Terminé')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VisitePlanner;
