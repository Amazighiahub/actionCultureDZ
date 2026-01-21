import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Skeleton } from '@/components/UI/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import {
  MapPin, Clock, Star, QrCode, ArrowLeft, Landmark, Building2,
  Camera, Calendar, Route, ChevronRight, Download, Share2,
  CheckCircle2, XCircle, Info, History, Image as ImageIcon, Play
} from 'lucide-react';
import { patrimoineService } from '@/services/patrimoine.service';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/UI/dialog';
import VisitePlanner from '@/components/patrimoine/VisitePlanner';

// Helper pour traduire les champs multilingues
const translate = (value: string | { fr?: string; ar?: string; en?: string } | null | undefined, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang as keyof typeof value] || value.fr || value.ar || value.en || '';
};

// ⚡ Types de patrimoine disponibles
type TypePatrimoine = 'ville_village' | 'monument' | 'musee' | 'site_archeologique' | 'site_naturel' | 'edifice_religieux' | 'palais_forteresse' | 'autre';

// ⚡ Configuration des onglets selon le type de patrimoine
const TABS_CONFIG: Record<TypePatrimoine, string[]> = {
  ville_village: ['monuments', 'vestiges', 'musees', 'parcours', 'services'],
  monument: ['programmes', 'services', 'galerie', 'histoire'],
  musee: ['programmes', 'collections', 'services', 'galerie'],
  site_archeologique: ['vestiges', 'programmes', 'services', 'histoire'],
  site_naturel: ['parcours', 'services', 'faune_flore', 'galerie'],
  edifice_religieux: ['programmes', 'services', 'histoire', 'galerie'],
  palais_forteresse: ['monuments', 'programmes', 'services', 'histoire'],
  autre: ['monuments', 'vestiges', 'services', 'programmes', 'parcours']
};

// ⚡ Labels des types de patrimoine
const TYPE_LABELS: Record<TypePatrimoine, { fr: string; ar: string; en: string }> = {
  ville_village: { fr: 'Ville / Village', ar: 'مدينة / قرية', en: 'City / Village' },
  monument: { fr: 'Monument', ar: 'نصب تذكاري', en: 'Monument' },
  musee: { fr: 'Musée', ar: 'متحف', en: 'Museum' },
  site_archeologique: { fr: 'Site archéologique', ar: 'موقع أثري', en: 'Archaeological Site' },
  site_naturel: { fr: 'Site naturel', ar: 'موقع طبيعي', en: 'Natural Site' },
  edifice_religieux: { fr: 'Édifice religieux', ar: 'مبنى ديني', en: 'Religious Building' },
  palais_forteresse: { fr: 'Palais / Forteresse', ar: 'قصر / حصن', en: 'Palace / Fortress' },
  autre: { fr: 'Patrimoine', ar: 'تراث', en: 'Heritage' }
};

interface SitePatrimoineDetail {
  id_lieu: number;
  nom: string | { fr?: string; ar?: string; en?: string };
  adresse: string | { fr?: string; ar?: string; en?: string };
  latitude: number;
  longitude: number;
  typeLieu: string;
  typePatrimoine?: TypePatrimoine; // ⚡ Nouveau champ
  DetailLieu?: {
    id_detailLieu: number;
    description?: string | { fr?: string; ar?: string; en?: string };
    horaires?: string | { fr?: string; ar?: string; en?: string };
    histoire?: string | { fr?: string; ar?: string; en?: string };
    referencesHistoriques?: string | { fr?: string; ar?: string; en?: string };
    noteMoyenne?: number;
  };
  medias?: Array<{ id: number; url: string; type: string; description?: string | object }>;
  services?: Array<{ id: number; nom: string | object; description?: string | object; disponible: boolean }>;
  monuments?: Array<{ id: number; nom: string | object; description?: string | object; type: string }>;
  vestiges?: Array<{ id: number; nom: string | object; description?: string | object; type: string }>;
  programmes?: Array<{
    id_programme: number;
    titre: string | object;
    description?: string | object;
    date_debut: string;
    date_fin?: string;
    Evenement?: {
      id_evenement: number;
      nom_evenement: string | object;
      date_debut: string;
      date_fin?: string;
      statut: string;
    };
  }>;
  parcours?: Array<{
    id_parcours: number;
    nom_parcours: string | object;
    description?: string | object;
    duree_estimee?: number;
    difficulte?: string;
    theme?: string;
    distance_km?: number;
  }>;
  qrcodes?: Array<{ id_qr_code: number; code_unique: string; url_destination: string; qr_image_url?: string }>;
  qrCodeGenerated?: string;
  wilaya?: { id_wilaya: number; nom: string };
  commune?: { id_commune: number; nom: string };
  daira?: { id_daira: number; nom: string };
  stats?: {
    totalMedias: number;
    totalServices: number;
    totalMonuments: number;
    totalVestiges: number;
    totalProgrammes: number;
    totalParcours: number;
    noteMoyenne: number | null;
  };
}

