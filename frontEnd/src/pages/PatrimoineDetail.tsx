import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShare } from '@/hooks/useShare';
import { getDateLocale } from '@/hooks/useFormatDate';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  MapPin, Clock, Star, QrCode, ArrowLeft, Landmark, Building2,
  Camera, Calendar, Route, ChevronRight, Download, Share2, Pencil,
  CheckCircle2, XCircle, Info, History, Image as ImageIcon, Play,
  Compass, TreePine, Utensils, Hotel, Headphones, DoorOpen, ChevronLeft, Footprints
} from 'lucide-react';
import { patrimoineService } from '@/services/patrimoine.service';
import { httpClient } from '@/services/httpClient';
import { useToast } from '@/hooks/use-toast';
import { getAssetUrl } from '@/helpers/assetUrl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// VisitePlanner chargé en lazy (inclut leaflet ~40KB, rendu conditionnel)
const VisitePlanner = React.lazy(() => import('@/components/patrimoine/VisitePlanner'));
import ServicesProximite from '@/components/shared/ServicesProximite';
import SectionEnrichissable from '@/components/patrimoine/SectionEnrichissable';
// Historique (administration et modération seulement) : chargé à part, pas pour chaque visiteur
const HistoriqueLieuDialog = React.lazy(() => import('@/components/patrimoine/HistoriqueLieuDialog'));
import SectionPersonnalites from '@/components/patrimoine/SectionPersonnalites';
import { patrimoineArticlesService, getPagesPatrimoine, type PatrimoineBlock, type PagePatrimoine } from '@/services/patrimoineArticles.service';
import SectionElements, { type PatrimoineElement } from '@/components/patrimoine/SectionElements';
import PointsVisite, { type PointVisite } from '@/components/patrimoine/PointsVisite';
import GuideAudio, { type MediaAudio } from '@/components/patrimoine/GuideAudio';
import { usePermissions } from '@/hooks/usePermissions';
import { jourProgramme, heureProgramme } from '@/utils/programmeHoraire';
import SEOHead, { buildPatrimoineJsonLd, buildBreadcrumbJsonLd } from '@/components/SEOHead';
import { evenementPath } from '@/utils/slug';
import { getLocalizedText } from '@/utils/getLocalizedText';

// Type multilingue réutilisé dans l'interface du site
type MultilingualField = { fr?: string; ar?: string; en?: string };

// Helper pour traduire les champs multilingues
const translate = (value: string | MultilingualField | null | undefined, lang: string): string => {
  if (!value) return '';
  return getLocalizedText(value, lang);
};

// ⚡ Types de patrimoine disponibles
type TypePatrimoine = 'ville_village' | 'monument' | 'musee' | 'site_archeologique' | 'site_naturel' | 'edifice_religieux' | 'palais_forteresse' | 'autre';

