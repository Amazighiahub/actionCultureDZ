/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/UI/avatar';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Share2,
  Heart,
  MessageCircle,
  Facebook,
  Twitter,
  Link as LinkIcon,
  Star,
  ChevronLeft,
  DollarSign,
  Building,
  CheckCircle,
  AlertCircle,
  Loader2,
  ImageIcon,
  Send,
  BookOpen,
  Music,
  Film,
  Palette,
  Sparkles,
  Eye,
  ThumbsUp,
  User,
  Languages,
  CalendarCheck } from
'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/UI/dialog";
import { Textarea } from "@/components/UI/textarea";
import { Label } from "@/components/UI/label";
import { ContributeursSection } from "@/components/oeuvre/ContributeursSection";
import { HeroSection } from '@/components/oeuvre/HeroSection';

// Import des types et services
import { oeuvreService } from '@/services/oeuvre.service';
import { favoriService } from '@/services/favori.service';
import { commentaireService } from '@/services/commentaire.service';
import { authService } from '@/services/auth.service';
import { evenementService } from '@/services/evenement.service';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { Media } from '@/types/models/media.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { getMainImage } from '@/types/models/media-extended.types';
import type { Commentaire } from '@/types/models/tracking.types';
import type { Evenement } from '@/types/models/evenement.types';

// Helper pour extraire tous les contributeurs
import { useTranslation } from "react-i18next";const extractContributeurs = (oeuvre: Oeuvre) => {
  const contributeurs: any[] = [];

  // Ajouter les utilisateurs inscrits
  if (oeuvre.Users) {
    oeuvre.Users.forEach((user: any) => {
      const roleInfo = user.OeuvreUser || {};
      contributeurs.push({
        id: `user-${user.id_user}`,
        nom: user.nom,
        prenom: user.prenom,
        photo_url: user.photo_url,
        type: 'user',
        role: roleInfo.TypeUser?.nom || user.TypeUser?.nom || 'Contributeur',
        role_principal: roleInfo.role_principal,
        personnage: roleInfo.personnage,
        description_role: roleInfo.description_role,
        ordre_apparition: roleInfo.ordre_apparition || 999,
        email: user.email,
        isInscrit: true
      });
    });
  }

  // Ajouter les intervenants non inscrits via OeuvreIntervenants
  if (oeuvre.OeuvreIntervenants) {
    oeuvre.OeuvreIntervenants.forEach((oeuvreIntervenant: any) => {
      const intervenant = oeuvreIntervenant.Intervenant;
      if (intervenant) {
        contributeurs.push({
          id: `intervenant-${intervenant.id_intervenant}`,
          nom: intervenant.nom,
          prenom: intervenant.prenom,
          photo_url: intervenant.photo_url,
          type: 'intervenant',
          role: oeuvreIntervenant.TypeUser?.nom || intervenant.specialite || 'Contributeur',
          role_principal: oeuvreIntervenant.role_principal,
          personnage: oeuvreIntervenant.personnage,
          description_role: oeuvreIntervenant.description_role,
          ordre_apparition: oeuvreIntervenant.ordre_apparition || 999,
          biographie: intervenant.biographie,
          isInscrit: false
        });
      }
    });
  }

  // Trier par ordre d'apparition, puis par rôle principal
  return contributeurs.sort((a, b) => {
    if (a.role_principal && !b.role_principal) return -1;
    if (!a.role_principal && b.role_principal) return 1;
    return a.ordre_apparition - b.ordre_apparition;
  });
};

