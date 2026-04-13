/**
 * HeroFilm - Hero section spécifique au type Film
 * Effet flip 3D affiche avant/arrière
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, Film, Star, Heart, Eye, MessageCircle,
  Play, Clock, Globe, Calendar, FileText, ZoomIn,
  RotateCcw, Quote, Sparkles, X
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';

interface HeroFilmProps {
  oeuvre: Oeuvre;
  medias: MediaExtended[];
  mainImage: string | null;
  titre: string;
  description: string;
  mainContributors: any[];
  gt: (field: unknown) => string;
  viewCount: number;
  commentsCount: number;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onToggleFavorite: () => void;
  shareButton: React.ReactNode;
  playableMedia: MediaExtended | undefined;
  videoMedia: MediaExtended | undefined;
  handlePlay: () => void;
  noMediaMsg: boolean;
}

const HeroFilm: React.FC<HeroFilmProps> = ({
  oeuvre,
  medias,
  mainImage,
  titre,
  description,
  mainContributors,
  gt,
  viewCount,
  commentsCount,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
  shareButton,
  playableMedia,
  videoMedia,
  handlePlay,
  noMediaMsg,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses, direction } = useRTL();

  // État pour l'effet flip de l'affiche
  const [isFlipped, setIsFlipped] = useState(false);
  // État pour le zoom de l'affiche
  const [showZoom, setShowZoom] = useState(false);
  // État pour la modal de lecture vidéo/audio
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <div className="relative bg-gradient-to-br from-slate-900/50 via-background to-purple-950/30 dark:from-slate-950 dark:via-background dark:to-purple-950/20 min-h-[500px]">
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

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* AFFICHE DU FILM AVEC EFFET FLIP */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2">
            <div
              className="relative mx-auto w-[180px] sm:w-[200px] md:w-[240px] lg:w-[260px]"
              style={{ perspective: '900px' }}
            >
              <div
                className={cn(
                  "relative w-full aspect-[2/3] cursor-pointer transition-all duration-700 ease-in-out",
                )}
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
                {/* FACE AVANT - AFFICHE */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="relative w-full h-full group">
                    {/* Ombre portée 3D */}
                    <div
                      className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6"
                      style={{ filter: 'blur(8px)' }}
                    />

                    {/* Affiche principale */}
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border-2 border-purple-500/20">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={titre}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
                          <Film className="h-24 w-24 text-purple-400/50 mb-4" />
                          <h3 className="text-xl font-bold text-center line-clamp-3 text-purple-100">
                            {titre}
                          </h3>
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                      {/* Note */}
                      {(oeuvre as any).note_moyenne && (oeuvre as any).note_moyenne > 0 && (
                        <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                          <Badge className="bg-yellow-500 text-black shadow-lg">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            {(oeuvre as any).note_moyenne.toFixed(1)}
                          </Badge>
                        </div>
                      )}

                      {/* Durée */}
                      {oeuvre.Film?.duree_minutes && (
                        <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                          <Badge className="bg-purple-600 text-white border-0 shadow-lg">
                            <Clock className="h-3 w-3 mr-1" />
                            {oeuvre.Film.duree_minutes} min
                          </Badge>
                        </div>
                      )}

                      {/* Infos en bas d'affiche */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h2 className="text-2xl font-bold mb-1 line-clamp-2 drop-shadow-lg">
                          {titre}
                        </h2>
                        {mainContributors.length > 0 && (
                          <p className="text-white/90 font-medium drop-shadow">
                            {gt(mainContributors[0].prenom)} {gt(mainContributors[0].nom)}
                          </p>
                        )}
                      </div>

                      {/* Boutons hover */}
                      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowZoom(true);
                          }}
                          className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
                          title={t('works.zoom', 'Agrandir')}
                        >
                          <ZoomIn className="h-5 w-5 text-white" />
                        </button>
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                          <RotateCcw className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      {/* Effet brillance */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* FACE ARRIÈRE - INFOS FILM */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: `rotateY(${direction === 'rtl' ? '-180deg' : '180deg'})`
                  }}
                >
                  <div className="relative w-full h-full group">
                    <div
                      className="absolute inset-0 bg-black/20 rounded-lg transform -translate-x-4 translate-y-4 -z-10"
                      style={{ filter: 'blur(8px)' }}
                    />

                    <div className={cn(
                      "relative w-full h-full overflow-hidden shadow-2xl rounded-lg",
                      "bg-gradient-to-br from-purple-900 via-slate-900 to-purple-950",
                      "dark:from-purple-950 dark:via-slate-950 dark:to-black",
                    )}>
                      {/* Motif pellicule en fond */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
                          {[...Array(15)].map((_, i) => (
                            <div key={i} className="w-5 h-3 mx-auto rounded-sm bg-white/50" />
                          ))}
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
                          {[...Array(15)].map((_, i) => (
                            <div key={i} className="w-5 h-3 mx-auto rounded-sm bg-white/50" />
                          ))}
                        </div>
                      </div>

                      <div className="relative h-full flex flex-col p-6 text-purple-50">
                        <div className="flex items-center justify-between mb-4">
                          <Film className="h-8 w-8 text-purple-400" />
                          <Badge variant="outline" className="border-purple-400/50 text-purple-200 bg-purple-950/50">
                            {gt(oeuvre.TypeOeuvre?.nom_type) || 'Film'}
                          </Badge>
                        </div>

                        <h3 className="text-xl font-bold mb-3 text-purple-100">
                          {titre}
                        </h3>

                        {/* Synopsis */}
                        <div className="flex-1 overflow-hidden">
                          <Quote className="h-5 w-5 text-purple-500/50 mb-2" />
                          <p className="text-sm leading-relaxed text-purple-100/90 line-clamp-[8]">
                            {gt(oeuvre.description) || t('works.noDescription', 'Aucun synopsis disponible pour ce film.')}
                          </p>
                        </div>

                        {/* Séparateur */}
                        <div className="my-4 flex items-center gap-2">
                          <div className="flex-1 h-px bg-purple-600/30" />
                          <Sparkles className="h-4 w-4 text-purple-500/50" />
                          <div className="flex-1 h-px bg-purple-600/30" />
                        </div>

                        {/* Métadonnées */}
                        <div className="space-y-2 text-sm">
                          {oeuvre.Film?.realisateur && (
                            <div className="flex items-center justify-between text-purple-200/80">
                              <span>{t('works.directedBy', 'Réalisateur')}</span>
                              <span className="font-medium">{oeuvre.Film.realisateur}</span>
                            </div>
                          )}
                          {oeuvre.Film?.duree_minutes && (
                            <div className="flex items-center justify-between text-purple-200/80">
                              <span>{t('works.duration.label', 'Durée')}</span>
                              <span>{oeuvre.Film.duree_minutes} min</span>
                            </div>
                          )}
                          {oeuvre.Langue && (
                            <div className="flex items-center gap-2 text-purple-200/80">
                              <Globe className="h-4 w-4" />
                              <span>{gt(oeuvre.Langue.nom)}</span>
                            </div>
                          )}
                          {oeuvre.annee_creation && (
                            <div className="flex items-center gap-2 text-purple-200/80">
                              <Calendar className="h-4 w-4" />
                              <span>{oeuvre.annee_creation}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 text-center">
                          <span className="text-xs text-purple-400/60 flex items-center justify-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {t('works.flipToFront', 'Cliquez pour voir l\'affiche')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
                <RotateCcw className="h-4 w-4" />
                {isFlipped
                  ? t('works.viewPoster', 'Voir l\'affiche')
                  : t('works.viewSynopsis', 'Voir le synopsis au dos')
                }
              </p>
            </div>

            {/* Actions sous l'affiche */}
            <div className="flex gap-2 mt-6 justify-center lg:justify-start">
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
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* INFORMATIONS DU FILM (DROITE) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                <Badge className="bg-purple-600 text-white">
                  <Film className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                  {t('works.types.film', 'Film')}
                </Badge>
                {oeuvre.annee_creation && (
                  <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                )}
                {oeuvre.Film?.Genre && (
                  <Badge variant="secondary">{gt(oeuvre.Film.Genre.nom)}</Badge>
                )}
                {oeuvre.Film?.duree_minutes && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {oeuvre.Film.duree_minutes} min
                  </Badge>
                )}
                {(oeuvre as any).note_moyenne && (oeuvre as any).note_moyenne > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {(oeuvre as any).note_moyenne.toFixed(1)}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold mb-4">{titre}</h1>

              {mainContributors.length > 0 && (
                <div className="space-y-2">
                  {mainContributors.map((contributeur, index) => (
                    <p key={contributeur.id_contributeur || contributeur.id || `contrib-${index}`} className="text-xl text-muted-foreground">
                      {contributeur.role || t('works.directedBy', 'Réalisateur')} : <span className="text-foreground font-medium">
                        {gt(contributeur.prenom)} {gt(contributeur.nom)}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Prix */}
            {oeuvre.prix !== undefined && (
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-primary">
                  {oeuvre.prix === 0 ? t('works.pricing.free', 'Gratuit') : formatPrice(oeuvre.prix)}
                </span>
              </div>
            )}

            {/* Actions principales */}
            <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
              <Button size="lg" className="shadow-lg" onClick={handlePlay}>
                <Play className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                {t('works.actions.watchTrailer', 'Voir la bande-annonce')}
              </Button>
              {noMediaMsg && (
                <span className="text-sm text-muted-foreground self-center animate-pulse">
                  {t('works.noTrailer', 'Aucune bande-annonce disponible pour le moment')}
                </span>
              )}
            </div>

            {/* Modal Zoom Affiche */}
            <Dialog open={showZoom} onOpenChange={setShowZoom}>
              <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                <button
                  onClick={() => setShowZoom(false)}
                  className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
                <div className="flex items-center justify-center min-h-[60vh] p-4">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={titre}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/60">
                      <Film className="h-24 w-24 mb-4" />
                      <p>{t('works.noPoster', 'Aucune affiche disponible')}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal Player Vidéo (Film) */}
            <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
              <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                <button
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
                <div className="p-4">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Film className="h-5 w-5" />
                      {titre}
                    </DialogTitle>
                  </DialogHeader>
                  {playableMedia && videoMedia ? (
                    <video
                      src={playableMedia.url}
                      controls
                      autoPlay
                      className="w-full rounded-lg"
                      style={{ maxHeight: '70vh' }}
                    />
                  ) : playableMedia ? (
                    <audio src={playableMedia.url} controls autoPlay className="w-full" />
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>

            {/* Description */}
            {oeuvre.description && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('works.synopsis', 'Synopsis')}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Vues et Avis */}
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <span className="font-medium">{formatNumber(viewCount)}</span>
                <span className="text-sm">{t('works.stats.views', 'vues')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">{formatNumber(commentsCount)}</span>
                <span className="text-sm">{t('works.stats.reviews', 'avis')}</span>
              </div>
              {oeuvre.Film?.duree_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{oeuvre.Film.duree_minutes}</span>
                  <span className="text-sm">min</span>
                </div>
              )}
            </div>

            {/* Catégories et tags */}
            {((oeuvre.Categories && oeuvre.Categories.length > 0) || (oeuvre.Tags && oeuvre.Tags.length > 0)) && (
              <div className="flex flex-wrap gap-2">
                {oeuvre.Categories?.map((cat: any) => (
                  <Badge key={cat.id_categorie} variant="outline">
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
    </div>
  );
};

export default HeroFilm;