// ⚡ Configuration des onglets selon le type de patrimoine (l'histoire et ses références : tous les types)
const TABS_CONFIG: Record<TypePatrimoine, string[]> = {
  ville_village: ['a_visiter', 'histoire', 'services', 'parcours', 'programmes'],
  monument: ['programmes', 'services', 'galerie', 'histoire'],
  musee: ['programmes', 'collections', 'services', 'galerie', 'histoire'],
  site_archeologique: ['vestiges', 'programmes', 'services', 'histoire'],
  site_naturel: ['parcours', 'services', 'faune_flore', 'galerie', 'histoire'],
  edifice_religieux: ['programmes', 'services', 'histoire', 'galerie'],
  palais_forteresse: ['monuments', 'programmes', 'services', 'histoire'],
  autre: ['monuments', 'vestiges', 'histoire', 'services', 'programmes', 'parcours']
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
  nom: string | MultilingualField;
  adresse: string | MultilingualField;
  latitude: number;
  longitude: number;
  typeLieu: string;
  typePatrimoine?: TypePatrimoine; // New field
  id_createur?: number | null;
  // Points de visite : site parent, chemin jusqu'au site principal, points du même site
  id_lieu_parent?: number | null;
  repere?: string | MultilingualField | null;
  SousLieux?: PointVisite[];
  Ancetres?: Array<{ id_lieu: number; nom: string | MultilingualField; id_createur?: number | null }>;
  Voisins?: Array<{ id_lieu: number; nom: string | MultilingualField; ordre_visite?: number | null }>;
  Commune?: { id_commune: number; nom: string; Daira?: { id_daira: number; nom: string; Wilaya?: { id_wilaya: number; nom: string } } };
  DetailLieu?: {
    id_detailLieu: number;
    description?: string | MultilingualField;
    horaires?: string | MultilingualField;
    histoire?: string | MultilingualField;
    referencesHistoriques?: string | MultilingualField;
    gastronomie?: string | MultilingualField;
    traditions?: string | MultilingualField;
    artisanat_local?: string | MultilingualField;
    personnalites?: string | MultilingualField;
    architecture?: string | MultilingualField;
    infos_pratiques?: string | MultilingualField;
    noteMoyenne?: number;
    nb_contributions?: number;
  };
  medias?: Array<{ id: number; url: string; type: string; langue?: string | null; titre?: string | MultilingualField; legende?: string | MultilingualField; description?: string | MultilingualField }>;
  services?: Array<{ id: number; nom: string | MultilingualField; description?: string | MultilingualField; disponible: boolean }>;
  monuments?: Array<{ id: number; nom: string | MultilingualField; description?: string | MultilingualField; type: string }>;
  vestiges?: Array<{ id: number; nom: string | MultilingualField; description?: string | MultilingualField; type: string }>;
  programmes?: Array<{
    id_programme: number;
    titre: string | MultilingualField;
    description?: string | MultilingualField;
    /** Jour de l'activité (« 2026-10-29 ») et heures seules (« 13:00:00 ») */
    date_programme?: string | null;
    heure_debut?: string | null;
    heure_fin?: string | null;
    Evenement?: {
      id_evenement: number;
      nom_evenement: string | MultilingualField;
      date_debut: string;
      date_fin?: string;
      statut: string;
    };
  }>;
  parcours?: Array<{
    id_parcours: number;
    nom_parcours: string | MultilingualField;
    description?: string | MultilingualField;
    duree_estimee?: number;
    difficulte?: string;
    theme?: string;
    distance_km?: number;
  }>;
  qrcodes?: Array<{ id_qr_code: number; code_unique: string; url_destination: string; qr_image_url?: string }>;
  qrCodeGenerated?: string;
  wilaya?: { id_wilaya: number; nom: string; wilaya_name_ascii?: string };
  commune?: { id_commune: number; nom: string; commune_name_ascii?: string };
  daira?: { id_daira: number; nom: string; daira_name_ascii?: string };
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
  const location = useLocation();
  const fromPath = typeof (location.state as any)?.from === 'string' ? (location.state as any).from : null;
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const lang = i18n.language || 'fr';
  const { isAuthenticated, isAdmin, isValidatedProfessional, hasRole, isOwner } = usePermissions();

  const [site, setSite] = useState<SitePatrimoineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showVisitePlanner, setShowVisitePlanner] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Partager le site
  const share = useShare();
  const handleShareSite = () => share({ title: translate(site?.nom, lang) });

  // Charger les détails du site
  useEffect(() => {
    window.scrollTo(0, 0);
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

  // Articles des sections (« Écrire un article ») : une seule requête pour toute la page
  const [blocsArticles, setBlocsArticles] = useState<PatrimoineBlock[]>([]);
  const chargerArticles = React.useCallback(async (idLieu: number) => {
    const res = await patrimoineArticlesService.getBlocks(idLieu);
    setBlocsArticles(res.success && Array.isArray(res.data) ? res.data : []);
  }, []);
  useEffect(() => {
    if (site?.id_lieu) chargerArticles(site.id_lieu);
  }, [site?.id_lieu, chargerArticles]);
  // Pages détaillées (articles de l'éditeur avancé reliés aux sections) ; rechargées à la
  // connexion : l'auteur voit aussi ses articles en attente de validation
  const [pagesDetaillees, setPagesDetaillees] = useState<PagePatrimoine[]>([]);
  const chargerPages = React.useCallback(async (idLieu: number) => {
    setPagesDetaillees(await getPagesPatrimoine(idLieu));
  }, []);
  useEffect(() => {
    if (site?.id_lieu) chargerPages(site.id_lieu);
  }, [site?.id_lieu, isAuthenticated, chargerPages]);

  // Charger le QR code depuis l'API backend
  useEffect(() => {
    if (!site?.id_lieu) return;
    let mounted = true;
    // httpClient : adresse de l'API configurée (le fetch relatif l'ignorait)
    httpClient.get<{ qr_data_url?: string }>(`/patrimoine/${site.id_lieu}/qrcode`)
      .then(d => { if (mounted && d.success && d.data?.qr_data_url) setQrDataUrl(d.data.qr_data_url); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [site?.id_lieu]);

  // Télécharger le QR Code : image déjà chargée (aucun aller-retour) ; échec signalé honnêtement
  const downloadQRCode = async () => {
    if (!site) return;
    if (!qrDataUrl) {
      toast({ title: t('common.error', 'Erreur'), description: t('qrcode.downloadError', 'Impossible de télécharger le QR Code'), variant: 'destructive' });
      return;
    }
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `taladz-patrimoine-${site.id_lieu}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast({ title: t('qrcode.success', 'QR Code téléchargé'), description: t('qrcode.checkDownloads', 'Vérifiez vos téléchargements') });
  };

  // Image principale (null sans photo : bandeau compact plutôt qu'une image de remplacement)
  const mainImage = site?.medias?.find(m => m.type === 'image' && m.url)?.url || null;
  const getMainImage = (): string => mainImage || '/images/placeholder-patrimoine.svg';

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
        {/* Page introuvable : exclue de l'index (sinon page vide indexée) */}
        <SEOHead title={t('patrimoine.notFound', 'Site non trouvé')} noindex />
        <Header />
        <main className="container py-8">
          <Card className="text-center py-12">
            <CardContent>
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">{t('common.error', 'Erreur')}</h2>
              <p className="text-muted-foreground mb-4">{error || 'Site non trouvé'}</p>
              <Button onClick={() => navigate('/patrimoine')}>
                <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />
                {t('common.back', 'Retour')}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Photos et vidéos d'un côté (galerie), enregistrements audio de l'autre (guide audio)
  const visuels = (site.medias || []).filter(m => m.type === 'image' || m.type === 'video');
  const audios = (site.medias || []).filter(m => m.type === 'audio') as MediaAudio[];

  // Points de visite
  const points = site.SousLieux || [];
  const ancetres = site.Ancetres || [];
  const siteParent = ancetres[ancetres.length - 1];
  const voisins = site.Voisins || [];
  const indexVoisin = voisins.findIndex(v => v.id_lieu === site.id_lieu);
  const pointPrecedent = indexVoisin > 0 ? voisins[indexVoisin - 1] : null;
  const pointSuivant = indexVoisin >= 0 && indexVoisin < voisins.length - 1 ? voisins[indexVoisin + 1] : null;
  const repere = translate(site.repere, lang);
  const nomGeo = (o?: { nom?: string; commune_name_ascii?: string; daira_name_ascii?: string; wilaya_name_ascii?: string }) =>
    (lang === 'ar' && o?.nom) || o?.commune_name_ascii || o?.daira_name_ascii || o?.wilaya_name_ascii || o?.nom || '';
  const lieuLisible = [...new Set([nomGeo(site.commune), nomGeo(site.daira), nomGeo(site.wilaya)].filter(Boolean))].join(', ')
    || translate(site.adresse, lang);
  const itineraireUrl = `https://www.google.com/maps/dir/?api=1&destination=${Number(site.latitude)},${Number(site.longitude)}`;
  // Sections « Culture & Patrimoine vivant » : masquées pour un visiteur quand elles sont toutes vides
  const blocsDe = (section: string) => blocsArticles.filter(b => b.section_patrimoine === section);
  const pagesDe = (section: string) => pagesDetaillees.filter(pg => pg.section_patrimoine === section);
  const cultureRemplie = (['architecture', 'traditions', 'gastronomie', 'artisanat_local', 'personnalites', 'infos_pratiques'] as const)
    .some(k => translate(site.DetailLieu?.[k], lang).trim() !== '' || blocsDe(k).length > 0 || pagesDe(k).length > 0);
  const canAddContent = isAdmin || isValidatedProfessional();
  // « Écrire un article » : même règle que le serveur (modération et professionnels validés)
  const peutEcrireArticle = canAddContent || hasRole('Moderateur');
  const canReorderPoints = isAdmin || hasRole('Moderateur') || (!!site.id_createur && isOwner(site.id_createur));
  // Modifier la fiche, les photos et les audios : même règle que le serveur (créateur du site,
  // ou du site d'un point de visite, et modération)
  const parentDirect = site.Ancetres?.length ? site.Ancetres[site.Ancetres.length - 1] : null;
  const canEditSite = canReorderPoints || (!!parentDirect?.id_createur && isOwner(parentDirect.id_createur));

  // Libellé accessible d'un média (titre/légende sinon « Site – photo N »)
  const siteDisplayName = translate(site.nom, lang);
  const getMediaLabel = (media: NonNullable<SitePatrimoineDetail['medias']>[number], idx: number): string =>
    translate(media.titre, lang) || translate(media.legende, lang)
    || `${siteDisplayName} – ${t('common.photo', 'photo')} ${idx + 1}`;
  const getVideoLabel = (media: NonNullable<SitePatrimoineDetail['medias']>[number], idx: number): string =>
    t('patrimoine.playVideo', 'Lire la vidéo : {{title}}', { title: getMediaLabel(media, idx) });
  const selectedMediaIndex = selectedImage ? visuels.findIndex(m => m.url === selectedImage) : -1;
  const selectedImageAlt = selectedMediaIndex >= 0
    ? getMediaLabel(visuels[selectedMediaIndex], selectedMediaIndex)
    : siteDisplayName;

  const seoKeywords = [
    translate(site?.nom, lang), site?.typePatrimoine,
    site?.Commune?.Daira?.Wilaya?.nom, 'patrimoine algérien', 'site historique', 'Algérie',
    'tourisme culturel', 'histoire algérienne'
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={translate(site?.nom, lang)}
        description={translate(site?.DetailLieu?.description, lang)?.substring(0, 160) || `Découvrez ${translate(site?.nom, lang)} — patrimoine culturel algérien`}
        image={getMainImage()}
        type="place"
        keywords={seoKeywords}
        jsonLd={[
          buildPatrimoineJsonLd(site),
          buildBreadcrumbJsonLd([
            { name: 'Accueil', url: '/' },
            { name: 'Patrimoine', url: '/patrimoine' },
            ...ancetres.map(a => ({ name: translate(a.nom, lang), url: `/patrimoine/${a.id_lieu}` })),
            { name: translate(site?.nom, lang) || '', url: `/patrimoine/${site?.id_lieu}` },
          ]),
        ]}
      />
      <Header />


      <main className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => fromPath ? navigate(fromPath) : navigate('/patrimoine')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 me-1 rtl:-scale-x-100" />
            {t('common.back', 'Retour')}
          </Button>
          {canEditSite && (
            <Button variant="outline" size="sm" className="order-last ms-auto shrink-0" onClick={() => navigate(`/modifier-patrimoine/${site.id_lieu}`)}>
              <Pencil className="h-4 w-4 me-1" />
              {t('patrimoine.edit.button', 'Modifier')}
            </Button>
          )}
          {/* Historique des textes et retour en arrière : administration */}
          {(isAdmin || hasRole('Moderateur')) && (
            <React.Suspense fallback={null}>
            <HistoriqueLieuDialog
              lieuId={site.id_lieu}
              onRestaure={async () => {
                const res = await patrimoineService.getSiteDetail(site.id_lieu);
                if (res.success && res.data) setSite(res.data as unknown as SitePatrimoineDetail);
              }}
            />
            </React.Suspense>
          )}
          {/* Chemin d'un point de visite : Timgad › Musée de Timgad › Salle 3 */}
          <nav aria-label={t('patrimoine.points.breadcrumb', 'Emplacement dans le site')} className="flex flex-wrap items-center gap-2 min-w-0">
            {ancetres.map(a => (
              <React.Fragment key={a.id_lieu}>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
                <Link to={`/patrimoine/${a.id_lieu}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                  {translate(a.nom, lang)}
                </Link>
              </React.Fragment>
            ))}
            <ChevronRight className="h-4 w-4 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
            <span className="text-sm text-foreground" aria-current="page">{translate(site.nom, lang)}</span>
          </nav>
        </div>

        {/* Image principale et galerie */}
        <div className={`relative mb-8 rounded-xl overflow-hidden ${mainImage ? '' : 'h-56 md:h-64 bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900'}`}>
          {mainImage ? (
            <>
              {/* Plusieurs largeurs : un téléphone télécharge ~85 Ko au lieu de ~200 Ko */}
              <img fetchPriority="high"
                src={getAssetUrl(mainImage, { width: 1280 })}
                srcSet={[640, 960, 1280].map(w => `${getAssetUrl(mainImage, { width: w })} ${w}w`).join(', ')}
                sizes="(min-width: 1280px) 1200px, 100vw"
                alt={translate(site.nom, lang)}
                className="w-full h-[280px] sm:h-[360px] md:h-[420px] object-cover"
              />
              {/* Dégradé assez sombre pour que le titre reste lisible sur toute photo */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </>
          ) : (
            <Landmark className="absolute end-6 top-6 h-24 w-24 text-white/10" aria-hidden="true" />
          )}

          {/* Overlay info */}
          <div className="absolute bottom-0 start-0 end-0 p-5 md:p-6 text-white">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                {/* text-white explicite : la règle globale des h1 (index.css) impose la couleur du texte */}
                <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2 text-white drop-shadow-sm break-words">
                  {translate(site.nom, lang)}
                </h1>
                <div className="flex items-center gap-2 text-white/90 mb-1">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{lieuLisible}</span>
                </div>
                {repere && (
                  <div className="flex items-center gap-2 text-white/90 mb-1">
                    <DoorOpen className="h-4 w-4" aria-hidden="true" />
                    <span>{repere}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                {site.stats?.noteMoyenne && (
                  <Badge className="bg-yellow-500/90 text-white">
                    <Star className="h-4 w-4 me-1 fill-current" />
                    {site.stats.noteMoyenne.toFixed(1)}
                  </Badge>
                )}
                {/* ⚡ Afficher le type de patrimoine traduit avec icône */}
                <Badge variant="secondary" className="bg-white/90 text-stone-900 hover:bg-white/90">
                  {site.typePatrimoine === 'ville_village' && <Building2 className="h-3 w-3 me-1" aria-hidden="true" />}
                  {site.typePatrimoine === 'site_naturel' && <TreePine className="h-3 w-3 me-1" aria-hidden="true" />}
                  {(site.typePatrimoine === 'monument' || site.typePatrimoine === 'site_archeologique') && <Landmark className="h-3 w-3 me-1" aria-hidden="true" />}
                  {t(`patrimoine.types.${site.typePatrimoine || 'autre'}`, TYPE_LABELS[(site.typePatrimoine || 'autre') as TypePatrimoine]?.fr || 'Site')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bouton galerie */}
          {visuels.length > 1 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 end-4"
                >
                  <Camera className="h-4 w-4 me-2" />
                  {visuels.length} {t('patrimoine.photos', 'photos')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{t('patrimoine.gallery', 'Galerie')}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                  {visuels.map((media, idx) => (
                    <div
                      key={idx}
                      className="aspect-video cursor-pointer overflow-hidden rounded-lg"
                      onClick={() => setSelectedImage(media.url)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedImage(media.url); } }}
                      aria-label={media.type === 'video' ? getVideoLabel(media, idx) : undefined}
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Play className="h-8 w-8" aria-hidden="true" />
                        </div>
                      ) : (
                        <img loading="lazy" decoding="async"
                          src={getAssetUrl(media.url, { width: 480 })}
                          alt={getMediaLabel(media, idx)}
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
          <div className="md:col-span-2 space-y-8 min-w-0">
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

            {/* Points de visite du site (Timgad : Arc de Trajan, Marché, Musée…) */}
            {(points.length > 0 || canAddContent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Footprints className="h-5 w-5" />
                    {t('patrimoine.points.title', 'Points à visiter')}
                    {points.length > 0 && <Badge variant="secondary" className="font-normal">{points.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PointsVisite
                    site={site}
                    points={points}
                    lang={lang}
                    canAdd={canAddContent}
                    canReorder={canReorderPoints}
                    onReordered={(nouveaux) => setSite(prev => prev ? { ...prev, SousLieux: nouveaux } : prev)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Guide audio multilingue */}
            {(audios.length > 0 || canAddContent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="h-5 w-5" />
                    {t('patrimoine.audio.title', 'Écouter')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GuideAudio
                    lieuId={site.id_lieu}
                    medias={audios}
                    lang={lang}
                    canUpload={canAddContent}
                    onUploaded={(ajoutes) => setSite(prev => prev ? { ...prev, medias: [...(prev.medias || []), ...ajoutes] } : prev)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Point d'un site : retour au site et point précédent / suivant de la visite */}
            {siteParent && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm">
                    {t('patrimoine.points.partOf', 'Fait partie de :')}{' '}
                    <Link to={`/patrimoine/${siteParent.id_lieu}`} className="font-medium hover:underline">{translate(siteParent.nom, lang)}</Link>
                    {indexVoisin >= 0 && (
                      <span className="text-muted-foreground"> · {t('patrimoine.points.position', 'point {{n}} sur {{total}}', { n: indexVoisin + 1, total: voisins.length })}</span>
                    )}
                  </p>
                  {(pointPrecedent || pointSuivant) && (
                    <div className="flex flex-wrap justify-between gap-2">
                      {pointPrecedent ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/patrimoine/${pointPrecedent.id_lieu}`}>
                            <ChevronLeft className="h-4 w-4 me-1 rtl:-scale-x-100" />
                            {translate(pointPrecedent.nom, lang)}
                          </Link>
                        </Button>
                      ) : <span />}
                      {pointSuivant && (
                        <Button size="sm" asChild>
                          <Link to={`/patrimoine/${pointSuivant.id_lieu}`}>
                            {t('patrimoine.points.next', 'Point suivant :')} {translate(pointSuivant.nom, lang)}
                            <ChevronRight className="h-4 w-4 ms-1 rtl:-scale-x-100" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* SECTIONS DÉPLIABLES — adaptées au type de patrimoine      */}
            {/* ─────────────────────────────────────────────────────────── */}
            {(() => {
              const typePatrimoine = (site.typePatrimoine || 'autre') as TypePatrimoine;
              const availableSections = TABS_CONFIG[typePatrimoine] || TABS_CONFIG.autre;

              const counts: Record<string, number> = {
                a_visiter:   (site.monuments?.length || 0) + (site.vestiges?.length || 0),
                monuments:   site.monuments?.length || 0,
                vestiges:    site.vestiges?.length || 0,
                services:    site.services?.length || 0,
                programmes:  site.programmes?.length || 0,
                parcours:    site.parcours?.length || 0,
                galerie:     visuels.length,
                histoire:    translate(site.DetailLieu?.histoire, lang) || translate(site.DetailLieu?.referencesHistoriques, lang)
                  || blocsDe('histoire').length || blocsDe('referencesHistoriques').length
                  || pagesDe('histoire').length || pagesDe('referencesHistoriques').length ? 1 : 0,
                musees:      0,
                collections: 0,
                faune_flore: 0,
              };

              const SECTION_META: Record<string, { label: string; icon: React.ElementType }> = {
                a_visiter:   { label: t('patrimoine.toVisit', 'À Visiter'),     icon: Compass },
                monuments:   { label: t('patrimoine.monuments', 'Monuments'),   icon: Landmark },
                vestiges:    { label: t('patrimoine.vestiges', 'Vestiges'),     icon: Building2 },
                services:    { label: t('patrimoine.services', 'Services'),     icon: CheckCircle2 },
                programmes:  { label: t('patrimoine.programmes', 'Programmes'), icon: Calendar },
                parcours:    { label: t('patrimoine.parcours', 'Parcours'),     icon: Route },
                galerie:     { label: t('patrimoine.gallery', 'Galerie'),       icon: Camera },
                histoire:    { label: t('patrimoine.history', 'Histoire'),      icon: History },
                musees:      { label: t('patrimoine.museums', 'Musées'),        icon: Building2 },
                collections: { label: t('patrimoine.collections', 'Collections'), icon: ImageIcon },
                faune_flore: { label: t('patrimoine.wildlife', 'Faune & Flore'), icon: Info },
              };

              // Visiteur : seulement les sections qui ont du contenu ; contributeur : toutes, pour les compléter
              const sections = isAuthenticated ? availableSections : availableSections.filter(s => (counts[s] || 0) > 0);
              if (sections.length === 0) return null;
              const defaultOpen = sections.filter(s => (counts[s] || 0) > 0);
              const openValues = defaultOpen.length > 0 ? defaultOpen : [sections[0]];

              return (
                <Accordion type="multiple" defaultValue={openValues} className="w-full border rounded-xl overflow-hidden divide-y bg-card">
                  {sections.map((sectionKey) => {
                    const meta = SECTION_META[sectionKey];
                    if (!meta) return null;
                    const count = counts[sectionKey] || 0;
                    const Icon = meta.icon;

                    return (
                      <AccordionItem key={sectionKey} value={sectionKey} className="border-0">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </span>
                            <span className="font-medium text-sm">{meta.label}</span>
                            <span className="ms-auto me-2 shrink-0">
                              {count > 0
                                ? <Badge variant="secondary" className="text-xs font-normal">{count}</Badge>
                                : <span className="text-xs text-muted-foreground italic font-normal">{t('patrimoine.sectionEmpty', 'à compléter')}</span>}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-5 pb-5 pt-2">

                          {/* À Visiter — monuments + vestiges combinés (ville/village) */}
                          {sectionKey === 'a_visiter' && (
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
                                  <Landmark className="h-4 w-4" />
                                  {t('patrimoine.monuments', 'Monuments')}
                                  {(site.monuments?.length || 0) > 0 && <Badge variant="secondary" className="font-normal">{site.monuments!.length}</Badge>}
                                </h4>
                                <SectionElements
                                  lieuId={site.id_lieu} kind="monument"
                                  items={(site.monuments || []) as PatrimoineElement[]} lang={lang}
                                  onItemAdded={(item) => setSite(prev => prev ? { ...prev, monuments: [...(prev.monuments || []), item as any] } : prev)}
                                  onItemUpdated={(item) => setSite(prev => prev ? { ...prev, monuments: (prev.monuments || []).map(m => m.id === item.id ? item as any : m) } : prev)}
                                  onItemDeleted={(id) => setSite(prev => prev ? { ...prev, monuments: (prev.monuments || []).filter(m => m.id !== id) } : prev)}
                                />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-amber-600">
                                  <Building2 className="h-4 w-4" />
                                  {t('patrimoine.vestiges', 'Vestiges')}
                                  {(site.vestiges?.length || 0) > 0 && <Badge variant="secondary" className="font-normal">{site.vestiges!.length}</Badge>}
                                </h4>
                                <SectionElements
                                  lieuId={site.id_lieu} kind="vestige"
                                  items={(site.vestiges || []) as PatrimoineElement[]} lang={lang}
                                  onItemAdded={(item) => setSite(prev => prev ? { ...prev, vestiges: [...(prev.vestiges || []), item as any] } : prev)}
                                  onItemUpdated={(item) => setSite(prev => prev ? { ...prev, vestiges: (prev.vestiges || []).map(v => v.id === item.id ? item as any : v) } : prev)}
                                  onItemDeleted={(id) => setSite(prev => prev ? { ...prev, vestiges: (prev.vestiges || []).filter(v => v.id !== id) } : prev)}
                                />
                              </div>
                            </div>
                          )}

                          {/* Monuments */}
                          {sectionKey === 'monuments' && (
                            <SectionElements
                              lieuId={site.id_lieu} kind="monument"
                              items={(site.monuments || []) as PatrimoineElement[]} lang={lang}
                              onItemAdded={(item) => setSite(prev => prev ? { ...prev, monuments: [...(prev.monuments || []), item as any] } : prev)}
                              onItemUpdated={(item) => setSite(prev => prev ? { ...prev, monuments: (prev.monuments || []).map(m => m.id === item.id ? item as any : m) } : prev)}
                              onItemDeleted={(id) => setSite(prev => prev ? { ...prev, monuments: (prev.monuments || []).filter(m => m.id !== id) } : prev)}
                            />
                          )}

                          {/* Vestiges */}
                          {sectionKey === 'vestiges' && (
                            <SectionElements
                              lieuId={site.id_lieu} kind="vestige"
                              items={(site.vestiges || []) as PatrimoineElement[]} lang={lang}
                              onItemAdded={(item) => setSite(prev => prev ? { ...prev, vestiges: [...(prev.vestiges || []), item as any] } : prev)}
                              onItemUpdated={(item) => setSite(prev => prev ? { ...prev, vestiges: (prev.vestiges || []).map(v => v.id === item.id ? item as any : v) } : prev)}
                              onItemDeleted={(id) => setSite(prev => prev ? { ...prev, vestiges: (prev.vestiges || []).filter(v => v.id !== id) } : prev)}
                            />
                          )}

                          {/* Services */}
                          {sectionKey === 'services' && (
                            <ServicesProximite
                              lieuId={site.id_lieu}
                              lieuName={translate(site.nom, lang)}
                              services={site.services}
                              variant="full"
                              showTitle={false}
                            />
                          )}

                          {/* Programmes */}
                          {sectionKey === 'programmes' && (
                            site.programmes && site.programmes.length > 0 ? (
                              <div className="space-y-4">
                                {site.programmes.map((programme, idx) => (
                                  <Card key={idx}>
                                    <CardHeader className="pb-2">
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{translate(programme.titre, lang)}</CardTitle>
                                      </div>
                                      {programme.Evenement && (
                                        <p className="text-sm font-medium text-primary">{translate(programme.Evenement.nom_evenement, lang)}</p>
                                      )}
                                      <CardDescription className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" aria-hidden="true" />
                                        {(() => {
                                          // Jour seul « AAAA-MM-JJ » : lu à midi pour ne pas changer de jour selon le fuseau
                                          const jour = jourProgramme(programme);
                                          const debut = heureProgramme(programme.heure_debut);
                                          const fin = heureProgramme(programme.heure_fin);
                                          return [
                                            jour && new Date(`${jour}T12:00:00`).toLocaleDateString(getDateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                                            debut && (fin ? `${debut} – ${fin}` : debut)
                                          ].filter(Boolean).join(' · ') || t('programme.noDate', 'Date non définie');
                                        })()}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-sm text-muted-foreground">{translate(programme.description, lang) || t('common.noDescription', 'Aucune description')}</p>
                                      {programme.Evenement && (
                                        <Button variant="link" className="p-0 mt-2" asChild><Link to={evenementPath(programme.Evenement.id_evenement, programme.Evenement.nom_evenement)}>
                                            {t('patrimoine.viewEvent', "Voir l'événement")}
                                            <ChevronRight className="h-4 w-4 ms-1 rtl:-scale-x-100" />
                                          </Link></Button>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">{t('patrimoine.noProgrammes', 'Aucun programme prévu pour le moment')}</p>
                            )
                          )}

                          {/* Parcours */}
                          {sectionKey === 'parcours' && (
                            site.parcours && site.parcours.length > 0 ? (
                              <div className="space-y-4">
                                {site.parcours.map((parcours, idx) => (
                                  <Card key={idx} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{translate(parcours.nom_parcours, lang)}</CardTitle>
                                        {parcours.difficulte && (
                                          <Badge variant={parcours.difficulte === 'facile' ? 'secondary' : parcours.difficulte === 'moyen' ? 'default' : 'destructive'}>
                                            {parcours.difficulte}
                                          </Badge>
                                        )}
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-sm text-muted-foreground mb-3">{translate(parcours.description, lang) || t('common.noDescription', 'Aucune description')}</p>
                                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        {parcours.duree_estimee && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{parcours.duree_estimee} min</span>}
                                        {parcours.distance_km && <span className="flex items-center gap-1"><Route className="h-4 w-4" />{parcours.distance_km} km</span>}
                                        {parcours.theme && <Badge variant="outline">{parcours.theme}</Badge>}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">{t('patrimoine.noParcours', 'Aucun parcours associé')}</p>
                            )
                          )}

                          {/* Galerie */}
                          {sectionKey === 'galerie' && (
                            visuels.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {visuels.map((media, idx) => (
                                  <div key={idx} className="aspect-video cursor-pointer overflow-hidden rounded-lg" onClick={() => setSelectedImage(media.url)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedImage(media.url); } }} aria-label={media.type === 'video' ? getVideoLabel(media, idx) : undefined}>
                                    {media.type === 'video'
                                      ? <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="h-8 w-8" aria-hidden="true" /></div>
                                      : <img loading="lazy" decoding="async" src={getAssetUrl(media.url, { width: 640 })} alt={getMediaLabel(media, idx)} className="w-full h-full object-cover hover:scale-105 transition-transform" />}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">{t('patrimoine.noGallery', 'Aucune photo disponible')}</p>
                            )
                          )}

                          {/* Histoire */}
                          {sectionKey === 'histoire' && (
                            <div className="space-y-4">
                              <SectionEnrichissable icon={<History className="h-5 w-5 text-primary" />} title={t('patrimoine.sections.histoire', 'Histoire')} content={site.DetailLieu?.histoire} lang={lang} lieuId={site.id_lieu} fieldName="histoire" blocs={blocsDe('histoire')} pages={pagesDe('histoire')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, histoire: val } } : prev)} />
                              <SectionEnrichissable icon={<span className="text-xl">📚</span>} title={t('patrimoine.sections.references', 'Références historiques')} content={site.DetailLieu?.referencesHistoriques} lang={lang} lieuId={site.id_lieu} fieldName="referencesHistoriques" blocs={blocsDe('referencesHistoriques')} pages={pagesDe('referencesHistoriques')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, referencesHistoriques: val } } : prev)} />
                            </div>
                          )}

                          {sectionKey === 'musees' && <p className="text-sm text-muted-foreground text-center py-4">{t('patrimoine.noMuseums', 'Aucun musée répertorié')}</p>}
                          {sectionKey === 'collections' && <p className="text-sm text-muted-foreground text-center py-4">{t('patrimoine.noCollections', 'Aucune collection disponible')}</p>}
                          {sectionKey === 'faune_flore' && <p className="text-sm text-muted-foreground text-center py-4">{t('patrimoine.noWildlife', 'Informations sur la faune et flore à venir')}</p>}

                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              );
            })()}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* CULTURE & PATRIMOINE VIVANT                                 */}
            {/* ════════════════════════════════════════════════════════════ */}
            {(isAuthenticated || cultureRemplie) && <div className="space-y-6 mt-8">
              <div className="flex items-center gap-3 pb-3 border-b">
                <span className="text-2xl">🌿</span>
                <div>
                  <h2 className="text-lg font-semibold">{t('patrimoine.sections.cultureVivante', 'Culture & Patrimoine vivant')}</h2>
                  <p className="text-sm text-muted-foreground">{t('patrimoine.sections.cultureVivanteDesc', 'Enrichissez ces sections avec vos connaissances')}</p>
                </div>
              </div>
              <SectionEnrichissable icon={<Building2 className="h-5 w-5 text-primary" />} title={t('patrimoine.sections.architecture', 'Architecture')} content={site.DetailLieu?.architecture} lang={lang} lieuId={site.id_lieu} fieldName="architecture" blocs={blocsDe('architecture')} pages={pagesDe('architecture')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, architecture: val } } : prev)} />
              <SectionEnrichissable icon={<span className="text-xl">🎭</span>} title={t('patrimoine.sections.traditions', 'Traditions & Coutumes')} content={site.DetailLieu?.traditions} lang={lang} lieuId={site.id_lieu} fieldName="traditions" blocs={blocsDe('traditions')} pages={pagesDe('traditions')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, traditions: val } } : prev)} />
              <SectionEnrichissable icon={<Utensils className="h-5 w-5 text-primary" />} title={t('patrimoine.sections.gastronomie', 'Gastronomie locale')} content={site.DetailLieu?.gastronomie} lang={lang} lieuId={site.id_lieu} fieldName="gastronomie" blocs={blocsDe('gastronomie')} pages={pagesDe('gastronomie')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, gastronomie: val } } : prev)} />
              <SectionEnrichissable icon={<span className="text-xl">🏺</span>} title={t('patrimoine.sections.artisanat', 'Artisanat local')} content={site.DetailLieu?.artisanat_local} lang={lang} lieuId={site.id_lieu} fieldName="artisanat_local" blocs={blocsDe('artisanat_local')} pages={pagesDe('artisanat_local')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, artisanat_local: val } } : prev)} />
              <SectionPersonnalites icon={<span className="text-xl">👤</span>} title={t('patrimoine.sections.personnalites', 'Personnalités')} content={site.DetailLieu?.personnalites} lang={lang} lieuId={site.id_lieu} idCreateurSite={site.id_createur} blocs={blocsDe('personnalites')} pages={pagesDe('personnalites')} onPagesChange={() => chargerPages(site.id_lieu)} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, personnalites: val } } : prev)} />
              <SectionEnrichissable icon={<Info className="h-5 w-5 text-primary" />} title={t('patrimoine.sections.infosPratiques', 'Informations pratiques')} content={site.DetailLieu?.infos_pratiques} lang={lang} lieuId={site.id_lieu} fieldName="infos_pratiques" blocs={blocsDe('infos_pratiques')} pages={pagesDe('infos_pratiques')} onPagesChange={() => chargerPages(site.id_lieu)} peutEcrireArticle={peutEcrireArticle} onArticlesChange={() => chargerArticles(site.id_lieu)} onSaved={(val) => setSite(prev => prev ? { ...prev, DetailLieu: { ...prev.DetailLieu!, infos_pratiques: val } } : prev)} />
            </div>}
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
                    {repere && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        {repere}
                      </p>
                    )}
                    {site.commune && (
                      <p className="text-sm text-muted-foreground">{lieuLisible}</p>
                    )}
                  </div>
                </div>

                {/* Coordonnées GPS */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                  <span dir="ltr">GPS : {Number(site.latitude).toFixed(6)}, {Number(site.longitude).toFixed(6)}</span>
                  <a href={itineraireUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline whitespace-nowrap">
                    {t('patrimoine.directions', 'Itinéraire')}
                  </a>
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
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-40 h-40 mx-auto border rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="w-40 h-40 mx-auto border rounded-lg bg-muted flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground animate-pulse" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('patrimoine.scanQR', 'Scannez pour accéder aux informations')}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={downloadQRCode}>
                    <Download className="h-4 w-4 me-2" />
                    {t('common.download', 'Télécharger')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleShareSite}>
                    <Share2 className="h-4 w-4 me-2" />
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
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <Route className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                  <h3 className="font-semibold text-foreground">
                    {t('patrimoine.discoverArea', 'Découvrez les environs')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('patrimoine.planVisitDesc', 'Créez un parcours personnalisé avec les sites à proximité')}
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="w-full"
                  onClick={() => setShowVisitePlanner(true)}
                >
                  <Route className="h-5 w-5 me-2" />
                  {t('patrimoine.planVisit', 'Planifier votre visite')}
                </Button>
              </CardContent>
            </Card>
            
            {/* Lien pour les professionnels */}
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('patrimoine.proService', 'Vous êtes professionnel ?')}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/ajouter-mon-service?lieu=${site.id_lieu}`)}
                >
                  {t('patrimoine.addYourService', 'Proposez vos services ici')}
                </Button>
              </CardContent>
            </Card>
            
            <Button variant="outline" className="w-full" onClick={() => navigate('/patrimoine')}>
              <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />
              {t('patrimoine.backToList', 'Retour à la liste')}
            </Button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Dialog pour image en grand */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0" aria-describedby={undefined}>
            <DialogTitle className="sr-only">{siteDisplayName}</DialogTitle>
            <img
              src={selectedImage}
              alt={selectedImageAlt}
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Planificateur de visite — lazy loaded */}
      {showVisitePlanner && (
        <React.Suspense fallback={null}>
          <VisitePlanner
            isOpen={showVisitePlanner}
            onClose={() => setShowVisitePlanner(false)}
            siteId={site.id_lieu}
            siteName={translate(site.nom, lang)}
            siteLatitude={site.latitude}
            siteLongitude={site.longitude}
            siteType={site.typePatrimoine}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default PatrimoineDetail;
