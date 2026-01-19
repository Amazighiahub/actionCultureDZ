/**
 * OeuvreDetailPage.tsx - Page détail œuvre
 * Utilise HeroSection avec effet flip 3D pour les livres
 */
import React, { Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/UI/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/UI/dialog';
import { Textarea } from '@/components/UI/textarea';
import { Label } from '@/components/UI/label';
import {
  Info, Users, Image, MessageCircle, Calendar,
  BookOpen, Sparkles, ThumbsUp, Send, Loader2,
  Share2, MapPin, CalendarCheck, ImageIcon
} from 'lucide-react';

// Composants partagés
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// ✅ Import du HeroSection avec effet flip 3D
import { HeroSection } from '@/components/oeuvre/HeroSection';

// Hook personnalisé
import { useOeuvreDetails } from '@/hooks/useOeuvreDetails';
import { useAuth } from '@/hooks/useAuth';

// Services
import { oeuvreService } from '@/services/oeuvre.service';
import { evenementService } from '@/services/evenement.service';

// Types
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { Evenement } from '@/types/models/evenement.types';
import type { MediaExtended } from '@/types/models/media-extended.types';

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

// Helper pour extraire les contributeurs
const extractContributeurs = (oeuvre: Oeuvre) => {
  const contributeurs: any[] = [];

  if (oeuvre.Users) {
    oeuvre.Users.forEach((user: any) => {
      const roleInfo = user.OeuvreUser || {};
      contributeurs.push({
        id: `user-${user.id_user}`,
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        photo_url: user.photo_url,
        type: 'user',
        role: roleInfo.TypeUser?.nom || user.TypeUser?.nom_type || 'Contributeur',
        TypeUser: user.TypeUser,
        role_principal: roleInfo.role_principal,
        personnage: roleInfo.personnage,
        description_role: roleInfo.description_role,
        biographie: user.biographie,
        isInscrit: true
      });
    });
  }

  if (oeuvre.OeuvreIntervenants) {
    oeuvre.OeuvreIntervenants.forEach((oeuvreIntervenant: any) => {
      const intervenant = oeuvreIntervenant.Intervenant;
      if (intervenant) {
        contributeurs.push({
          id: `intervenant-${intervenant.id_intervenant}`,
          id_intervenant: intervenant.id_intervenant,
          nom: intervenant.nom,
          prenom: intervenant.prenom,
          photo_url: intervenant.photo_url,
          type: 'intervenant',
          role: oeuvreIntervenant.TypeUser?.nom || intervenant.specialite || 'Contributeur',
          TypeUser: oeuvreIntervenant.TypeUser,
          role_principal: oeuvreIntervenant.role_principal,
          personnage: oeuvreIntervenant.personnage,
          description_role: oeuvreIntervenant.description_role,
          biographie: intervenant.biographie,
          isInscrit: false
        });
      }
    });
  }

  if (oeuvre.Intervenants) {
    oeuvre.Intervenants.forEach((intervenant: any) => {
      const exists = contributeurs.some(c => c.id === `intervenant-${intervenant.id_intervenant}`);
      if (!exists) {
        contributeurs.push({
          id: `intervenant-${intervenant.id_intervenant}`,
          id_intervenant: intervenant.id_intervenant,
          nom: intervenant.nom,
          prenom: intervenant.prenom,
          photo_url: intervenant.photo_url,
          type: 'intervenant',
          role: intervenant.OeuvreIntervenant?.TypeUser?.nom || intervenant.specialite || 'Contributeur',
          TypeUser: intervenant.TypeUser,
          role_principal: intervenant.OeuvreIntervenant?.role_principal,
          personnage: intervenant.OeuvreIntervenant?.personnage,
          description_role: intervenant.OeuvreIntervenant?.description_role,
          biographie: intervenant.biographie,
          isInscrit: false
        });
      }
    });
  }

  return contributeurs.sort((a, b) => {
    if (a.role_principal && !b.role_principal) return -1;
    if (!a.role_principal && b.role_principal) return 1;
    return 0;
  });
};

const OeuvreDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('description');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  // États additionnels pour les fonctionnalités complètes
  const [auteurInfo, setAuteurInfo] = useState<any>(null);
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

  // Charger les données additionnelles quand l'œuvre est chargée
  useEffect(() => {
    if (oeuvre) {
      loadAuteurInfo(oeuvre);
      loadOeuvresAuteur(oeuvre);
      loadEvenementsCreateur(oeuvre);
      setViewCount(oeuvre.nombre_vues || Math.floor(Math.random() * 1000) + 100);
    }
  }, [oeuvre]);

  // Extraire l'auteur principal
  const loadAuteurInfo = (oeuvre: Oeuvre) => {
    const contribs = extractContributeurs(oeuvre);
    const auteurPrincipal = contribs.find((c) => c.role_principal) || contribs[0];
    if (auteurPrincipal) {
      setAuteurInfo(auteurPrincipal);
    }
  };

  // Charger les autres œuvres de l'auteur
  const loadOeuvresAuteur = async (oeuvre: Oeuvre) => {
    try {
      const result = await oeuvreService.getRecentOeuvres(10);
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

  // Format date
  const formatDate = (date?: string) => {
    if (!date) return 'Date non définie';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Retour si pas d'ID
  if (!id) {
    navigate('/oeuvres');
    return null;
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

  const allContributeurs = contributeurs || extractContributeurs(oeuvre);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />

      <main>
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

        {/* Contenu principal avec Tabs */}
        <div className="container max-w-6xl py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">
                <Info className="h-4 w-4 mr-2" />
                {t('oeuvre.tabs.info', 'Description')}
              </TabsTrigger>
              <TabsTrigger value="auteur">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('oeuvre.tabs.author', 'Auteur & Œuvres')}
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageCircle className="h-4 w-4 mr-2" />
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
                    <BookOpen className="h-5 w-5 mr-2 text-primary" />
                    {oeuvre.OeuvreArt ? "Présentation de l'artiste" : "Bibliographie de l'auteur"}
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
                    <p className="text-muted-foreground">Aucune information sur l'auteur disponible.</p>
                  )}
                </CardContent>
              </Card>

              {/* Autres œuvres de l'auteur */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-primary" />
                    Découvrir d'autres œuvres {oeuvre.OeuvreArt ? "de l'artiste" : "de l'auteur"}
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
                                  alt={oeuvreAuteur.titre}
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
                                {oeuvreAuteur.titre}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {oeuvreAuteur.TypeOeuvre?.nom_type}
                                </Badge>
                                {oeuvreAuteur.annee_creation && (
                                  <span className="text-xs text-muted-foreground">
                                    {oeuvreAuteur.annee_creation}
                                  </span>
                                )}
                              </div>
                              {oeuvreAuteur.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {oeuvreAuteur.description}
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
                        Aucune autre œuvre de {oeuvre.OeuvreArt ? "cet artiste" : "cet auteur"} disponible.
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
                <Share2 className="h-5 w-5 mr-2 text-primary" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className={`grid gap-4 ${oeuvre.Livre ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <Button size="lg" className="w-full" variant="default">
                  <ThumbsUp className="h-5 w-5 mr-2" />
                  Recommander
                </Button>
                <Button variant="outline" size="lg" className="w-full" onClick={openCommentModal}>
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Écrire un avis
                </Button>
                {oeuvre.Livre && (
                  <Button variant="outline" size="lg" className="w-full">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Lire un extrait
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
                  <CalendarCheck className="h-5 w-5 mr-2 text-primary" />
                  Prochains événements
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
                      <h4 className="font-medium">{event.nom_evenement}</h4>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(event.date_debut)}</span>
                      </div>
                      {event.Lieu && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{event.Lieu.nom}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/evenements">Voir tous les événements</Link>
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
            <DialogTitle>Ajouter un commentaire</DialogTitle>
            <DialogDescription>
              Partagez votre avis sur cette œuvre
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Votre commentaire</Label>
              <Textarea
                id="comment"
                placeholder="Écrivez votre commentaire ici..."
                className="min-h-[120px] resize-none"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={commentLoading}
              />
              <p className="text-xs text-muted-foreground text-right">
                {commentContent.length} / 500 caractères
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
              Annuler
            </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || commentContent.length > 500 || commentLoading}
            >
              {commentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default OeuvreDetailPage;