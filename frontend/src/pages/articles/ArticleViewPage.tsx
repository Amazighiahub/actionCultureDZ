// pages/articles/ArticleViewPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Separator } from '@/components/UI/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/UI/avatar';
import { Progress } from '@/components/UI/progress';
import { Textarea } from '@/components/UI/textarea';
import { Label } from '@/components/UI/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/UI/dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  BookOpen,
  Download,
  Share2,
  Bookmark,
  Heart,
  MessageCircle,
  Printer,
  Eye,
  CheckCircle,
  Award,
  Globe,
  Hash,
  FileText,
  Loader2,
  Link as LinkIcon,
  Star,
  Quote,
  ChevronUp,
  Send } from
'lucide-react';

// Services
import { oeuvreService } from '@/services/oeuvre.service';
import { articleBlockService } from '@/services/articleBlock.service';
import { favoriService } from '@/services/favori.service';
import { commentaireService } from '@/services/commentaire.service';
import { authService } from '@/services/auth.service';
import { useToast } from '@/hooks/use-toast';
import { getAssetUrl } from '@/helpers/assetUrl';

// Types
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { ArticleBlock } from '@/types/models/articles.types';
import type { Commentaire } from '@/types/models/tracking.types';
import type { Article, ArticleScientifique } from '@/types/models/oeuvres-specialisees.types';

// Helpers pour gérer les types d'articles
import { useTranslation } from "react-i18next";type ArticleData =
{type: 'article';data: Article;} |
{type: 'article_scientifique';data: ArticleScientifique;} |
{type: 'none';data: null;};

function getArticleData(oeuvre: any, isScientific: boolean): ArticleData {
  if (isScientific && oeuvre?.ArticleScientifique) {
    return { type: 'article_scientifique', data: oeuvre.ArticleScientifique };
  } else if (!isScientific && oeuvre?.Article) {
    return { type: 'article', data: oeuvre.Article };
  }
  return { type: 'none', data: null };
}

const articleHelpers = {
  // Propriétés communes
  getResume: (articleData: ArticleData): string | undefined => {
    switch (articleData.type) {
      case 'article':
        return articleData.data.resume;
      case 'article_scientifique':
        return articleData.data.resume;
      default:
        return undefined;
    }
  },

  // Propriétés spécifiques aux articles normaux
  getAuteur: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article' ? articleData.data.auteur : undefined;
  },

  getSousTitre: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article' ? articleData.data.sous_titre : undefined;
  },

  getSource: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article' ? articleData.data.source : undefined;
  },

  isFactChecked: (articleData: ArticleData): boolean => {
    return articleData.type === 'article' ? articleData.data.fact_checked : false;
  },

  // Propriétés spécifiques aux articles scientifiques
  getJournal: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.journal : undefined;
  },

  isPeerReviewed: (articleData: ArticleData): boolean => {
    return articleData.type === 'article_scientifique' ? articleData.data.peer_reviewed : false;
  },

  isOpenAccess: (articleData: ArticleData): boolean => {
    return articleData.type === 'article_scientifique' ? articleData.data.open_access : false;
  },

  getDoi: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.doi : undefined;
  },

  getVolume: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.volume : undefined;
  },

  getNumero: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.numero : undefined;
  },

  getPages: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.pages : undefined;
  },

  getIssn: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.issn : undefined;
  },

  getImpactFactor: (articleData: ArticleData): number | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.impact_factor : undefined;
  },

  getCitationApa: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.citation_apa : undefined;
  }
};

// Composant de barre de progression de lecture
const ReadingProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);const { t } = useTranslation();

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = scrollTop / docHeight * 100;
      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', updateProgress);
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-background">
      <div
        className="h-full bg-primary transition-all duration-150"
        style={{ width: `${progress}%` }} />
      
    </div>);

};



