/**
 * OeuvreDetailPage.tsx - Page détail œuvre
 * Utilise HeroSection avec effet flip 3D pour les livres
 */
import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Info, Users, Image, MessageCircle, Calendar, ArrowLeft,
  BookOpen, Sparkles, ThumbsUp, Send, Loader2,
  Share2, MapPin, CalendarCheck, ImageIcon,
  Palette, Ruler, Frame, PenTool, Stamp, CheckCircle2, Weight, Tag
} from 'lucide-react';

// Composants partagés
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import SEOHead, { buildOeuvreJsonLd, buildBreadcrumbJsonLd } from '@/components/SEOHead';
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';

// ✅ Import du HeroSection avec effet flip 3D
import { HeroSection } from '@/components/oeuvre/HeroSection';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getMainImage } from '@/types/models/media-extended.types';

// Hook personnalisé
import { useOeuvreDetails } from '@/hooks/useOeuvreDetails';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useAuth } from '@/hooks/useAuth';

// Services
import { oeuvreService } from '@/services/oeuvre.service';
import { evenementService } from '@/services/evenement.service';

// Types
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { Evenement } from '@/types/models/evenement.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import type { Intervenant } from '@/types/models/intervenant.types';

/** Extended Oeuvre with API-injected properties not in the base type */
interface OeuvreWithExtras extends Oeuvre {
  Intervenants?: (Intervenant & { OeuvreIntervenant?: { TypeUser?: { nom?: string }; role_principal?: boolean; personnage?: string; description_role?: string } })[];
  nb_vues?: number;
  image_url?: string;
  couverture_url?: string;
  Genre?: { nom?: string };
}

/** Contributeur extracted from oeuvre relations */
interface ContributeurInfo {
  id: string;
  id_user?: number;
  id_intervenant?: number;
  nom: string;
  prenom: string;
  photo_url?: string;
  type: 'user' | 'intervenant';
  role: string;
  TypeUser?: { nom?: string; nom_type?: string };
  role_principal?: boolean;
  personnage?: string;
  description_role?: string;
  biographie?: string;
  isInscrit: boolean;
}

// ✅ LAZY LOADING des autres sections (pas HeroSection)
const OeuvreInfo = React.lazy(() => import('./oeuvre/OeuvreInfo'));
const OeuvreGallery = React.lazy(() => import('./oeuvre/OeuvreGallery'));
const OeuvreContributeurs = React.lazy(() => import('./oeuvre/OeuvreContributeurs'));
const OeuvreComments = React.lazy(() => import('./oeuvre/OeuvreComments'));
const RelatedOeuvres = React.lazy(() => import('./oeuvre/RelatedOeuvres'));

// Fallback
const SectionFallback: React.FC = () => (
  <LoadingSkeleton type="card" count={1} />
);

// extractContributeurs supprimé — on utilise contributeurs du hook useOeuvreDetails

const OeuvreDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { formatDate: hookFormatDate } = useFormatDate();
  const lang = (i18n.language || 'fr') as SupportedLanguage;

  const fromPath = typeof location.state?.from === 'string' ? location.state.from : null;

  const handleBackNavigation = () => {
    if (fromPath) {
      // Use window.location for maximum reliability
      window.location.href = fromPath;
      return;
    }

    if (window.history.length > 2) {
      navigate(-1);
      return;
    }

    navigate('/oeuvres');
  };

  const [activeTab, setActiveTab] = useState('description');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // États additionnels pour les fonctionnalités complètes
  const [auteurInfo, setAuteurInfo] = useState<ContributeurInfo | null>(null);
  const [oeuvresAuteur, setOeuvresAuteur] = useState<Oeuvre[]>([]);
  const [evenementsCreateur, setEvenementsCreateur] = useState<Evenement[]>([]);
  const [viewCount, setViewCount] = useState(0);

  // Hook pour charger les données principales
  const {
    oeuvre,
    medias,
    contributeurs,
    comments,
    loading,
    error,
    isFavorite,
    toggleFavorite,
    addComment
  } = useOeuvreDetails(id ? parseInt(id) : 0);

  // Scroll en haut et reset des états locaux quand l'ID change (navigation entre oeuvres)
  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveTab('description');
    setAuteurInfo(null);
    setOeuvresAuteur([]);
    setEvenementsCreateur([]);
    setViewCount(0);
  }, [id]);

  // Rediriger vers ArticleViewPage pour les articles (type 4 et 5)
  useEffect(() => {
    if (oeuvre && (oeuvre.id_type_oeuvre === 4 || oeuvre.id_type_oeuvre === 5)) {
      navigate(`/articles/${oeuvre.id_oeuvre}`, { replace: true });
    }
  }, [oeuvre, navigate]);

  // Charger les données additionnelles quand l'œuvre est chargée
  useEffect(() => {
    if (oeuvre) {
      loadOeuvresAuteur(oeuvre);
      loadEvenementsCreateur(oeuvre);
      setViewCount((oeuvre as OeuvreWithExtras).nb_vues || 0);
    }
  }, [oeuvre]);

  // Extraire l'auteur principal depuis les contributeurs du hook
  useEffect(() => {
    if (contributeurs && contributeurs.length > 0) {
      const auteur = contributeurs.find((c) => c.role_principal) || contributeurs[0];
      if (auteur) {
        setAuteurInfo({
          id: `${auteur.id_user ? 'user' : 'intervenant'}-${auteur.id_user || auteur.id_intervenant}`,
          id_user: auteur.id_user,
          id_intervenant: auteur.id_intervenant,
          nom: auteur.nom,
          prenom: auteur.prenom || '',
          photo_url: auteur.photo_url,
          type: auteur.id_user ? 'user' : 'intervenant',
          role: auteur.type_user || auteur.TypeUser?.nom_type || auteur.role || 'Contributeur',
          TypeUser: auteur.TypeUser,
          role_principal: auteur.role_principal,
          personnage: auteur.personnage,
          description_role: auteur.description_role,
          isInscrit: !!auteur.id_user
        });
      }
    }
  }, [contributeurs]);

  // Charger les autres œuvres de l'auteur réel (contributeur principal)
  const loadOeuvresAuteur = async (oeuvre: Oeuvre) => {
    try {
      if (!contributeurs || contributeurs.length === 0) return;
      const auteur = contributeurs.find((c) => c.role_principal) || contributeurs[0];
      if (!auteur) return;

      const query = `${auteur.prenom || ''} ${auteur.nom}`.trim();
      const result = await oeuvreService.searchOeuvres({ q: query, limit: 10 });
      if (result.success && result.data) {
        const oeuvresData = result.data.oeuvres || result.data;
        const filtered = (Array.isArray(oeuvresData) ? oeuvresData : [])
          .filter((o: Oeuvre) => o.id_oeuvre !== oeuvre.id_oeuvre);
        setOeuvresAuteur(filtered.slice(0, 6));
      }
    } catch (err) {
      console.error('Erreur chargement œuvres auteur:', err);
    }
  };

  // Charger les événements liés
  const loadEvenementsCreateur = async (oeuvre: Oeuvre) => {
    try {
      const result = await evenementService.getByOeuvre(oeuvre.id_oeuvre);
      if (result.success && result.data) {
        const events = Array.isArray(result.data) ? result.data : [];
        const upcomingEvents = events.filter((e: Evenement) =>
          e.statut === 'planifie' || e.statut === 'en_cours'
        );
        setEvenementsCreateur(upcomingEvents.slice(0, 3));
      }
    } catch (err) {
      console.error('Erreur chargement événements:', err);
    }
  };

  // Toggle favori avec loading
  const handleToggleFavorite = async () => {
    setFavoriteLoading(true);
    try {
      await toggleFavorite();
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Ajouter un commentaire
  const handleSubmitComment = async () => {
    if (!oeuvre || !commentContent.trim()) return;

    setCommentLoading(true);
    try {
      const success = await addComment(commentContent.trim());
      if (success) {
        setCommentContent('');
        setShowCommentModal(false);
      }
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Ouvrir modal commentaire
  const openCommentModal = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setShowCommentModal(true);
    setCommentContent('');
  };

  // Recommander l'œuvre (partage)
  const handleRecommander = async () => {
    const title = oeuvre?.titre || '';
    const url = window.location.href;
    try {
      await navigator.share({ title: String(title), text: t('oeuvre.shareText', 'Découvrez cette œuvre : {{title}}', { title: String(title) }), url });
    } catch {
      setShowShareModal(true);
    }
  };

  // Lire un extrait
  const handleLireExtrait = () => {
    const livreExtrait = (oeuvre?.Livre as unknown as { url_extrait?: string })?.url_extrait;
    if (livreExtrait) {
      window.open(livreExtrait, '_blank', 'noopener,noreferrer');
    } else {
      // Scroll vers la section description qui contient l'extrait
      setActiveTab('description');
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return t('common.dateUndefined', 'Date non définie');
    return hookFormatDate(date, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Retour si pas d'ID — utiliser <Navigate> au lieu de navigate() pendant le render
  if (!id) {
    return <Navigate to="/oeuvres" replace />;
  }

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <LoadingSkeleton type="profile" />
          <div className="mt-8">
            <LoadingSkeleton type="card" count={3} />
          </div>
        </main>
      </div>
    );
  }

  // Erreur
  if (error || !oeuvre) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t('oeuvre.notFound', 'Œuvre non trouvée')}</h2>
            <Button onClick={() => navigate('/oeuvres')}>
              {t('oeuvre.backToList', 'Retour aux œuvres')}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const allContributeurs = contributeurs || [];

  // Mémoriser seoKeywords et seoJsonLd pour éviter de recréer les références à chaque render
  // (sinon SEOHead boucle son useEffect et bloque la navigation entre pages)
  const seoKeywords = useMemo(() => [
    getTranslation(oeuvre.titre, lang),
    getTranslation(oeuvre.TypeOeuvre?.nom_type, lang),
    getTranslation((oeuvre as OeuvreWithExtras).Genre?.nom, lang),
    'culture algérienne', 'littérature algérienne', 'œuvre algérienne'
  ].filter(Boolean) as string[], [oeuvre, lang]);

  const seoJsonLd = useMemo(() => [
    buildOeuvreJsonLd(oeuvre),
    buildBreadcrumbJsonLd([
      { name: t('nav.home', 'Accueil'), url: '/' },
      { name: t('nav.oeuvres', 'Œuvres'), url: '/oeuvres' },
      { name: getTranslation(oeuvre.titre, lang) || '', url: `/oeuvres/${oeuvre.id_oeuvre}` },
    ]),
  ], [oeuvre, lang, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <SEOHead
        title={getTranslation(oeuvre.titre, lang)}
        description={getTranslation(oeuvre.description, lang)?.substring(0, 160) || t('oeuvre.seoDescription', 'Découvrez {{title}} — œuvre culturelle algérienne', { title: getTranslation(oeuvre.titre, lang) })}
        image={(oeuvre as OeuvreWithExtras).image_url || (oeuvre as OeuvreWithExtras).couverture_url}
        type="article"
        keywords={seoKeywords}
        jsonLd={seoJsonLd}
      />
      <Header />

      <main>
        {/* Bouton retour */}
        <div className="container pt-4">
          {fromPath ? (
            <a href={fromPath} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.back', 'Retour')}
            </a>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleBackNavigation} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.back', 'Retour')}
            </Button>
          )}
        </div>
        {/* ════════════════════════════════════════════════════════════════════
            ✅ HERO SECTION AVEC EFFET FLIP 3D POUR LES LIVRES
            ════════════════════════════════════════════════════════════════════ */}
        <HeroSection
          oeuvre={oeuvre}
          medias={(medias || []) as MediaExtended[]}
          contributeurs={allContributeurs}
          viewCount={viewCount}
          commentsCount={comments?.length || 0}
          isFavorite={isFavorite}
          favoriteLoading={favoriteLoading}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* Section détaillée style galerie pour Œuvre d'Art et Artisanat */}
        {(oeuvre.id_type_oeuvre === 6 || oeuvre.id_type_oeuvre === 7) && (() => {
          const allImages = (medias || []).filter(m => m.type_media === 'image');
          const mainImg = getMainImage((medias || []) as MediaExtended[]);
          const artData = (oeuvre as OeuvreWithExtras).OeuvreArt;
          const artisanatData = (oeuvre as OeuvreWithExtras).Artisanat;
          const auteurNom = allContributeurs.length > 0
            ? allContributeurs.map(c => `${c.prenom || ''} ${c.nom || ''}`).join(', ').trim()
            : undefined;

          return (
            <div className="container max-w-6xl py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gauche — Galerie */}
                <div className="space-y-4">
                  {/* Image principale */}
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted border">
                    {mainImg ? (
                      <img
                        src={getAssetUrl(mainImg)}
                        alt={getTranslation(oeuvre.titre, lang)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Palette className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  {/* Miniatures */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {allImages.map((media, idx) => (
                        <button
                          key={media.id_media || idx}
                          className="w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors flex-shrink-0 bg-muted"
                          onClick={() => {
                            // Scroll to gallery tab
                            setActiveTab('description');
                          }}
                        >
                          <img
                            src={getAssetUrl(media.url)}
                            alt={media.titre || `Image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Droite — Infos détaillées */}
                <div className="space-y-6">
                  {/* Titre et artiste */}
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      {getTranslation(oeuvre.titre, lang)}
                      {oeuvre.annee_creation && <span className="text-muted-foreground font-normal">, {oeuvre.annee_creation}</span>}
                    </h2>
                    {auteurNom && (
                      <p className="text-lg text-primary font-medium">{auteurNom}</p>
                    )}
                  </div>

                  {/* Section "À propos de l'œuvre" */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                      {oeuvre.id_type_oeuvre === 6
                        ? t('oeuvre.aboutArt', "À propos de l'œuvre")
                        : t('oeuvre.aboutCraft', "À propos de l'artisanat")}
                    </h3>

                    <div className="space-y-4">
                      {/* Technique */}
                      {(artData?.technique || artisanatData?.Technique?.nom) && (
                        <div className="flex items-start gap-3">
                          <PenTool className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('oeuvre.technique', 'Technique')}</p>
                            <p className="font-medium">{artData?.technique || artisanatData?.Technique?.nom}</p>
                          </div>
                        </div>
                      )}

                      {/* Support (Art) */}
                      {artData?.support && (
                        <div className="flex items-start gap-3">
                          <Frame className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('oeuvre.support', 'Support')}</p>
                            <p className="font-medium">{artData.support}</p>
                          </div>
                        </div>
                      )}

                      {/* Matériau (Artisanat) */}
                      {artisanatData?.Materiau?.nom && (
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('oeuvre.material', 'Matériau')}</p>
                            <p className="font-medium">{artisanatData.Materiau.nom}</p>
                          </div>
                        </div>
                      )}

                      {/* Dimensions */}
                      {(artData?.dimensions || artisanatData?.dimensions) && (
                        <div className="flex items-start gap-3">
                          <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('oeuvre.dimensions', 'Dimensions')}</p>
                            <p className="font-medium">{artData?.dimensions || artisanatData?.dimensions}</p>
                          </div>
                        </div>
                      )}

                      {/* Poids (Artisanat) */}
                      {artisanatData?.poids && (
                        <div className="flex items-start gap-3">
                          <Weight className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('oeuvre.weight', 'Poids')}</p>
                            <p className="font-medium">{artisanatData.poids} kg</p>
                          </div>
                        </div>
                      )}

                      {/* Prix */}
                      {(oeuvre.prix || artisanatData?.prix) && (
                        <div className="flex items-start gap-3">
                          <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('oeuvre.price', 'Prix')}</p>
                            <p className="font-semibold text-xl text-primary">{(oeuvre.prix || artisanatData?.prix)?.toLocaleString('fr-DZ')} DZD</p>
                          </div>
                        </div>
                      )}

                      {/* Statut */}
                      {oeuvre.statut === 'publie' && (
                        <div className="flex items-center gap-3 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <p className="font-medium">{t('oeuvre.verified', 'Œuvre vérifiée et publiée')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description courte */}
                  {oeuvre.description && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                        {getTranslation(oeuvre.description, lang)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Contenu principal avec Tabs */}
        <div className="container max-w-6xl py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">
                <Info className="h-4 w-4 me-2" />
                {t('oeuvre.tabs.info', 'Description')}
              </TabsTrigger>
              <TabsTrigger value="auteur">
                <BookOpen className="h-4 w-4 me-2" />
                {t('oeuvre.tabs.author', 'Auteur & Œuvres')}
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageCircle className="h-4 w-4 me-2" />
                {t('oeuvre.tabs.comments', 'Commentaires')}
                {comments && comments.length > 0 && ` (${comments.length})`}
              </TabsTrigger>
            </TabsList>

            {/* Tab Description */}
            <TabsContent value="description" className="mt-6">
              <ErrorBoundary>
                <Suspense fallback={<SectionFallback />}>
                  <OeuvreInfo oeuvre={oeuvre} />
                </Suspense>
              </ErrorBoundary>

              {/* Contributeurs */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {t('oeuvre.team', 'Équipe de création')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <Suspense fallback={<SectionFallback />}>
                      <OeuvreContributeurs contributeurs={allContributeurs} />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>

              {/* Galerie */}
              {medias && medias.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-primary" />
                      {t('oeuvre.tabs.gallery', 'Galerie')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <OeuvreGallery medias={medias} />
                      </Suspense>
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Auteur & Œuvres */}
            <TabsContent value="auteur" className="mt-6">
              {/* Bibliographie de l'auteur */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <BookOpen className="h-5 w-5 me-2 text-primary" />
                    {oeuvre.OeuvreArt ? t('oeuvre.artistPresentation', "Présentation de l'artiste") : t('oeuvre.authorBibliography', "Bibliographie de l'auteur")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auteurInfo ? (
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={auteurInfo.photo_url} alt={`${auteurInfo.prenom} ${auteurInfo.nom}`} />
                          <AvatarFallback className="text-lg">
                            {auteurInfo.prenom?.[0]}{auteurInfo.nom?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{auteurInfo.prenom} {auteurInfo.nom}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{auteurInfo.role}</p>
                          {auteurInfo.biographie && (
                            <p className="text-sm leading-relaxed">{auteurInfo.biographie}</p>
                          )}
                          {auteurInfo.description_role && (
                            <p className="text-sm leading-relaxed mt-2">{auteurInfo.description_role}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t('oeuvre.noAuthorInfo', "Aucune information sur l'auteur disponible.")}</p>
                  )}
                </CardContent>
              </Card>

              {/* Autres œuvres de l'auteur */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Sparkles className="h-5 w-5 me-2 text-primary" />
                    {oeuvre.OeuvreArt ? t('oeuvre.discoverArtistWorks', "Découvrir d'autres œuvres de l'artiste") : t('oeuvre.discoverAuthorWorks', "Découvrir d'autres œuvres de l'auteur")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {oeuvresAuteur.length > 0 ? (
                    <div className="grid gap-4">
                      {oeuvresAuteur.map((oeuvreAuteur) => (
                        <Link
                          key={oeuvreAuteur.id_oeuvre}
                          to={`/oeuvres/${oeuvreAuteur.id_oeuvre}`}
                          className="group"
                        >
                          <div className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-muted transition-all duration-200">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {oeuvreAuteur.Media && oeuvreAuteur.Media.length > 0 ? (
                                <img
                                  src={oeuvreAuteur.Media[0]?.url || ''}
                                  alt={getTranslation(oeuvreAuteur.titre, lang)}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                {getTranslation(oeuvreAuteur.titre, lang)}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {getTranslation(oeuvreAuteur.TypeOeuvre?.nom_type, lang)}
                                </Badge>
                                {oeuvreAuteur.annee_creation && (
                                  <span className="text-xs text-muted-foreground">
                                    {oeuvreAuteur.annee_creation}
                                  </span>
                                )}
                              </div>
                              {oeuvreAuteur.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {getTranslation(oeuvreAuteur.description, lang)}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {oeuvre.OeuvreArt ? t('oeuvre.noOtherArtistWorks', "Aucune autre œuvre de cet artiste disponible.") : t('oeuvre.noOtherAuthorWorks', "Aucune autre œuvre de cet auteur disponible.")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Commentaires */}
            <TabsContent value="comments" className="mt-6">
              <ErrorBoundary>
                <Suspense fallback={<SectionFallback />}>
                  <OeuvreComments
                    comments={comments || []}
                    onAddComment={addComment}
                    oeuvreId={oeuvre.id_oeuvre}
                  />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>
          </Tabs>

          {/* Section Actions - Toujours visible */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Share2 className="h-5 w-5 me-2 text-primary" />
                {t('oeuvredetailpage.actions', 'Actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className={`grid gap-4 ${oeuvre.Livre ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <Button size="lg" className="w-full" variant="default" onClick={handleRecommander}>
                  <ThumbsUp className="h-5 w-5 me-2" />
                  {t('oeuvredetailpage.recommander', 'Recommander')}
                </Button>
                <Button variant="outline" size="lg" className="w-full" onClick={openCommentModal}>
                  <MessageCircle className="h-5 w-5 me-2" />
                  {t('oeuvredetailpage.crire_avis', 'Écrire un avis')}
                </Button>
                {oeuvre.Livre && (
                  <Button variant="outline" size="lg" className="w-full" onClick={handleLireExtrait}>
                    <BookOpen className="h-5 w-5 me-2" />
                    {t('oeuvredetailpage.lire_extrait', 'Lire un extrait')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Événements du créateur */}
          {evenementsCreateur.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CalendarCheck className="h-5 w-5 me-2 text-primary" />
                  {t('oeuvredetailpage.prochains_vnements', 'Prochains événements')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {evenementsCreateur.map((event) => (
                    <Link
                      key={event.id_evenement}
                      to={`/evenements/${event.id_evenement}`}
                      className="block p-4 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <h4 className="font-medium">{getTranslation(event.nom_evenement, lang)}</h4>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(event.date_debut)}</span>
                      </div>
                      {event.Lieu && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{getTranslation(event.Lieu.nom, lang)}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/evenements">{t('oeuvredetailpage.voir_tous_les', 'Voir tous les événements')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Œuvres similaires */}
          <div className="mt-12">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="card" count={3} />}>
                <RelatedOeuvres oeuvreId={oeuvre.id_oeuvre} typeId={oeuvre.id_type_oeuvre} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Modal d'ajout de commentaire */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('oeuvredetailpage.commentaires', 'Ajouter un commentaire')}</DialogTitle>
            <DialogDescription>
              {t('oeuvredetailpage.partagez_votre_avis', 'Partagez votre avis sur cette œuvre')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">{t('oeuvredetailpage.votre_commentaire', 'Votre commentaire')}</Label>
              <Textarea
                id="comment"
                placeholder={t('oeuvredetailpage.placeholder_crivez_votre_commentaire', 'Écrivez votre commentaire ici...')}
                className="min-h-[120px] resize-none"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={commentLoading}
              />
              <p className="text-xs text-muted-foreground text-right">
                {commentContent.length} / 500 {t('common.characters', 'caractères')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCommentModal(false);
                setCommentContent('');
              }}
              disabled={commentLoading}
            >
              {t('oeuvredetailpage.annuler', 'Annuler')}
            </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || commentContent.length > 500 || commentLoading}
            >
              {commentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t('oeuvredetailpage.envoi', 'Envoi...')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 me-2" />
                  {t('oeuvredetailpage.envoyer', 'Envoyer')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de partage / recommandation */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('oeuvredetailpage.recommander', 'Recommander cette œuvre')}</DialogTitle>
            <DialogDescription>
              {t('oeuvredetailpage.partager_desc', 'Partagez cette œuvre sur vos réseaux')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button variant="outline" className="w-full" asChild>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getTranslation(oeuvre?.titre, lang) + ' - ')}${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer">
                Twitter / X
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(getTranslation(oeuvre?.titre, lang) + ' ' + window.location.href)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShareModal(false); }}>
              {t('common.copyLink', 'Copier le lien')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default OeuvreDetailPage;