// Helper pour extraire les détails spécifiques selon le type d'œuvre
const extractDetailsSpecifiques = (oeuvre: Oeuvre): Record<string, any> | null => {
  let details: Record<string, any> | null = null;

  if (oeuvre.Livre) {
    details = {
      ISBN: oeuvre.Livre.isbn,
      "Nombre de pages": oeuvre.Livre.nb_pages,
      Genre: oeuvre.Livre.Genre?.nom
    };
  } else if (oeuvre.Film) {
    details = {
      Durée: oeuvre.Film.duree_minutes ? `${oeuvre.Film.duree_minutes} minutes` : undefined,
      Réalisateur: oeuvre.Film.realisateur,
      Genre: oeuvre.Film.Genre?.nom
    };
  } else if (oeuvre.AlbumMusical) {
    details = {
      Durée: oeuvre.AlbumMusical.duree ? `${oeuvre.AlbumMusical.duree} minutes` : undefined,
      Label: oeuvre.AlbumMusical.label,
      Genre: oeuvre.AlbumMusical.Genre?.nom
    };
  } else if (oeuvre.OeuvreArt) {
    details = {
      Technique: oeuvre.OeuvreArt.technique,
      Dimensions: oeuvre.OeuvreArt.dimensions,
      Support: oeuvre.OeuvreArt.support
    };
  }

  // Filtrer les valeurs undefined
  if (details) {
    const filtered = Object.entries(details).
    filter(([_, value]) => value !== undefined && value !== null && value !== '').
    reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    return Object.keys(filtered).length > 0 ? filtered : null;
  }

  return null;
};

// Hook personnalisé pour gérer les vues
const useTrackView = (oeuvreId: number | null) => {
  useEffect(() => {
    if (!oeuvreId) return;

    const trackView = async () => {
      try {
        // Envoyer une requête pour enregistrer la vue
        await oeuvreService.trackView(oeuvreId);
      } catch (error) {
        console.error('Erreur tracking vue:', error);
      }
    };

    // Tracker la vue après 3 secondes
    const timer = setTimeout(trackView, 3000);

    return () => clearTimeout(timer);
  }, [oeuvreId]);
};

