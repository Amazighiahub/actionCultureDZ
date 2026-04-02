/**
 * HeroLivre - Hero section spécifique au type Livre
 * Effet flip 3D couverture avant/arrière
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, BookMarked, Star, Heart, Eye, MessageCircle,
  Globe, Calendar, FileText, ZoomIn, RotateCcw, Quote,
  Sparkles, ChevronLeft, X
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';

interface HeroLivreProps {
  oeuvre: Oeuvre;
  medias: MediaExtended[];
  mainImage: string | null;
  titre: string;
  description: string;
  typeOeuvre: string;
  mainContributors: any[];
  gt: (field: unknown) => string;
  viewCount: number;
  commentsCount: number;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onToggleFavorite: () => void;
  shareButton: React.ReactNode;
}

const HeroLivre: React.FC<HeroLivreProps> = ({
  oeuvre, medias, mainImage, titre, description, typeOeuvre,
  mainContributors, gt, viewCount, commentsCount,
  isFavorite, favoriteLoading, onToggleFavorite, shareButton
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses, direction } = useRTL();

  const [isFlipped, setIsFlipped] = useState(false);
  const [showExcerpt, setShowExcerpt] = useState(false);
  const [showZoom, setShowZoom] = useState(false);

  return (
    <div className="relative bg-gradient-to-br from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10 min-h-[500px]">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="icon"
          className="mb-6 hover:bg-background/80"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* LIVRE 3D AVEC EFFET FLIP */}
          <div className="lg:col-span-2">
            <div
              className="relative mx-auto w-[180px] sm:w-[200px] md:w-[240px] lg:w-[260px]"
              style={{ perspective: '900px' }}
            >
              <div
                className={cn("relative w-full aspect-[2/3] cursor-pointer transition-all duration-700 ease-in-out")}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped
                    ? `rotateY(${direction === 'rtl' ? '-180deg' : '180deg'})`
                    : 'rotateY(0deg)',
                }}
                onClick={() => setIsFlipped(!isFlipped)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
              >
                {/* COUVERTURE AVANT */}
                <div className="absolute inset-0 w-full h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                  <div className="relative w-full h-full group">
                    <div className={cn("absolute top-0 bottom-0 w-6 bg-gradient-to-r z-10", "from-amber-200 via-amber-100 to-amber-50", "dark:from-amber-900 dark:via-amber-800 dark:to-amber-700")}
                      style={{
                        [direction === 'rtl' ? 'right' : 'left']: 0,
                        transform: `translateX(${direction === 'rtl' ? '100%' : '-100%'})`,
                        boxShadow: direction === 'rtl' ? 'inset -3px 0 8px rgba(0,0,0,0.15)' : 'inset 3px 0 8px rgba(0,0,0,0.15)',
                        borderRadius: direction === 'rtl' ? '0 4px 4px 0' : '4px 0 0 4px'
                      }}>
                      <div className="absolute inset-y-2 inset-x-1 flex flex-col justify-between opacity-30">
                        {[...Array(20)].map((_, i) => <div key={i} className="h-px bg-amber-600/50" />)}
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6" style={{ filter: 'blur(8px)' }} />

                    <div className="relative w-full h-full rounded-r-lg overflow-hidden shadow-2xl border-l-4 border-amber-700/30 dark:border-amber-500/30">
                      {mainImage ? (
                        <img src={mainImage} alt={titre} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 dark:from-amber-900 dark:to-black flex flex-col items-center justify-center p-6 text-center">
                          <BookOpen className="h-12 w-12 text-amber-400/50 mb-4" />
                          <h3 className="text-lg font-bold font-serif line-clamp-3 text-amber-50">{titre}</h3>
                          {mainContributors.length > 0 && (
                            <p className="text-sm text-amber-200/80 mt-2">{gt(mainContributors[0].prenom)} {gt(mainContributors[0].nom)}</p>
                          )}
                        </div>
                      )}

                      {oeuvre.prix === 0 && (
                        <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                          <Badge className="bg-green-500 text-white border-0 shadow-lg">{t('works.pricing.free', 'Gratuit')}</Badge>
                        </div>
                      )}

                      {(oeuvre as any).note_moyenne && (oeuvre as any).note_moyenne > 0 && (
                        <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                          <Badge className="bg-yellow-500 text-black shadow-lg">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            {(oeuvre as any).note_moyenne.toFixed(1)}
                          </Badge>
                        </div>
                      )}

                      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button onClick={(e) => { e.stopPropagation(); setShowZoom(true); }} className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors" title={t('works.zoom', 'Agrandir')}>
                          <ZoomIn className="h-5 w-5 text-white" />
                        </button>
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                          <RotateCcw className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* COUVERTURE ARRIÈRE */}
                <div className="absolute inset-0 w-full h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: `rotateY(${direction === 'rtl' ? '-180deg' : '180deg'})` }}>
                  <div className="relative w-full h-full group">
                    <div className={cn("absolute top-0 bottom-0 w-6 bg-gradient-to-l z-10", "from-amber-200 via-amber-100 to-amber-50", "dark:from-amber-900 dark:via-amber-800 dark:to-amber-700")}
                      style={{
                        [direction === 'rtl' ? 'left' : 'right']: 0,
                        transform: `translateX(${direction === 'rtl' ? '-100%' : '100%'})`,
                        boxShadow: direction === 'rtl' ? 'inset 3px 0 8px rgba(0,0,0,0.15)' : 'inset -3px 0 8px rgba(0,0,0,0.15)',
                        borderRadius: direction === 'rtl' ? '4px 0 0 4px' : '0 4px 4px 0'
                      }}>
                      <div className="absolute inset-y-2 inset-x-1 flex flex-col justify-between opacity-30">
                        {[...Array(20)].map((_, i) => <div key={i} className="h-px bg-amber-600/50" />)}
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-black/20 rounded-lg transform -translate-x-4 translate-y-4 -z-10" style={{ filter: 'blur(8px)' }} />

                    <div className={cn("relative w-full h-full overflow-hidden shadow-2xl", medias[1] ? '' : "bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 dark:from-amber-900 dark:via-amber-950 dark:to-black", direction === 'rtl' ? 'rounded-r-lg border-l-4' : 'rounded-l-lg border-r-4', "border-amber-600/30")}>
                      {medias[1] ? (
                        <img src={medias[1].url} alt={t('oeuvre.backCover', 'Dos de couverture')} className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full">
                          <div className="absolute inset-0 opacity-5">
                            <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)` }} />
                          </div>
                          <div className="relative h-full flex flex-col p-6 text-amber-50">
                            <div className="flex items-center justify-between mb-4">
                              <BookMarked className="h-8 w-8 text-amber-400" />
                              <Badge variant="outline" className="border-amber-400/50 text-amber-200 bg-amber-950/50">{typeOeuvre}</Badge>
                            </div>
                            <h3 className="text-xl font-bold font-serif mb-3 text-amber-100">{titre}</h3>
                            <div className="flex-1 overflow-hidden">
                              <Quote className="h-5 w-5 text-amber-500/50 mb-2" />
                              <p className="text-sm leading-relaxed text-amber-100/90 line-clamp-[8]">{description || t('works.noDescription', 'Aucune description disponible pour cet ouvrage.')}</p>
                            </div>
                            <div className="my-4 flex items-center gap-2">
                              <div className="flex-1 h-px bg-amber-600/30" />
                              <Sparkles className="h-4 w-4 text-amber-500/50" />
                              <div className="flex-1 h-px bg-amber-600/30" />
                            </div>
                            <div className="space-y-2 text-sm">
                              {oeuvre.Livre?.isbn && (<div className="flex items-center justify-between text-amber-200/80"><span>ISBN</span><span className="font-mono text-xs">{oeuvre.Livre.isbn}</span></div>)}
                              {oeuvre.Livre?.nb_pages && (<div className="flex items-center justify-between text-amber-200/80"><span>{t('works.fields.pages', 'Pages')}</span><span>{formatNumber(oeuvre.Livre.nb_pages)}</span></div>)}
                              {oeuvre.Langue && (<div className="flex items-center gap-2 text-amber-200/80"><Globe className="h-4 w-4" /><span>{oeuvre.Langue.nom}</span></div>)}
                              {oeuvre.annee_creation && (<div className="flex items-center gap-2 text-amber-200/80"><Calendar className="h-4 w-4" /><span>{oeuvre.annee_creation}</span></div>)}
                            </div>
                            <div className="mt-4 text-center">
                              <span className="text-xs text-amber-400/60 flex items-center justify-center gap-1"><RotateCcw className="h-3 w-3" />{t('works.flipToFront', 'Cliquez pour voir la couverture')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {isFlipped ? t('works.viewCover', 'Voir la couverture') : t('works.viewSummary', 'Voir le résumé au dos')}
            </p>
          </div>

          {/* Actions sous le livre */}
          <div className="flex gap-2 mt-6 justify-center lg:justify-start">
            <Button size="lg" onClick={onToggleFavorite} disabled={favoriteLoading} variant={isFavorite ? "default" : "outline"} className={cn(isFavorite && "bg-red-500 hover:bg-red-600")}>
              <Heart className={cn("h-5 w-5 mr-2", isFavorite && "fill-current")} />
              {isFavorite ? t('works.inFavorites', 'Favori') : t('works.actions.addFavorite', 'Favoris')}
            </Button>
            {shareButton}
          </div>

          {/* INFORMATIONS DU LIVRE (DROITE) */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                <Badge className="bg-amber-600 text-white">
                  <BookOpen className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                  {t('works.types.book', 'Livre')}
                </Badge>
                {oeuvre.annee_creation && <Badge variant="outline">{oeuvre.annee_creation}</Badge>}
                {oeuvre.Livre?.Genre && <Badge variant="secondary">{oeuvre.Livre.Genre.nom}</Badge>}
                {(oeuvre as any).note_moyenne && (oeuvre as any).note_moyenne > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Star className="h-3 w-3 mr-1 fill-current" />{(oeuvre as any).note_moyenne.toFixed(1)}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold font-serif mb-4">{titre}</h1>

              {mainContributors.length > 0 && (
                <div className="space-y-2">
                  {mainContributors.map((contributeur: any, index: number) => (
                    <p key={contributeur.id_contributeur || contributeur.id || `contrib-${contributeur.nom}-${index}`} className="text-xl">
                      <span className="text-foreground font-medium">{gt(contributeur.prenom)} {gt(contributeur.nom)}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {oeuvre.prix !== undefined && (
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-primary">{oeuvre.prix === 0 ? t('works.pricing.free', 'Gratuit') : formatPrice(oeuvre.prix)}</span>
              </div>
            )}

            <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
              <Button size="lg" className="shadow-lg" onClick={() => setShowExcerpt(true)}>
                <Eye className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />{t('works.actions.readExcerpt', 'Lire un extrait')}
              </Button>
            </div>

            {/* Modal Extrait */}
            <Dialog open={showExcerpt} onOpenChange={setShowExcerpt}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />{t('works.excerpt.title', 'Extrait de')} "{titre}"
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  {oeuvre.description ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap">{description}</div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">{t('works.excerpt.noContent', "Aucun contenu disponible pour cet ouvrage.")}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal Zoom */}
            <Dialog open={showZoom} onOpenChange={setShowZoom}>
              <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                <button onClick={() => setShowZoom(false)} className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors">
                  <X className="h-6 w-6 text-white" />
                </button>
                <div className="flex items-center justify-center min-h-[60vh] p-4">
                  {mainImage ? (
                    <img src={mainImage} alt={titre} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/60"><BookOpen className="h-24 w-24 mb-4" /><p>{t('works.noCover', 'Aucune couverture disponible')}</p></div>
                  )}
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white/80 font-medium text-lg">{titre}</p>
                  {mainContributors.length > 0 && <p className="text-white/60 text-sm">{gt(mainContributors[0].prenom)} {gt(mainContributors[0].nom)}</p>}
                </div>
              </DialogContent>
            </Dialog>

            {/* Description */}
            {oeuvre.description && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{t('works.synopsis', 'Résumé')}</h3>
                  <p className="leading-relaxed text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            )}

            {/* Vues et Avis */}
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2"><Eye className="h-5 w-5" /><span className="font-medium">{formatNumber(viewCount)}</span><span className="text-sm">{t('works.stats.views', 'vues')}</span></div>
              <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /><span className="font-medium">{formatNumber(commentsCount)}</span><span className="text-sm">{t('works.stats.reviews', 'avis')}</span></div>
              {oeuvre.Livre?.nb_pages && (
                <div className="flex items-center gap-2"><BookOpen className="h-5 w-5" /><span className="font-medium">{formatNumber(oeuvre.Livre.nb_pages)}</span><span className="text-sm">{t('works.fields.pages', 'pages')}</span></div>
              )}
            </div>

            {/* Catégories et tags */}
            {((oeuvre.Categories && oeuvre.Categories.length > 0) || (oeuvre.Tags && oeuvre.Tags.length > 0)) && (
              <div className="flex flex-wrap gap-2">
                {oeuvre.Categories?.map((cat: any) => <Badge key={cat.id_categorie} variant="outline">{cat.nom || cat.nom_categorie}</Badge>)}
                {oeuvre.Tags?.map((tag: any) => <Badge key={tag.id_tag} variant="secondary" className="text-xs">#{tag.nom || tag.nom_tag}</Badge>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroLivre;