const ArticleViewPage: React.FC = () => {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();

  // États
  const [oeuvre, setOeuvre] = useState<Oeuvre | null>(null);
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrollToTop, setScrollToTop] = useState(false);

  // États pour le système de commentaires amélioré
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyToComment, setReplyToComment] = useState<number | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  const articleId = parseInt(id || '0');
  const isScientific = oeuvre?.id_type_oeuvre === 5;
  const articleData = oeuvre ? getArticleData(oeuvre, isScientific) : { type: 'none' as const, data: null };

  // Vérifier l'authentification
  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  // Gérer le bouton retour en haut
  useEffect(() => {
    const handleScroll = () => {
      setScrollToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Charger l'article et ses blocs
  useEffect(() => {
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  // Vérifier le statut favori
  useEffect(() => {
    if (articleId && isAuthenticated) {
      checkFavoriteStatus();
    }
  }, [articleId, isAuthenticated]);

  const loadArticle = async () => {
    try {
      setLoading(true);

      // Charger l'œuvre
      const oeuvreResponse = await oeuvreService.getOeuvreById(articleId);

      if (!oeuvreResponse.success || !oeuvreResponse.data) {
        throw new Error('Article non trouvé');
      }

      const oeuvreData = oeuvreResponse.data;

      // Vérifier que c'est bien un article
      if (oeuvreData.id_type_oeuvre !== 4 && oeuvreData.id_type_oeuvre !== 5) {
        navigate(`/oeuvres/${articleId}`);
        return;
      }

      setOeuvre(oeuvreData);

      // Charger les blocs
      const blocksResponse = await articleBlockService.getBlocksByArticle(
        articleId,
        oeuvreData.id_type_oeuvre === 5 ? 'article_scientifique' : 'article'
      );

      if (blocksResponse.success && blocksResponse.data) {
        setBlocks(blocksResponse.data.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
      }

      // Charger les commentaires
      const commentsResponse = await commentaireService.getCommentairesOeuvre(articleId);
      if (commentsResponse.success && commentsResponse.data) {
        setCommentaires(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
      }

      // Tracker la vue
      oeuvreService.trackView(articleId);

    } catch (err: any) {
      console.error('Erreur chargement article:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const response = await favoriService.check('oeuvre', articleId);
      if (response.success) {
        setIsFavorite(response.isFavorite);
      }
    } catch (err) {
      console.error('Erreur vérification favori:', err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      const response = await favoriService.toggle('oeuvre', articleId);
      if (response.success && response.data) {
        setIsFavorite(response.data.added);
      }
    } catch (err) {
      console.error('Erreur toggle favori:', err);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    const title = oeuvre?.titre || 'Article';

    if (navigator.share) {
      navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: t('common.success', 'Succès'),
        description: t('article.linkCopied', 'Lien copié !'),
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToTopFunc = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fonctions pour le système de commentaires
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
          // Si c'est une réponse, mettre à jour le commentaire parent
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
          // Si c'est un nouveau commentaire, l'ajouter au début
          setCommentaires((prevComments) => [result.data as any, ...prevComments]);
        }

        setCommentContent('');
        setShowCommentModal(false);
        setReplyToComment(null);
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: result.error || t('article.commentError', 'Erreur lors de l\'ajout du commentaire'),
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Erreur ajout commentaire:', err);
      toast({
        title: t('common.error', 'Erreur'),
        description: t('article.commentError', 'Erreur lors de l\'ajout du commentaire'),
        variant: 'destructive',
      });
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

  // Calculer les statistiques
  const contentStats = {
    wordCount: blocks.reduce((acc, block) => {
      if (block.type_block === 'text' && block.contenu) {
        return acc + block.contenu.split(/\s+/).length;
      }
      return acc;
    }, 0),
    readingTime: Math.ceil(
      blocks.reduce((acc, block) => {
        if (block.type_block === 'text' && block.contenu) {
          return acc + block.contenu.split(/\s+/).length;
        }
        return acc;
      }, 0) / 250
    )
  };

  // Extraire les contributeurs
  const extractContributeurs = () => {
    const contributeurs: any[] = [];

    if (oeuvre?.OeuvreIntervenants) {
      oeuvre.OeuvreIntervenants.forEach((oi: any) => {
        if (oi.Intervenant) {
          contributeurs.push({
            nom: `${oi.Intervenant.prenom} ${oi.Intervenant.nom}`,
            role: oi.TypeUser?.nom || 'Contributeur',
            principal: oi.role_principal,
            photo: oi.Intervenant.photo_url,
            organisation: oi.Intervenant.organisation
          });
        }
      });
    }

    return contributeurs.sort((a, b) => {
      if (a.principal && !b.principal) return -1;
      if (!a.principal && b.principal) return 1;
      return 0;
    });
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

  // Rendu des blocs
  const renderBlock = (block: ArticleBlock, index: number) => {
    switch (block.type_block) {
      case 'heading':{
          const HeadingTag = `h${block.metadata?.level || 2}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag
              key={block.id_block || index}
              className={`font-bold ${block.metadata?.level === 1 ? 'text-4xl mt-12 mb-6' :
              block.metadata?.level === 2 ? 'text-3xl mt-10 mb-4' :
              'text-2xl mt-8 mb-3'}`
              }>
              
                    {block.contenu}
                </HeadingTag>);

        }

      case 'text':
        return (
          <p key={block.id_block || index} className="text-lg leading-relaxed mb-6 text-justify">
            {block.contenu}
          </p>);


      case 'image':
        return block.media ?
        <figure key={block.id_block || index} className="my-8">
            <img
            src={getAssetUrl(block.media.url)}
            alt={block.metadata?.caption || 'Image'}
            className={`rounded-lg shadow-lg w-full ${
            block.metadata?.layout === 'centered' ? 'max-w-3xl mx-auto' : ''}`
            }
            loading="lazy" />
          
            {block.metadata?.caption &&
          <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">
                {block.metadata.caption}
              </figcaption>
          }
          </figure> :
        null;

      case 'citation':
        return (
          <blockquote
            key={block.id_block || index}
            className="relative my-8 pl-8 pr-4 py-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
            
            <Quote className="absolute -left-3 -top-3 h-8 w-8 text-primary/20 bg-background rounded-full p-1" />
            <p className="text-lg italic mb-2">{block.contenu}</p>
            {block.metadata?.author &&
            <cite className="text-sm text-muted-foreground not-italic">
                — {block.metadata.author}
              </cite>
            }
          </blockquote>);


      case 'list':
        return block.contenu_json ?
        <div key={block.id_block || index} className="my-6">
            {block.metadata?.listType === 'ordered' ?
          <ol className="list-decimal list-inside space-y-2 ml-6 text-lg">
                {block.contenu_json.map((item: string, idx: number) =>
            <li key={idx} className="leading-relaxed">{item}</li>
            )}
              </ol> :

          <ul className="list-disc list-inside space-y-2 ml-6 text-lg">
                {block.contenu_json.map((item: string, idx: number) =>
            <li key={idx} className="leading-relaxed">{item}</li>
            )}
              </ul>
          }
          </div> :
        null;

      case 'code':
        return (
          <div key={block.id_block || index} className="my-6">
            {block.metadata?.language &&
            <div className="bg-muted px-4 py-2 rounded-t-lg">
                <span className="text-sm font-mono">{block.metadata.language}</span>
              </div>
            }
            <pre className="bg-muted p-6 rounded-b-lg overflow-x-auto">
              <code className="text-sm font-mono">{block.contenu}</code>
            </pre>
          </div>);


      case 'separator':
        return <Separator key={block.id_block || index} className="my-12" />;

      case 'table':
        return block.contenu_json ?
        <div key={block.id_block || index} className="my-8 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {block.contenu_json.headers.map((header: string, idx: number) =>
                <th key={idx} className="border p-3 bg-muted font-semibold text-left">
                      {header}
                    </th>
                )}
                </tr>
              </thead>
              <tbody>
                {block.contenu_json.rows.map((row: string[], rowIdx: number) =>
              <tr key={rowIdx}>
                    {row.map((cell: string, cellIdx: number) =>
                <td key={cellIdx} className="border p-3">
                        {cell}
                      </td>
                )}
                  </tr>
              )}
              </tbody>
            </table>
          </div> :
        null;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("articles_articleviewpage.chargement_larticle")}</p>
        </div>
      </div>);

  }

  if (error || !oeuvre) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("articles_articleviewpage.article_introuvable")}</h3>
            <p className="text-muted-foreground mb-4">{error || 'L\'article demandé n\'existe pas.'}</p>
            <Button onClick={() => navigate('/oeuvres')} variant="outline">{t("articles_articleviewpage.retour_aux_uvres")}

            </Button>
          </CardContent>
        </Card>
      </div>);

  }

  const contributeurs = extractContributeurs();

  return (
    <div className="min-h-screen bg-background">
      <ReadingProgress />
      
      {/* Header fixe */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2">
              
              <ArrowLeft className="h-4 w-4" />{t("articles_articleviewpage.retour")}

            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleToggleFavorite}
                title={t("articles_articleviewpage.title_ajouter_aux_favoris")}>
                
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleShare}
                title={t("articles_articleviewpage.title_partager")}>
                
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrint}
                title={t("articles_articleviewpage.title_imprimer")}>
                
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={t("articles_articleviewpage.title_tlcharger_pdf")}>
                
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* En-tête de l'article */}
        <header className="mb-12">
          <div className="space-y-4">
            {/* Badges et métadonnées */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">
                <FileText className="h-3 w-3 mr-1" />
                {isScientific ? 'Article Scientifique' : 'Article'}
              </Badge>
              
              {articleHelpers.isPeerReviewed(articleData) &&
              <Badge variant="secondary">
                  <Award className="h-3 w-3 mr-1" />{t("articles_articleviewpage.valu_par_les")}

              </Badge>
              }
              
              {articleHelpers.isOpenAccess(articleData) &&
              <Badge variant="secondary">
                  <Globe className="h-3 w-3 mr-1" />{t("articles_articleviewpage.accs_libre")}

              </Badge>
              }
              
              {articleHelpers.isFactChecked(articleData) &&
              <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />{t("articles_articleviewpage.vrifi")}

              </Badge>
              }
            </div>

            {/* Titre */}
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              {oeuvre.titre}
            </h1>

            {/* Sous-titre si disponible */}
            {articleHelpers.getSousTitre(articleData) &&
            <h2 className="text-xl lg:text-2xl text-muted-foreground">
                {articleHelpers.getSousTitre(articleData)}
              </h2>
            }

            {/* Auteur et métadonnées */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {articleHelpers.getAuteur(articleData) &&
              <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{articleHelpers.getAuteur(articleData)}</span>
                </div>
              }
              {oeuvre.annee_creation &&
              <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{oeuvre.annee_creation}</span>
                </div>
              }
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{contentStats.readingTime}{t("articles_articleviewpage.min_lecture")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{contentStats.wordCount}{t("articles_articleviewpage.mots")}</span>
              </div>
            </div>

            {/* Source/Journal */}
            {(articleHelpers.getSource(articleData) || articleHelpers.getJournal(articleData)) &&
            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">{t("articles_articleviewpage.publi_dans")}
                <span className="font-medium text-foreground">
                    {articleHelpers.getJournal(articleData) || articleHelpers.getSource(articleData)}
                  </span>
                  {articleHelpers.getVolume(articleData) && ` • Volume ${articleHelpers.getVolume(articleData)}`}
                  {articleHelpers.getNumero(articleData) && ` • Numéro ${articleHelpers.getNumero(articleData)}`}
                  {articleHelpers.getPages(articleData) && ` • Pages ${articleHelpers.getPages(articleData)}`}
                </p>
              </div>
            }
          </div>
        </header>

        {/* Résumé/Abstract */}
        {articleHelpers.getResume(articleData) &&
        <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">{t("articles_articleviewpage.rsum")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">
                {articleHelpers.getResume(articleData)}
              </p>
            </CardContent>
          </Card>
        }

        {/* Contenu de l'article */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {blocks.length > 0 ?
          blocks.map((block, index) => renderBlock(block, index)) :

          <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-xl text-muted-foreground">{t("articles_articleviewpage.contenu_cet_article")}

            </p>
            </div>
          }
        </article>

        {/* Informations bibliographiques */}
        {isScientific && articleData.type === 'article_scientifique' &&
        <Card className="mt-12">
            <CardHeader>
              <CardTitle>{t("articles_articleviewpage.informations_bibliographiques")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {articleHelpers.getDoi(articleData) &&
            <div>
                  <span className="font-medium">{t("articles_articleviewpage.doi")}</span>
                  <a
                href={`https://doi.org/${articleHelpers.getDoi(articleData)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline">
                
                    {articleHelpers.getDoi(articleData)}
                  </a>
                </div>
            }
              {articleHelpers.getIssn(articleData) &&
            <div>
                  <span className="font-medium">{t("articles_articleviewpage.issn")}</span>
                  <span>{articleHelpers.getIssn(articleData)}</span>
                </div>
            }
              {articleHelpers.getImpactFactor(articleData) &&
            <div>
                  <span className="font-medium">{t("articles_articleviewpage.impact_factor")}</span>
                  <span>{articleHelpers.getImpactFactor(articleData)}</span>
                </div>
            }
              {articleHelpers.getCitationApa(articleData) &&
            <div>
                  <p className="font-medium mb-2">{t("articles_articleviewpage.citation_apa")}</p>
                  <Card className="bg-muted">
                    <CardContent className="p-4">
                      <p className="text-sm font-mono">
                        {articleHelpers.getCitationApa(articleData)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
            }
            </CardContent>
          </Card>
        }

        {/* Contributeurs */}
        {contributeurs.length > 0 &&
        <Card className="mt-12">
            <CardHeader>
              <CardTitle>{t("articles_articleviewpage.contributeurs")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contributeurs.map((contributeur, index) =>
              <div key={index} className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={contributeur.photo} />
                      <AvatarFallback>
                        {contributeur.nom.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{contributeur.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {contributeur.role}
                        {contributeur.organisation && ` • ${contributeur.organisation}`}
                      </p>
                    </div>
                    {contributeur.principal &&
                <Badge variant="secondary">{t("articles_articleviewpage.principal")}</Badge>
                }
                  </div>
              )}
              </div>
            </CardContent>
          </Card>
        }

        {/* Section commentaires améliorée */}
        <Card className="mt-12">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />{t("articles_articleviewpage.commentaires")}
                {commentaires.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}>
                  
                  {showComments ? 'Masquer' : 'Afficher'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => openCommentModal()}>
                  
                  <MessageCircle className="h-4 w-4 mr-2" />{t("articles_articleviewpage.commenter")}

                </Button>
              </div>
            </div>
          </CardHeader>
          {showComments &&
          <CardContent>
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
                      
                            <MessageCircle className="h-3 w-3 mr-1" />{t("articles_articleviewpage.rpondre")}

                    </Button>

                          {/* Afficher les réponses */}
                          {comment.Reponses && comment.Reponses.length > 0 &&
                    <div className="mt-4 ml-8 space-y-4">
                              {comment.Reponses.map((reponse: any) =>
                      <div key={reponse.id_commentaire} className="flex items-start space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={reponse.User?.photo_url} />
                                    <AvatarFallback className="text-xs">
                                      {reponse.User?.prenom?.[0]}{reponse.User?.nom?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">
                                        {reponse.User?.prenom} {reponse.User?.nom}
                                      </p>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(reponse.date_creation)}
                                      </span>
                                    </div>
                                    <p className="text-sm mt-1">{reponse.contenu}</p>
                                  </div>
                                </div>
                      )}
                            </div>
                    }
                        </div>
                      </div>
                    </div>
              )}
                </div> :

            <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t("articles_articleviewpage.aucun_commentaire_pour")}

              </p>
                </div>
            }
            </CardContent>
          }
        </Card>

        {/* Catégories et tags */}
        {(oeuvre.Categories && oeuvre.Categories.length > 0 ||
        oeuvre.Tags && oeuvre.Tags.length > 0) &&
        <Card className="mt-12">
            <CardHeader>
              <CardTitle>{t("articles_articleviewpage.classification")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {oeuvre.Categories && oeuvre.Categories.length > 0 &&
            <div>
                  <p className="text-sm font-medium mb-2">{t("articles_articleviewpage.catgories")}</p>
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
                  <p className="text-sm font-medium mb-2">{t("articles_articleviewpage.tags")}</p>
                  <div className="flex flex-wrap gap-2">
                    {oeuvre.Tags.map((tag: any) =>
                <Badge key={tag.id_tag} variant="outline">
                        #{tag.nom_tag || tag.nom}
                      </Badge>
                )}
                  </div>
                </div>
            }
            </CardContent>
          </Card>
        }
      </main>

      {/* Bouton retour en haut */}
      {scrollToTop &&
      <Button
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
        size="icon"
        onClick={scrollToTopFunc}>
        
          <ChevronUp className="h-4 w-4" />
        </Button>
      }

      {/* Modal d'ajout de commentaire */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {replyToComment ? 'Répondre au commentaire' : 'Ajouter un commentaire'}
            </DialogTitle>
            <DialogDescription>{t("articles_articleviewpage.partagez_votre_avis")}

            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">{t("articles_articleviewpage.votre_commentaire")}</Label>
              <Textarea
                id="comment"
                placeholder={t("articles_articleviewpage.placeholder_crivez_votre_commentaire")}
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
              disabled={commentLoading}>{t("articles_articleviewpage.annuler")}


            </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || commentContent.length > 500 || commentLoading}>
              
              {commentLoading ?
              <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("articles_articleviewpage.envoi")}

              </> :

              <>
                  <Send className="h-4 w-4 mr-2" />{t("articles_articleviewpage.envoyer")}

              </>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>);


};

export default ArticleViewPage;