const OeuvreDetailPage: React.FC = () => {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();

  const [oeuvre, setOeuvre] = useState<Oeuvre | null>(null);
  const [medias, setMedias] = useState<MediaExtended[]>([]);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [evenementsCreateur, setEvenementsCreateur] = useState<Evenement[]>([]);
  const [oeuvresAuteur, setOeuvresAuteur] = useState<Oeuvre[]>([]);
  const [auteurInfo, setAuteurInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyToComment, setReplyToComment] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('description');
  const [viewCount, setViewCount] = useState(0);

  // Utiliser le hook de tracking
  const { t } = useTranslation();useTrackView(oeuvre?.id_oeuvre || null);

  // Charger les données de l'œuvre
  useEffect(() => {
    if (id) {
      loadOeuvreData(parseInt(id));
    }
  }, [id]);

  // Vérifier l'authentification
  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  // Vérifier le statut favori
  useEffect(() => {
    if (id && isAuthenticated) {
      checkFavoriteStatus(parseInt(id));
    }
  }, [id, isAuthenticated]);

  // Mettre à jour les meta tags pour le SEO
  useEffect(() => {
    if (oeuvre) {
      document.title = `${oeuvre.titre} - ${oeuvre.TypeOeuvre?.nom_type || 'Œuvre'} | Mon Application`;

      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', oeuvre.description || `Découvrez ${oeuvre.titre}, une œuvre de type ${oeuvre.TypeOeuvre?.nom_type}`);
      }
    }
  }, [oeuvre]);

  const checkFavoriteStatus = async (oeuvreId: number) => {
    try {
      const response = await favoriService.check('oeuvre', oeuvreId);
      if (response.success) {
        setIsFavorite(response.isFavorite);
      }
    } catch (err) {
      console.error('Erreur vérification favori:', err);
    }
  };

  const loadOeuvreData = async (oeuvreId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Charger l'œuvre
      const oeuvreResult = await oeuvreService.getOeuvreById(oeuvreId);

      if (oeuvreResult.success && oeuvreResult.data) {
        setOeuvre(oeuvreResult.data);

        // Charger les médias
        const mediasResult = await oeuvreService.getMedias(oeuvreId);
        if (mediasResult.success && mediasResult.data) {
          setMedias(mediasResult.data);
        }

        // Charger les commentaires
        const commentairesResult = await commentaireService.getCommentairesOeuvre(oeuvreId);
        if (commentairesResult.success && commentairesResult.data) {
          setCommentaires(Array.isArray(commentairesResult.data) ? commentairesResult.data : []);
        }

        // Charger les informations de l'auteur et ses autres œuvres
        loadAuteurInfo(oeuvreResult.data);
        loadOeuvresAuteur(oeuvreResult.data);

        // Charger les événements où le créateur participe
        if (oeuvreResult.data.saisi_par) {
          loadEvenementsCreateur(oeuvreResult.data);
        }

        // Simuler le nombre de vues (à remplacer par l'API)
        setViewCount(Math.floor(Math.random() * 1000) + 100);

      } else {
        throw new Error(oeuvreResult.error || 'Erreur lors du chargement de l\'œuvre');
      }

    } catch (err) {
      console.error('❌ Erreur lors du chargement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const loadEvenementsCreateur = async (oeuvre: Oeuvre) => {
    try {
      // Charger les événements où cette œuvre est présentée
      const result = await evenementService.getByOeuvre(oeuvre.id_oeuvre);
      if (result.success && result.data) {
        const events = Array.isArray(result.data) ? result.data : [];
        // Filtrer les événements futurs ou en cours
        const upcomingEvents = events.filter((e: Evenement) =>
        e.statut === 'planifie' || e.statut === 'en_cours'
        );
        setEvenementsCreateur(upcomingEvents.slice(0, 3));
      }
    } catch (err) {
      console.error('Erreur chargement événements:', err);
    }
  };

  const loadOeuvresAuteur = async (oeuvre: Oeuvre) => {
    try {
      // Trouver l'auteur principal (user ou intervenant avec role_principal = true)
      const contributeurs = extractContributeurs(oeuvre);
      const auteurPrincipal = contributeurs.find((c) => c.role_principal);

      if (!auteurPrincipal) {
        console.log('Aucun auteur principal trouvé');
        return;
      }

      let result;

      if (auteurPrincipal.type === 'user' && auteurPrincipal.id) {
        // Si c'est un utilisateur inscrit, chercher par user_id
        const userId = auteurPrincipal.id.replace('user-', '');

        // Utiliser search pour filtrer par créateur
        result = await oeuvreService.searchOeuvres({
          q: '', // Pas de recherche textuelle
          limit: 20
          // Ajouter un paramètre pour filtrer par créateur si l'API le supporte
          // Sinon, utiliser getOeuvres et filtrer côté client
        });

        // Si l'API ne supporte pas le filtrage par créateur, 
        // récupérer toutes les œuvres et filtrer côté client
        if (result.success && result.data) {
          // Filtrer les œuvres créées par cet utilisateur
          const oeuvresFiltered = result.data.oeuvres.filter(
            (o: Oeuvre) => o.saisi_par === parseInt(userId)
          );
          result.data.oeuvres = oeuvresFiltered;
        }
      } else if (auteurPrincipal.type === 'intervenant' && auteurPrincipal.id) {
        // Si c'est un intervenant, chercher ses autres œuvres
        const intervenantId = auteurPrincipal.id.replace('intervenant-', '');

        // Utiliser la méthode getOeuvresByIntervenant
        result = await oeuvreService.getOeuvresByIntervenant(parseInt(intervenantId), {
          limit: 20,
          role_principal: true // Pour ne récupérer que les œuvres où il a un rôle principal
        });
      }

      if (result && result.success && result.data) {
        // Filtrer l'œuvre actuelle
        const oeuvres = Array.isArray(result.data) ? result.data : result.data.oeuvres || [];
        const filtered = oeuvres.filter((o: Oeuvre) => o.id_oeuvre !== oeuvre.id_oeuvre);
        setOeuvresAuteur(filtered);
      }
    } catch (err) {
      console.error('Erreur chargement œuvres auteur:', err);
      // Fallback : charger les œuvres récentes
      try {
        const result = await oeuvreService.getRecentOeuvres(10);

        if (result.success && result.data) {
          const filtered = result.data.oeuvres.filter((o: Oeuvre) => o.id_oeuvre !== oeuvre.id_oeuvre);
          setOeuvresAuteur(filtered.slice(0, 6)); // Limiter à 6 œuvres
        }
      } catch (fallbackErr) {
        console.error('Erreur fallback:', fallbackErr);
      }
    }
  };
  const loadAuteurInfo = async (oeuvre: Oeuvre) => {
    try {
      // Extraire l'auteur principal (celui avec role_principal = true)
      const contributeurs = extractContributeurs(oeuvre);
      const auteurPrincipal = contributeurs.find((c) => c.role_principal);

      if (auteurPrincipal) {
        setAuteurInfo(auteurPrincipal);
      } else {
        // Si aucun auteur principal, prendre le premier contributeur
        // ou celui qui a créé l'œuvre
        const createur = contributeurs.find((c) =>
        c.type === 'user' && c.id === `user-${oeuvre.saisi_par}`
        ) || contributeurs[0];

        if (createur) {
          setAuteurInfo(createur);
        }
      }
    } catch (err) {
      console.error('Erreur chargement info auteur:', err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!oeuvre || !isAuthenticated) {
      if (!isAuthenticated) {
        navigate('/auth');
        return;
      }
      return;
    }

    setFavoriteLoading(true);
    try {
      const response = await favoriService.toggle('oeuvre', oeuvre.id_oeuvre);
      if (response.success && response.data) {
        setIsFavorite(response.data.added);
      }
    } catch (err) {
      console.error('❌ Erreur toggle favori:', err);
      alert('Erreur lors de la modification du favori');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!oeuvre || !commentContent.trim()) return;

    setCommentLoading(true);
    try {
      const result = await commentaireService.createCommentaireOeuvre(oeuvre.id_oeuvre, {
        contenu: commentContent.trim(),
        parent_id: replyToComment || undefined
      });

      if (result.success && result.data) {
        if (replyToComment) {
          setCommentaires((prevComments) =>
          prevComments.map((comment) => {
            if (comment.id_commentaire === replyToComment) {
              return {
                ...comment,
                Reponses: [...(comment.Reponses || []), result.data as any]
              };
            }
            return comment;
          })
          );
        } else {
          setCommentaires((prevComments) => [result.data as any, ...prevComments]);
        }

        setCommentContent('');
        setShowCommentModal(false);
        setReplyToComment(null);
      } else {
        alert(result.error || 'Erreur lors de l\'ajout du commentaire');
      }
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      alert('Erreur lors de l\'ajout du commentaire');
    } finally {
      setCommentLoading(false);
    }
  };

  const openCommentModal = (parentId: number | null = null) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setReplyToComment(parentId);
    setShowCommentModal(true);
    setCommentContent('');
  };

  const shareOeuvre = (platform: string) => {
    if (!oeuvre) return;

    const url = window.location.href;
    const text = `Découvrez "${oeuvre.titre}" - ${oeuvre.TypeOeuvre?.nom_type || 'Œuvre'}`;

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Lien copié !');
        break;
    }
    setShowShareMenu(false);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Date non définie';

    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    return dateObj.toLocaleDateString('fr-FR', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>);

  }

  if (error || !oeuvre) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-semibold">{t("oeuvredetailpage.erreur")}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {error || 'Œuvre introuvable'}
            </p>
            <Button onClick={() => navigate('/oeuvres')} variant="outline">{t("oeuvredetailpage.retour_aux_uvres")}

            </Button>
          </CardContent>
        </Card>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section avec présentation adaptée selon le type */}
      <HeroSection
        oeuvre={oeuvre}
        medias={medias}
        contributeurs={extractContributeurs(oeuvre)}
        viewCount={viewCount}
        isFavorite={isFavorite}
        favoriteLoading={favoriteLoading}
        onToggleFavorite={handleToggleFavorite}
        onShare={() => setShowShareMenu(!showShareMenu)} />
      

      {/* Menu de partage flottant */}
      {showShareMenu &&
      <div className="fixed top-20 right-4 z-50">
          <Card className="shadow-lg">
            <CardContent className="p-2">
              <button
              onClick={() => shareOeuvre('facebook')}
              className="flex items-center space-x-2 w-full p-2 hover:bg-muted rounded text-sm">
              
                <Facebook className="h-4 w-4" />
                <span>{t("oeuvredetailpage.facebook")}</span>
              </button>
              <button
              onClick={() => shareOeuvre('twitter')}
              className="flex items-center space-x-2 w-full p-2 hover:bg-muted rounded text-sm">
              
                <Twitter className="h-4 w-4" />
                <span>{t("oeuvredetailpage.twitter")}</span>
              </button>
              <button
              onClick={() => shareOeuvre('copy')}
              className="flex items-center space-x-2 w-full p-2 hover:bg-muted rounded text-sm">
              
                <LinkIcon className="h-4 w-4" />
                <span>{t("oeuvredetailpage.copier_lien")}</span>
              </button>
            </CardContent>
          </Card>
        </div>
      }

      <div className="container max-w-6xl py-8">
        {/* Tabs pour Description, Médias, Commentaires */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">{t("oeuvredetailpage.description")}</TabsTrigger>
            <TabsTrigger value="medias">{t("oeuvredetailpage.auteur_uvres")}

            </TabsTrigger>
            <TabsTrigger value="comments">{t("oeuvredetailpage.commentaires")}
              {commentaires.length > 0 && `(${commentaires.length})`}
            </TabsTrigger>
          </TabsList>
              
          <TabsContent value="description" className="mt-6">
            
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <h3 className="text-xl font-semibold mb-4">{t("oeuvredetailpage.propos")}</h3>
                      <div className="whitespace-pre-line text-base leading-relaxed">
                        {oeuvre.description || 'Aucune description disponible.'}
                      </div>
                    </div>

                    {/* Détails spécifiques selon le type */}
                    {(() => {
                  const detailsSpecifiques = extractDetailsSpecifiques(oeuvre);

                  return detailsSpecifiques ?
                  <div className="pt-6 border-t">
                          <h4 className="text-lg font-semibold mb-4">{t("oeuvredetailpage.dtails_techniques")}</h4>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {Object.entries(detailsSpecifiques).map(([key, value]) =>
                      <div key={key} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium text-muted-foreground">{key}</span>
                                <span className="text-sm font-semibold">{String(value)}</span>
                              </div>
                      )}
                          </div>
                        </div> :
                  null;
                })()}

                    {/* Catégories et tags */}
                    {(oeuvre.Categories && oeuvre.Categories.length > 0 ||
                oeuvre.Tags && oeuvre.Tags.length > 0) &&
                <div className="pt-6 border-t space-y-4">
                        <h4 className="text-lg font-semibold">{t("oeuvredetailpage.classification")}</h4>
                        {oeuvre.Categories && oeuvre.Categories.length > 0 &&
                  <div>
                            <p className="text-sm text-muted-foreground mb-2">{t("oeuvredetailpage.catgories")}</p>
                            <div className="flex flex-wrap gap-2">
                              {oeuvre.Categories.map((cat: any) =>
                      <Badge key={cat.id_categorie} variant="secondary">
                                  {cat.nom_categorie || cat.nom}
                                </Badge>
                      )}
                            </div>
                          </div>
                  }
                        {oeuvre.Tags && oeuvre.Tags.length > 0 &&
                  <div>
                            <p className="text-sm text-muted-foreground mb-2">{t("oeuvredetailpage.tags")}</p>
                            <div className="flex flex-wrap gap-2">
                              {oeuvre.Tags.map((tag: any) =>
                      <Badge key={tag.id_tag} variant="outline" className="text-xs">
                                  #{tag.nom_tag || tag.nom}
                                </Badge>
                      )}
                            </div>
                          </div>
                  }
                      </div>
                }

                    {/* Contributeurs */}
                    <div className="pt-6 border-t">
                      <h4 className="text-lg font-semibold mb-4">{t("oeuvredetailpage.quipe_cration")}</h4>
                      <ContributeursSection contributeurs={extractContributeurs(oeuvre)} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="medias" className="mt-6">
                {/* Bibliographie de l'auteur */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-primary" />
                      {oeuvre.OeuvreArt ? 'Présentation de l\'artiste' : 'Bibliographie de l\'auteur'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {auteurInfo &&
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
                            {auteurInfo.biographie &&
                      <p className="text-sm leading-relaxed">{auteurInfo.biographie}</p>
                      }
                            {auteurInfo.description_role &&
                      <p className="text-sm leading-relaxed mt-2">{auteurInfo.description_role}</p>
                      }
                          </div>
                        </div>
                      </div>
                }
                  </CardContent>
                </Card>

                {/* Découvrir d'autres œuvres de l'auteur */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-primary" />{t("oeuvredetailpage.dcouvrir_dautres_uvres")}
                  {oeuvre.OeuvreArt ? 'de l\'artiste' : 'de l\'auteur'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {oeuvresAuteur.length > 0 ?
                <div className="grid gap-4">
                        {oeuvresAuteur.map((oeuvreAuteur) =>
                  <Link
                    key={oeuvreAuteur.id_oeuvre}
                    to={`/oeuvres/${oeuvreAuteur.id_oeuvre}`}
                    className="group">
                    
                            <div className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-muted transition-all duration-200">
                              {/* Image de l'œuvre */}
                              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {oeuvreAuteur.Media && oeuvreAuteur.Media.length > 0 ?
                        <img
                          src={getMainImage(oeuvreAuteur.Media as MediaExtended[]) || ''}
                          alt={oeuvreAuteur.titre}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> :


                        <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                  </div>
                        }
                              </div>
                              
                              {/* Informations de l'œuvre */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                  {oeuvreAuteur.titre}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {oeuvreAuteur.TypeOeuvre?.nom_type}
                                  </Badge>
                                  {oeuvreAuteur.annee_creation &&
                          <span className="text-xs text-muted-foreground">
                                      {oeuvreAuteur.annee_creation}
                                    </span>
                          }
                                </div>
                                {oeuvreAuteur.description &&
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {oeuvreAuteur.description}
                                  </p>
                        }
                              </div>
                            </div>
                          </Link>
                  )}
                      </div> :

                <div className="text-center py-12">
                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">{t("oeuvredetailpage.aucune_autre_uvre")}
                    {oeuvre.OeuvreArt ? 'cet artiste' : 'cet auteur'}{t("oeuvredetailpage.disponible")}
                  </p>
                      </div>
                }
                  </CardContent>
                </Card>

                {/* Section spécifique pour les œuvres d'art */}
                {oeuvre.OeuvreArt && oeuvresAuteur.filter((o) => o.OeuvreArt).length > 0 &&
            <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center">
                        <Palette className="h-5 w-5 mr-2 text-primary" />{t("oeuvredetailpage.autres_uvres_dart")}

                </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {oeuvresAuteur.
                  filter((o) => o.OeuvreArt).
                  map((oeuvreArt) =>
                  <Link
                    key={oeuvreArt.id_oeuvre}
                    to={`/oeuvres/${oeuvreArt.id_oeuvre}`}
                    className="group">
                    
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                                {oeuvreArt.Media && oeuvreArt.Media.length > 0 ?
                      <img
                        src={getMainImage(oeuvreArt.Media as MediaExtended[]) || ''}
                        alt={oeuvreArt.titre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> :


                      <div className="w-full h-full flex items-center justify-center">
                                    <Palette className="h-8 w-8 text-muted-foreground/50" />
                                  </div>
                      }
                              </div>
                              <h5 className="mt-2 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                {oeuvreArt.titre}
                              </h5>
                              {oeuvreArt.OeuvreArt &&
                    <p className="text-xs text-muted-foreground">
                                  {oeuvreArt.OeuvreArt.technique}
                                </p>
                    }
                            </Link>
                  )}
                      </div>
                    </CardContent>
                  </Card>
            }
              </TabsContent>
              
              <TabsContent value="comments" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {commentaires.length > 0 ?
                <div className="space-y-6">
                        {commentaires.map((comment) =>
                  <div key={comment.id_commentaire} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start space-x-4">
                              <Avatar>
                                <AvatarImage
                          src={(comment.User as any)?.photo_url}
                          alt={`${comment.User?.prenom} ${comment.User?.nom}`} />
                        
                                <AvatarFallback>
                                  {comment.User?.prenom?.[0]}{comment.User?.nom?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold">
                                      {comment.User ? `${comment.User.prenom} ${comment.User.nom}` : 'Utilisateur'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(comment.date_creation)}
                                    </p>
                                  </div>
                                  {comment.note_qualite &&
                          <div className="flex items-center space-x-1">
                                      {[...Array(5)].map((_, i) =>
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                              i < Math.floor(comment.note_qualite!) ?
                              'fill-yellow-400 text-yellow-400' :
                              'text-gray-300'}`
                              } />

                            )}
                                    </div>
                          }
                                </div>
                                <p className="mt-3 text-sm leading-relaxed">{comment.contenu}</p>
                                
                                <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => openCommentModal(comment.id_commentaire)}>
                          
                                  <MessageCircle className="h-3 w-3 mr-1" />{t("oeuvredetailpage.rpondre")}

                        </Button>
                              </div>
                            </div>
                          </div>
                  )}
                      </div> :

                <div className="text-center py-12">
                        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">{t("oeuvredetailpage.aucun_commentaire_pour")}

                  </p>
                      </div>
                }
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

        {/* Section Actions - Toujours visible */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Share2 className="h-5 w-5 mr-2 text-primary" />{t("oeuvredetailpage.actions")}

            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className={`grid gap-4 ${
            oeuvre.Livre ?
            'sm:grid-cols-3' :
            'sm:grid-cols-2'}`
            }>
              <Button
                size="lg"
                className="w-full"
                variant="default">
                
                <ThumbsUp className="h-5 w-5 mr-2" />{t("oeuvredetailpage.recommander")}

              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => openCommentModal()}>
                
                <MessageCircle className="h-5 w-5 mr-2" />{t("oeuvredetailpage.crire_avis")}

              </Button>
              
              {/* Bouton Lire un extrait - visible pour certains types d'œuvres */}
              {oeuvre.Livre &&
              <Button
                variant="outline"
                size="lg"
                className="w-full">
                
                  <BookOpen className="h-5 w-5 mr-2" />{t("oeuvredetailpage.lire_extrait")}

              </Button>
              }
            </div>
          </CardContent>
        </Card>

        {/* Événements du créateur */}
        {evenementsCreateur.length > 0 &&
        <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CalendarCheck className="h-5 w-5 mr-2 text-primary" />{t("oeuvredetailpage.prochains_vnements")}

            </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {evenementsCreateur.map((event) =>
              <Link
                key={event.id_evenement}
                to={`/evenements/${event.id_evenement}`}
                className="block p-4 rounded-lg border hover:bg-muted transition-colors">
                
                    <h4 className="font-medium">{event.nom_evenement}</h4>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(event.date_debut)}</span>
                    </div>
                    {event.Lieu &&
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{event.Lieu.nom}</span>
                      </div>
                }
                  </Link>
              )}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/evenements">{t("oeuvredetailpage.voir_tous_les")}

                </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {/* Statistiques de l'œuvre */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Eye className="h-5 w-5 mr-2 text-primary" />{t("oeuvredetailpage.statistiques")}

            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{viewCount}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("oeuvredetailpage.vues")}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{commentaires.length}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("oeuvredetailpage.avis")}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">4.5</p>
                <p className="text-sm text-muted-foreground mt-1">{t("oeuvredetailpage.note_moyenne")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal d'ajout de commentaire */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {replyToComment ? 'Répondre au commentaire' : 'Ajouter un commentaire'}
            </DialogTitle>
            <DialogDescription>{t("oeuvredetailpage.partagez_votre_avis")}

            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">{t("oeuvredetailpage.votre_commentaire")}</Label>
              <Textarea
                id="comment"
                placeholder={t("oeuvredetailpage.placeholder_crivez_votre_commentaire")}
                className="min-h-[120px] resize-none"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={commentLoading} />
              
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
                setReplyToComment(null);
              }}
              disabled={commentLoading}>{t("oeuvredetailpage.annuler")}


            </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || commentContent.length > 500 || commentLoading}>
              
              {commentLoading ?
              <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("oeuvredetailpage.envoi")}

              </> :

              <>
                  <Send className="h-4 w-4 mr-2" />{t("oeuvredetailpage.envoyer")}

              </>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default OeuvreDetailPage;