// Skeleton pour le chargement
const DetailSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-[400px] w-full rounded-lg" />
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  </div>
);

const PatrimoineDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const lang = i18n.language || 'fr';

  const [site, setSite] = useState<SitePatrimoineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showVisitePlanner, setShowVisitePlanner] = useState(false);

  // Charger les détails du site
  useEffect(() => {
    const loadSiteDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await patrimoineService.getSiteDetail(parseInt(id));
        if (response.success && response.data) {
          setSite(response.data as unknown as SitePatrimoineDetail);
        } else {
          setError('Site non trouvé');
        }
      } catch (err) {
        console.error('Erreur chargement site:', err);
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };
    loadSiteDetail();
  }, [id]);

  // Télécharger le QR Code
  const downloadQRCode = async () => {
    if (!site) return;
    toast({
      title: t('qrcode.downloading', 'Téléchargement...'),
      description: t('qrcode.pleaseWait', 'Veuillez patienter...')
    });
    try {
      await patrimoineService.getQRCode(site.id_lieu);
      toast({
        title: t('qrcode.success', 'QR Code téléchargé'),
        description: t('qrcode.checkDownloads', 'Vérifiez vos téléchargements')
      });
    } catch (err) {
      toast({
        title: t('common.error', 'Erreur'),
        description: t('qrcode.downloadError', 'Impossible de télécharger le QR Code'),
        variant: 'destructive'
      });
    }
  };

  // Obtenir l'image principale
  const getMainImage = (): string => {
    if (site?.medias && site.medias.length > 0) {
      const imageMedia = site.medias.find(m => m.type === 'image');
      if (imageMedia?.url) return imageMedia.url;
    }
    return 'https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?auto=format&fit=crop&w=1200&q=80';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <DetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">{t('common.error', 'Erreur')}</h2>
              <p className="text-muted-foreground mb-4">{error || 'Site non trouvé'}</p>
              <Button onClick={() => navigate('/patrimoine')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back', 'Retour')}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/patrimoine" className="hover:text-primary transition-colors">
            {t('nav.heritage', 'Patrimoine')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{translate(site.nom, lang)}</span>
        </div>

        {/* Image principale et galerie */}
        <div className="relative mb-8 rounded-xl overflow-hidden">
          <img
            src={getMainImage()}
            alt={translate(site.nom, lang)}
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Overlay info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">
                  {translate(site.nom, lang)}
                </h1>
                <div className="flex items-center gap-2 text-white/90 mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {site.wilaya?.nom || site.commune?.nom || translate(site.adresse, lang)}
                  </span>
                </div>
                {/* 🎯 CTA Principal - Planifier votre visite */}
                <Button 
                  size="lg"
                  onClick={() => setShowVisitePlanner(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
                >
                  <Route className="h-5 w-5 mr-2" />
                  {t('patrimoine.planVisit', 'Planifier votre visite')}
                </Button>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {site.stats?.noteMoyenne && (
                  <Badge className="bg-yellow-500/90 text-white">
                    <Star className="h-4 w-4 mr-1 fill-current" />
                    {site.stats.noteMoyenne.toFixed(1)}
                  </Badge>
                )}
                {/* ⚡ Afficher le type de patrimoine traduit */}
                <Badge variant="secondary">
                  {TYPE_LABELS[(site.typePatrimoine || 'autre') as TypePatrimoine]?.[lang as 'fr' | 'ar' | 'en'] || site.typeLieu || 'Site'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bouton galerie */}
          {site.medias && site.medias.length > 1 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {site.medias.length} {t('patrimoine.photos', 'photos')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{t('patrimoine.gallery', 'Galerie')}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                  {site.medias.map((media, idx) => (
                    <div
                      key={idx}
                      className="aspect-video cursor-pointer overflow-hidden rounded-lg"
                      onClick={() => setSelectedImage(media.url)}
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Play className="h-8 w-8" />
                        </div>
                      ) : (
                        <img
                          src={media.url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Contenu principal */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="md:col-span-2 space-y-8">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('patrimoine.description', 'Description')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {translate(site.DetailLieu?.description, lang) ||
                    t('patrimoine.noDescription', 'Aucune description disponible.')}
                </p>
              </CardContent>
            </Card>

            {/* Histoire */}
            {site.DetailLieu?.histoire && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t('patrimoine.history', 'Histoire')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {translate(site.DetailLieu.histoire, lang)}
                  </p>
                  {site.DetailLieu.referencesHistoriques && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2">{t('patrimoine.references', 'Références')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {translate(site.DetailLieu.referencesHistoriques, lang)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ⚡ Onglets adaptatifs selon le type de patrimoine */}
            {(() => {
              const typePatrimoine = (site.typePatrimoine || 'autre') as TypePatrimoine;
              const availableTabs = TABS_CONFIG[typePatrimoine] || TABS_CONFIG.autre;
              const defaultTab = availableTabs[0];

              // Définition des onglets avec leurs données
              const allTabs = {
                monuments: { label: t('patrimoine.monuments', 'Monuments'), icon: Landmark, count: site.monuments?.length || 0 },
                vestiges: { label: t('patrimoine.vestiges', 'Vestiges'), icon: Building2, count: site.vestiges?.length || 0 },
                services: { label: t('patrimoine.services', 'Services'), icon: CheckCircle2, count: site.services?.length || 0 },
                programmes: { label: t('patrimoine.programmes', 'Programmes'), icon: Calendar, count: site.programmes?.length || 0 },
                parcours: { label: t('patrimoine.parcours', 'Parcours'), icon: Route, count: site.parcours?.length || 0 },
                galerie: { label: t('patrimoine.gallery', 'Galerie'), icon: Camera, count: site.medias?.length || 0 },
                histoire: { label: t('patrimoine.history', 'Histoire'), icon: History, count: site.DetailLieu?.histoire ? 1 : 0 },
                musees: { label: t('patrimoine.museums', 'Musées'), icon: Building2, count: 0 },
                collections: { label: t('patrimoine.collections', 'Collections'), icon: ImageIcon, count: 0 },
                faune_flore: { label: t('patrimoine.wildlife', 'Faune & Flore'), icon: Info, count: 0 }
              };

              // Filtrer les onglets disponibles
              const visibleTabs = availableTabs.filter(tab => allTabs[tab as keyof typeof allTabs]);
              const gridCols = visibleTabs.length <= 3 ? 'grid-cols-3' : visibleTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-5';

              return (
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className={`grid w-full ${gridCols}`}>
                    {visibleTabs.map(tabKey => {
                      const tab = allTabs[tabKey as keyof typeof allTabs];
                      if (!tab) return null;
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tabKey} value={tabKey} className="text-xs sm:text-sm">
                          <Icon className="h-4 w-4 mr-1 hidden sm:inline" />
                          {tab.label} ({tab.count})
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

              {/* Monuments */}
              <TabsContent value="monuments" className="mt-4">
                {site.monuments && site.monuments.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {site.monuments.map((monument, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {translate(monument.nom as any, lang)}
                            </CardTitle>
                            <Badge variant="outline">{monument.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {translate(monument.description as any, lang) || 'Aucune description'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('patrimoine.noMonuments', 'Aucun monument répertorié')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Vestiges */}
              <TabsContent value="vestiges" className="mt-4">
                {site.vestiges && site.vestiges.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {site.vestiges.map((vestige, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {translate(vestige.nom as any, lang)}
                            </CardTitle>
                            <Badge variant="outline">{vestige.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {translate(vestige.description as any, lang) || 'Aucune description'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('patrimoine.noVestiges', 'Aucun vestige répertorié')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Services */}
              <TabsContent value="services" className="mt-4">
                {site.services && site.services.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {site.services.map((service, idx) => (
                      <Card key={idx}>
                        <CardContent className="flex items-center gap-4 py-4">
                          {service.disponible ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium">{translate(service.nom as any, lang)}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground">
                                {translate(service.description as any, lang)}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <p className="text-muted-foreground">{t('patrimoine.noServices', 'Aucun service disponible')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Programmes */}
              <TabsContent value="programmes" className="mt-4">
                {site.programmes && site.programmes.length > 0 ? (
                  <div className="space-y-4">
                    {site.programmes.map((programme, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {translate(programme.titre as any, lang)}
                            </CardTitle>
                            {programme.Evenement && (
                              <Badge>{programme.Evenement.statut}</Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(programme.date_debut).toLocaleDateString(lang)}
                            {programme.date_fin && ` - ${new Date(programme.date_fin).toLocaleDateString(lang)}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {translate(programme.description as any, lang) || 'Aucune description'}
                          </p>
                          {programme.Evenement && (
                            <Link to={`/evenements/${programme.Evenement.id_evenement}`}>
                              <Button variant="link" className="p-0 mt-2">
                                {t('patrimoine.viewEvent', 'Voir l\'événement')}
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('patrimoine.noProgrammes', 'Aucun programme prévu')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Parcours */}
              <TabsContent value="parcours" className="mt-4">
                {site.parcours && site.parcours.length > 0 ? (
                  <div className="space-y-4">
                    {site.parcours.map((parcours, idx) => (
                      <Card key={idx} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {translate(parcours.nom_parcours as any, lang)}
                            </CardTitle>
                            {parcours.difficulte && (
                              <Badge variant={
                                parcours.difficulte === 'facile' ? 'secondary' :
                                  parcours.difficulte === 'moyen' ? 'default' : 'destructive'
                              }>
                                {parcours.difficulte}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            {translate(parcours.description as any, lang) || 'Aucune description'}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {parcours.duree_estimee && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {parcours.duree_estimee} min
                              </span>
                            )}
                            {parcours.distance_km && (
                              <span className="flex items-center gap-1">
                                <Route className="h-4 w-4" />
                                {parcours.distance_km} km
                              </span>
                            )}
                            {parcours.theme && (
                              <Badge variant="outline">{parcours.theme}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Route className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('patrimoine.noParcours', 'Aucun parcours associé')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Onglet Galerie (pour certains types) */}
              <TabsContent value="galerie" className="mt-4">
                {site.medias && site.medias.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {site.medias.map((media, idx) => (
                      <div key={idx} className="aspect-video cursor-pointer overflow-hidden rounded-lg">
                        {media.type === 'video' ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Play className="h-8 w-8" />
                          </div>
                        ) : (
                          <img
                            src={media.url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('patrimoine.noGallery', 'Aucune photo disponible')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Onglet Histoire (pour certains types) */}
              <TabsContent value="histoire" className="mt-4">
                {site.DetailLieu?.histoire ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground leading-relaxed">
                        {translate(site.DetailLieu.histoire, lang)}
                      </p>
                      {site.DetailLieu.referencesHistoriques && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold mb-2">{t('patrimoine.references', 'Références historiques')}</h4>
                          <p className="text-sm text-muted-foreground">
                            {translate(site.DetailLieu.referencesHistoriques, lang)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('patrimoine.noHistory', 'Aucune information historique disponible')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Placeholder pour les futurs onglets (musees, collections, faune_flore) */}
              <TabsContent value="musees" className="mt-4">
                <Card className="text-center py-8">
                  <CardContent>
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t('patrimoine.noMuseums', 'Aucun musée répertorié')}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="collections" className="mt-4">
                <Card className="text-center py-8">
                  <CardContent>
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t('patrimoine.noCollections', 'Aucune collection disponible')}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faune_flore" className="mt-4">
                <Card className="text-center py-8">
                  <CardContent>
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t('patrimoine.noWildlife', 'Informations sur la faune et flore à venir')}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
              );
            })()}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informations pratiques */}
            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.practicalInfo', 'Informations pratiques')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Horaires */}
                {site.DetailLieu?.horaires && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{t('patrimoine.hours', 'Horaires')}</p>
                      <p className="text-sm text-muted-foreground">
                        {translate(site.DetailLieu.horaires, lang)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Localisation */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{t('patrimoine.location', 'Localisation')}</p>
                    <p className="text-sm text-muted-foreground">
                      {translate(site.adresse, lang)}
                    </p>
                    {site.commune && (
                      <p className="text-sm text-muted-foreground">
                        {site.commune.nom}, {site.daira?.nom}, {site.wilaya?.nom}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coordonnées GPS */}
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  GPS: {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  {t('patrimoine.qrCode', 'QR Code')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                {site.qrCodeGenerated ? (
                  <img
                    src={site.qrCodeGenerated}
                    alt="QR Code"
                    className="w-40 h-40 mx-auto border rounded-lg"
                  />
                ) : site.qrcodes && site.qrcodes[0]?.qr_image_url ? (
                  <img
                    src={site.qrcodes[0].qr_image_url}
                    alt="QR Code"
                    className="w-40 h-40 mx-auto border rounded-lg"
                  />
                ) : (
                  <div className="w-40 h-40 mx-auto border rounded-lg bg-muted flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('patrimoine.scanQR', 'Scannez pour accéder aux informations')}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={downloadQRCode}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('common.download', 'Télécharger')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    {t('common.share', 'Partager')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Statistiques */}
            {site.stats && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('patrimoine.stats', 'Statistiques')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{site.stats.totalMonuments}</p>
                      <p className="text-xs text-muted-foreground">Monuments</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{site.stats.totalVestiges}</p>
                      <p className="text-xs text-muted-foreground">Vestiges</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{site.stats.totalMedias}</p>
                      <p className="text-xs text-muted-foreground">Photos</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{site.stats.totalParcours}</p>
                      <p className="text-xs text-muted-foreground">Parcours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <Route className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
                    {t('patrimoine.discoverArea', 'Découvrez les environs')}
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {t('patrimoine.planVisitDesc', 'Créez un parcours personnalisé avec les sites à proximité')}
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all" 
                  onClick={() => setShowVisitePlanner(true)}
                >
                  <Route className="h-5 w-5 mr-2" />
                  {t('patrimoine.planVisit', 'Planifier votre visite')}
                </Button>
              </CardContent>
            </Card>
            
            {/* Lien pour les professionnels */}
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-3 text-center">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  {t('patrimoine.proService', 'Vous êtes professionnel ?')}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                  onClick={() => navigate(`/ajouter-mon-service?lieu=${site.id_lieu}`)}
                >
                  {t('patrimoine.addYourService', 'Proposez vos services ici')}
                </Button>
              </CardContent>
            </Card>
            
            <Button variant="outline" className="w-full" onClick={() => navigate('/patrimoine')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('patrimoine.backToList', 'Retour à la liste')}
            </Button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Dialog pour image en grand */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0">
            <img
              src={selectedImage}
              alt="Image en grand"
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Planificateur de visite */}
      <VisitePlanner
        isOpen={showVisitePlanner}
        onClose={() => setShowVisitePlanner(false)}
        siteId={site.id_lieu}
        siteName={translate(site.nom, lang)}
        siteLatitude={site.latitude}
        siteLongitude={site.longitude}
        siteType={site.typePatrimoine}
      />
    </div>
  );
};

export default PatrimoineDetail;
