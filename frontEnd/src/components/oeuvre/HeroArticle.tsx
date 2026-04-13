// components/oeuvre/HeroArticle.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, FileText, Eye, Heart, MessageCircle,
  Calendar, Globe, BookMarked, Beaker, ExternalLink,
  CheckCircle, Hash,
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';

interface HeroArticleProps {
  oeuvre: Oeuvre;
  mainImage: string | null;
  titre: string;
  description: string;
  typeId: number;
  mainContributors: any[];
  gt: (field: unknown) => string;
  viewCount: number;
  commentsCount: number;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onToggleFavorite: () => void;
  shareButton: React.ReactNode;
}

const HeroArticle: React.FC<HeroArticleProps> = ({
  oeuvre,
  titre,
  typeId,
  mainContributors,
  gt,
  viewCount,
  commentsCount,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
  shareButton,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();

  const isScientific = typeId === 5;
  const articleSci = oeuvre.ArticleScientifique;
  const article = oeuvre.Article;

  const typeOeuvre = typeof oeuvre.TypeOeuvre?.nom_type === 'object'
    ? (oeuvre.TypeOeuvre.nom_type as Record<string, string>).fr || Object.values(oeuvre.TypeOeuvre.nom_type as Record<string, string>)[0] || 'Œuvre'
    : oeuvre.TypeOeuvre?.nom_type || 'Œuvre';

  return (
    <div className="relative bg-gradient-to-b from-slate-50 via-white to-background dark:from-slate-950 dark:via-background dark:to-background">
      {/* Motif académique subtil en fond */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative container max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* En-tête type publication académique */}
        <div className="space-y-6">
          {/* Badges de classification */}
          <div className={`flex flex-wrap items-center gap-3 ${rtlClasses.flexRow}`}>
            <Badge className={cn(
              "text-white shadow-sm",
              isScientific
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}>
              {isScientific ? (
                <Beaker className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
              ) : (
                <FileText className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
              )}
              {typeOeuvre}
            </Badge>
            {articleSci?.peer_reviewed && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Peer-reviewed
              </Badge>
            )}
            {articleSci?.journal && (
              <Badge variant="outline" className="font-normal">
                <BookMarked className="h-3 w-3 mr-1" />
                {articleSci.journal}
              </Badge>
            )}
            {article?.source && (
              <Badge variant="outline" className="font-normal">
                <BookMarked className="h-3 w-3 mr-1" />
                {article.source}
              </Badge>
            )}
            {oeuvre.annee_creation && (
              <Badge variant="secondary">
                <Calendar className="h-3 w-3 mr-1" />
                {oeuvre.annee_creation}
              </Badge>
            )}
          </div>

          {/* Titre — style académique */}
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold font-serif leading-tight text-foreground">
            {titre}
          </h1>

          {/* Auteurs */}
          {mainContributors.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-muted-foreground">
              {mainContributors.map((contributeur, index) => (
                <span key={contributeur.id_contributeur || contributeur.id || `contrib-${index}`}>
                  <span className="font-medium text-foreground">
                    {gt(contributeur.prenom)} {gt(contributeur.nom)}
                  </span>
                  {contributeur.role && contributeur.role !== 'Contributeur' && (
                    <span className="text-sm text-muted-foreground ml-1">({contributeur.role})</span>
                  )}
                  {index < mainContributors.length - 1 && <span className="mx-1">,</span>}
                </span>
              ))}
            </div>
          )}

          {/* Ligne de métadonnées académiques */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-y border-border/50 py-4">
            {articleSci?.journal && (
              <div className="flex items-center gap-1.5">
                <BookMarked className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="italic font-medium">{articleSci.journal}</span>
              </div>
            )}
            {articleSci?.volume && (
              <div className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                <span>Vol. {articleSci.volume}{articleSci.numero ? `, n° ${articleSci.numero}` : ''}</span>
              </div>
            )}
            {articleSci?.pages && (
              <div className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span>pp. {articleSci.pages}</span>
              </div>
            )}
            {articleSci?.doi && (
              <a
                href={`https://doi.org/${articleSci.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                DOI: {articleSci.doi}
              </a>
            )}
            {article?.url_source && (
              <a
                href={article.url_source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('oeuvre.readOriginal', 'Article original')}
              </a>
            )}
            {oeuvre.Langue && (
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                <span>{gt(oeuvre.Langue.nom)}</span>
              </div>
            )}
          </div>

          {/* Résumé / Abstract */}
          {oeuvre.description && (
            <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {isScientific ? t('oeuvre.abstract', 'Abstract') : t('oeuvre.summary', 'Résumé')}
                </h3>
                <p className="leading-relaxed text-foreground/90">
                  {typeof oeuvre.description === 'string' ? oeuvre.description : (oeuvre.description as any)?.fr || ''}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className={`flex flex-wrap items-center gap-3 ${rtlClasses.flexRow}`}>
            <Button
              size="lg"
              onClick={onToggleFavorite}
              disabled={favoriteLoading}
              variant={isFavorite ? "default" : "outline"}
              className={cn(isFavorite && "bg-red-500 hover:bg-red-600")}
            >
              <Heart className={cn("h-5 w-5 mr-2", isFavorite && "fill-current")} />
              {isFavorite ? t('works.inFavorites', 'Favori') : t('works.actions.addFavorite', 'Favoris')}
            </Button>
            {shareButton}
            {articleSci?.doi && (
              <Button variant="outline" size="lg" asChild>
                <a href={`https://doi.org/${articleSci.doi}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('oeuvre.viewOnDOI', 'Voir sur DOI.org')}
                </a>
              </Button>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 ml-auto text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{formatNumber(viewCount)} {t('works.stats.views', 'vues')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                <span>{formatNumber(commentsCount)} {t('works.stats.reviews', 'avis')}</span>
              </div>
            </div>
          </div>

          {/* Catégories et tags */}
          {((oeuvre.Categories && oeuvre.Categories.length > 0) || (oeuvre.Tags && oeuvre.Tags.length > 0)) && (
            <div className="flex flex-wrap gap-2">
              {oeuvre.Categories?.map((cat: any) => (
                <Badge key={cat.id_categorie} variant="outline" className="text-xs">
                  {gt(cat.nom) || gt(cat.nom_categorie)}
                </Badge>
              ))}
              {oeuvre.Tags?.map((tag: any) => (
                <Badge key={tag.id_tag} variant="secondary" className="text-xs">
                  #{gt(tag.nom) || gt(tag.nom_tag)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroArticle;
