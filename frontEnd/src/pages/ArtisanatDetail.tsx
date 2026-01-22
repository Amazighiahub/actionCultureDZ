/**
 * ArtisanatDetail.tsx - Page de détail d'un artisanat
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/UI/avatar';
import { Skeleton } from '@/components/UI/skeleton';
import {
  ArrowLeft, MapPin, Phone, Mail, Heart,
  Share2, Ruler, Scale, Palette, Hammer, Calendar,
  User, Package, Eye, MessageCircle, ChevronLeft, ChevronRight, Star
} from 'lucide-react';

import { artisanatService } from '@/services/artisanat.service';
import { useTranslateData } from '@/hooks/useTranslateData';
import { useToast } from '@/components/UI/use-toast';
import { cn } from '@/lib/utils';
import { getAssetUrl } from '@/helpers/assetUrl';

interface ArtisanatData {
  id: number;
  nom: string;
  description: string;
  id_materiau: number;
  id_technique: number;
  artisan_id: number;
  wilaya_id: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande: boolean;
  en_stock?: number;
  statut?: string;
  created_at: string;
  updated_at: string;
  dimensions?: string;
  poids?: string;
  prix?: number;
  // Données étendues pour la page détail
  Oeuvre?: {
    id_oeuvre: number;
    titre: string | { fr: string; ar: string; en: string };
    description?: string | { fr: string; ar: string; en: string };
    annee_creation?: number;
    statut: string;
    date_creation: string;
    Saiseur?: {
      id_user: number;
      nom: string;
      prenom: string;
      photo_url?: string;
      email?: string;
      telephone?: string;
      biographie?: string;
      role?: string; // 'artisan' | 'professionnel' | 'admin'
      Wilaya?: { nom: string; code: string };
    };
    Media?: Array<{
      id_media: number;
      url: string;
      type_media: string;
      thumbnail_url?: string;
      ordre?: number;
    }>;
    TypeOeuvre?: { id_type_oeuvre: number; nom_type: string };
    Commentaires?: Array<{
      id_commentaire: number;
      id_user: number;
      nom_user: string;
      prenom_user: string;
      photo_url?: string;
      commentaire: string;
      note?: number;
      date_creation: string;
    }>;
  };
  Materiau?: { id_materiau: number; nom: string; description?: string };
  Technique?: { id_technique: number; nom: string; description?: string };
  statistiques?: {
    vues: number;
    favoris: number;
    commentaires: number;
  };
  similaires?: ArtisanatData[];
  autres_oeuvres_artisan?: ArtisanatData[];
}

const ArtisanatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { toast } = useToast();

  const [artisanat, setArtisanat] = useState<ArtisanatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  
  
  useEffect(() => {
    if (id) {
      loadArtisanat(parseInt(id));
    }
  }, [id]);

  const loadArtisanat = async (artisanatId: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔍 Chargement artisanat ID: ${artisanatId}`);
      
      const response = await artisanatService.getDetail(artisanatId);
      console.log('📡 Réponse API:', response);

      if (response.success && response.data) {
        console.log('✅ Données reçues:', response.data);
        console.log('📊 Structure des données:', JSON.stringify(response.data, null, 2));
        
        const artisanData = response.data as unknown as ArtisanatData;
        console.log('👤 Artisan (Saiseur):', artisanData.Oeuvre?.Saiseur);
        console.log('🖼️ Médias:', artisanData.Oeuvre?.Media);
        console.log('🎨 Matériau:', artisanData.Materiau);
        console.log('🔧 Technique:', artisanData.Technique);
        console.log('💰 Prix:', artisanData.prix);
        console.log('📏 Dimensions:', artisanData.dimensions);
        console.log('💬 Commentaires:', artisanData.Oeuvre?.Commentaires);
        console.log('🎨 Autres œuvres artisan:', artisanData.autres_oeuvres_artisan);
        
        setArtisanat(artisanData);
      } else {
        console.error('❌ Erreur API:', response.error);
        setError(response.error || t('artisanat.notFound', 'Artisanat non trouvé'));
      }
    } catch (err) {
      console.error('Erreur chargement artisanat:', err);
      setError(t('errors.loadingFailed', 'Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (type: string, item: any) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`)) {
      // TODO: Implémenter la suppression
      console.log('Suppression:', type, item);
    }
  };

  const handleShare = async () => {
    try {
      // Partage natif (mobile)
      await navigator.share({
        title: td(artisanat?.Oeuvre?.titre),
        text: `Découvrez cette magnifique œuvre par ${td(artisan?.prenom)} ${td(artisan?.nom)}!`,
        url: window.location.href
      });
    } catch {
      // Fallback: Partage réseaux sociaux
      const shareUrl = encodeURIComponent(window.location.href);
      const shareText = encodeURIComponent(`Découvrez cette magnifique œuvre par ${td(artisan?.prenom)} ${td(artisan?.nom)}!`);
      
      // Ouvrir un modal avec les options de partage
      toast({
        title: t('common.shareOptions', 'Options de partage'),
        description: t('common.shareOptionsDesc', 'Choisissez votre plateforme'),
        action: (
          <div className="flex gap-2 mt-2">
            <Button size="sm" asChild>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        )
      });
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    
    // TODO: Appeler l'API pour ajouter/retirer des favoris
    console.log(`📌 ${isFavorite ? 'Retrait' : 'Ajout'} favoris pour artisanat ID: ${artisanat?.id_artisanat}`);
    
    toast({
      title: isFavorite
        ? t('favoris.removed', 'Retiré des favoris')
        : t('favoris.added', 'Ajouté aux favoris'),
      description: isFavorite
        ? t('favoris.removedDesc', 'L\'œuvre a été retirée de vos favoris')
        : t('favoris.addedDesc', 'L\'œuvre a été ajoutée à vos favoris')
    });
  };

  const nextImage = () => {
    if (medias && currentImageIndex < medias.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="container py-8">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !artisanat) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">{error || t('artisanat.notFound', 'Artisanat non trouvé')}</h1>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.backToList', 'Retour à la liste')}
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { Oeuvre, Materiau, Technique, statistiques, similaires, autres_oeuvres_artisan } = artisanat;
  const medias = Oeuvre?.Media || [];
  const currentMedia = medias[currentImageIndex];
  const artisan = artisanat?.Oeuvre?.Saiseur;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container py-8">
          {/* Retour */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', 'Retour')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Galerie d'images */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
                {currentMedia ? (
                  <img
                    src={getAssetUrl(currentMedia.url)}
                    alt={td(Oeuvre?.titre || '')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}

                {/* Navigation images */}
                {medias.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={prevImage}
                      aria-label={t('common.previousImage', 'Image précédente')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={nextImage}
                      aria-label={t('common.nextImage', 'Image suivante')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleFavorite}
                    aria-label={t('favoris.toggle', 'Ajouter/Retirer des favoris')}
                  >
                    <Heart className={cn('h-5 w-5', isFavorite && 'fill-red-500 text-red-500')} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleShare}
                    aria-label={t('common.share', 'Partager')}
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Miniatures */}
              {medias.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {medias.map((media, index) => (
                    <button
                      key={media.id_media}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors',
                        index === currentImageIndex ? 'border-primary' : 'border-transparent'
                      )}
                    >
                      <img
                        src={getAssetUrl(media.thumbnail_url || media.url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informations */}
            <div className="space-y-6">
              {/* Titre et type */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {Oeuvre?.TypeOeuvre && (
                    <Badge variant="secondary">{td(Oeuvre.TypeOeuvre.nom_type)}</Badge>
                  )}
                  {Oeuvre?.annee_creation && (
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {Oeuvre.annee_creation}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold">{td(Oeuvre?.titre || '')}</h1>
              </div>

              {/* Prix */}
              {artisanat.prix_min && artisanat.prix_max ? (
                <div className="text-2xl font-bold text-primary">
                  {artisanat.prix_min.toLocaleString()} - {artisanat.prix_max.toLocaleString()} DA
                </div>
              ) : artisanat.prix && (
                <div className="text-2xl font-bold text-primary">
                  {artisanat.prix.toLocaleString()} DA
                </div>
              )}

              {/* Description */}
              {Oeuvre?.description ? (
                <p className="text-muted-foreground leading-relaxed">
                  {td(Oeuvre.description)}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  {t('artisanat.noDescription', 'Aucune description disponible')}
                </p>
              )}

              {/* Caractéristiques */}
              <div className="grid grid-cols-2 gap-4">
                {artisanat.dimensions && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Ruler className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('artisanat.dimensions', 'Dimensions')}</p>
                      <p className="font-medium">{artisanat.dimensions}</p>
                    </div>
                  </div>
                )}
                {artisanat.poids && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('artisanat.weight', 'Poids')}</p>
                      <p className="font-medium">{artisanat.poids}</p>
                    </div>
                  </div>
                )}
                {Materiau && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('artisanat.material', 'Matériau')}</p>
                      <p className="font-medium">{td(Materiau.nom)}</p>
                    </div>
                  </div>
                )}
                {Technique && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Hammer className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('artisanat.technique', 'Technique')}</p>
                      <p className="font-medium">{td(Technique.nom)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistiques */}
              {statistiques && (
                <div className="flex gap-6 py-4 border-y">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{statistiques.vues}</span>
                    <span className="text-muted-foreground">{t('stats.views', 'vues')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{statistiques.favoris}</span>
                    <span className="text-muted-foreground">{t('stats.favorites', 'favoris')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{statistiques.commentaires}</span>
                    <span className="text-muted-foreground">{t('stats.comments', 'avis')}</span>
                  </div>
                </div>
              )}

              {/* Artisan */}
              {artisan ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('artisanat.craftsman', 'L\'artisan')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={artisan.photo_url} />
                        <AvatarFallback className="text-lg">
                          {artisan.prenom?.[0]}{artisan.nom?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {td(artisan.prenom)} {td(artisan.nom)}
                        </h3>
                        {artisan.Wilaya && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {td(artisan.Wilaya.nom)}
                          </p>
                        )}
                        {artisan.biographie && (
                          <div className="mt-3">
                            <h4 className="font-medium text-sm mb-2">{t('artisanat.biography', 'Biographie')}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {td(artisan.biographie)}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          {artisan.telephone && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`tel:${artisan.telephone}`}>
                                <Phone className="h-4 w-4 mr-1" />
                                {t('common.call', 'Appeler')}
                              </a>
                            </Button>
                          )}
                          {artisan.email && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${artisan.email}`}>
                                <Mail className="h-4 w-4 mr-1" />
                                {t('common.email', 'Email')}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('artisanat.craftsman', 'L\'artisan')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('artisanat.noArtisanInfo', 'Informations sur l\'artisan non disponibles')}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Commentaires sur l'œuvre */}
          {Oeuvre?.Commentaires && Oeuvre.Commentaires.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">
                {t('artisanat.comments', 'Commentaires')} ({Oeuvre.Commentaires.length})
              </h2>
              <div className="space-y-4">
                {Oeuvre.Commentaires.map((commentaire) => (
                  <Card key={commentaire.id_commentaire}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={commentaire.photo_url} />
                          <AvatarFallback>
                            {commentaire.prenom_user?.[0]}{commentaire.nom_user?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">
                              {td(commentaire.prenom_user)} {td(commentaire.nom_user)}
                            </h4>
                            {commentaire.note && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{commentaire.note}</span>
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {new Date(commentaire.date_creation).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {td(commentaire.commentaire)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Autres œuvres de l'artisan */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">
              {t('artisanat.artisanWorks', 'Autres œuvres de l\'artisan')}
            </h2>
            
            {autres_oeuvres_artisan && autres_oeuvres_artisan.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {autres_oeuvres_artisan.slice(0, 6).map((oeuvre) => (
                  <Link
                    key={oeuvre.id}
                    to={`/modifier-artisanat/${oeuvre.id}`}
                    className="group"
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {oeuvre.Oeuvre?.Media?.[0] ? (
                        <img
                          src={getAssetUrl(oeuvre.Oeuvre.Media[0].url)}
                          alt={td(oeuvre.Oeuvre.titre)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{td(oeuvre.Oeuvre.titre)}</p>
                    {oeuvre.prix && (
                      <p className="text-sm text-primary font-semibold">{oeuvre.prix.toLocaleString()} DA</p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('artisanat.noOtherWorks', 'Cet artisan n\'a pas d\'autres œuvres pour le moment')}</p>
              </div>
            )}
          </section>

          {/* Autres créations similaires */}
          {similaires && similaires.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">
                {t('artisanat.similarCreations', 'Créations similaires')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {similaires.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    to={`/artisanat/${item.id}`}
                    className="group"
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {item.Oeuvre?.Media?.[0] ? (
                        <img
                          src={item.Oeuvre?.Media?.[0]?.url || ''}
                          alt={td(item.Oeuvre?.titre || '')}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{td(item.Oeuvre?.titre)}</p>
                    {item.prix && (
                      <p className="text-sm text-primary font-semibold">{item.prix.toLocaleString()} DA</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Artisanats similaires */}
          {similaires && similaires.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">
                {t('artisanat.similar', 'Artisanats similaires')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {similaires.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    to={`/artisanat/${item.id}`}
                    className="group"
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {item.Oeuvre?.Media?.[0] ? (
                        <img
                          src={item.Oeuvre?.Media?.[0]?.url || ''}
                          alt={td(item.Oeuvre?.titre || '')}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{td(item.Oeuvre?.titre)}</p>
                    {item.prix && (
                      <p className="text-sm text-primary font-semibold">{item.prix.toLocaleString()} DA</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ArtisanatDetail;
