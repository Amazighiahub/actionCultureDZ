/**
 * HeroAlbum - Hero section spécifique au type Album Musical
 * Effet flip 3D pochette avant / vinyle au dos
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
  ChevronLeft, Music, FileText, Sparkles, Heart, Star,
  MessageCircle, Calendar, Clock, Headphones, RotateCcw,
  Quote, Globe, ZoomIn, X
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';

interface HeroAlbumProps {
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
  handlePlay: () => void;
  noMediaMsg: boolean;
}

const HeroAlbum: React.FC<HeroAlbumProps> = ({
  oeuvre, medias, mainImage, titre, description,
  mainContributors, gt, viewCount, commentsCount,
  isFavorite, favoriteLoading, onToggleFavorite, shareButton,
  playableMedia, handlePlay, noMediaMsg,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses, direction } = useRTL();

  const [isFlipped, setIsFlipped] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const videoMedia = medias.find(m => m.type_media === 'video');

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10 min-h-[500px]">
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
          {/* POCHETTE ALBUM AVEC EFFET FLIP (VIYLE AU DOS) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2">
            <div
              className="relative mx-auto w-[260px] sm:w-[300px] md:w-[340px] lg:w-[360px]"
              style={{ perspective: '1200px' }}
            >
              <div
                className={cn(
                  "relative w-full aspect-square cursor-pointer transition-all duration-700 ease-in-out",
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
                {/* FACE AVANT - POCHETTE */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="relative w-full h-full group">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg blur-2xl opacity-15 group-hover:opacity-25 transition-opacity duration-300 -z-10" />

                    {/* Ombre portée 3D */}
                    <div
                      className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6"
                      style={{ filter: 'blur(8px)' }}
                    />

                    {/* Pochette principale */}
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={titre}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-teal-900 flex flex-col items-center justify-center p-8">
                          <Music className="h-24 w-24 text-emerald-400/50 mb-4" />
                          <h3 className="text-xl font-bold text-center line-clamp-3 text-emerald-100">
                            {titre}
                          </h3>
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Note */}
                      {(oeuvre as any).note_moyenne && (oeuvre as any).note_moyenne > 0 && (
                        <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                          <Badge className="bg-yellow-500 text-black shadow-lg">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            {(oeuvre as any).note_moyenne.toFixed(1)}
                          </Badge>
                        </div>
                      )}

                      {/* Badge gratuit */}
                      {oeuvre.prix === 0 && (
                        <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                          <Badge className="bg-green-500 text-white border-0 shadow-lg">
                            {t('works.pricing.free', 'Gratuit')}
                          </Badge>
                        </div>
                      )}

                      {/* Infos en bas de pochette */}
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

                {/* FACE ARRIÈRE - VINYLE / INFOS ALBUM */}
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
                      "bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950",
                      "dark:from-emerald-950 dark:via-teal-950 dark:to-black",
                    )}>
                      {/* Vinyle en fond */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <div className="w-[80%] aspect-square rounded-full border-[20px] border-white/20 relative">
                          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                          <div className="absolute inset-[30%] rounded-full bg-white/10" />
                          <div className="absolute inset-[45%] rounded-full bg-white/20" />
                        </div>
                      </div>

                      <div className="relative h-full flex flex-col p-6 text-emerald-50">
                        <div className="flex items-center justify-between mb-4">
                          <Music className="h-8 w-8 text-emerald-400" />
                          <Badge variant="outline" className="border-emerald-400/50 text-emerald-200 bg-emerald-950/50">
                            {oeuvre.TypeOeuvre?.nom_type || 'Album'}
                          </Badge>
                        </div>

                        <h3 className="text-xl font-bold mb-3 text-emerald-100">
                          {titre}
                        </h3>

                        {/* Description */}
                        <div className="flex-1 overflow-hidden">
                          <Quote className="h-5 w-5 text-emerald-500/50 mb-2" />
                          <p className="text-sm leading-relaxed text-emerald-100/90 line-clamp-[8]">
                            {gt(oeuvre.description) || t('works.noDescription', 'Aucune description disponible pour cet album.')}
                          </p>
                        </div>

                        {/* Séparateur */}
                        <div className="my-4 flex items-center gap-2">
                          <div className="flex-1 h-px bg-emerald-600/30" />
                          <Sparkles className="h-4 w-4 text-emerald-500/50" />
                          <div className="flex-1 h-px bg-emerald-600/30" />
                        </div>

                        {/* Métadonnées */}
                        <div className="space-y-2 text-sm">
                          {oeuvre.AlbumMusical?.label && (
                            <div className="flex items-center justify-between text-emerald-200/80">
                              <span>Label</span>
                              <span className="font-medium">{oeuvre.AlbumMusical.label}</span>
                            </div>
                          )}
                          {oeuvre.AlbumMusical?.duree && (
                            <div className="flex items-center justify-between text-emerald-200/80">
                              <span>{t('works.duration.label', 'Durée')}</span>
                              <span>{oeuvre.AlbumMusical.duree} min</span>
                            </div>
                          )}
                          {oeuvre.Langue && (
                            <div className="flex items-center gap-2 text-emerald-200/80">
                              <Globe className="h-4 w-4" />
                              <span>{gt(oeuvre.Langue.nom)}</span>
                            </div>
                          )}
                          {oeuvre.annee_creation && (
                            <div className="flex items-center gap-2 text-emerald-200/80">
                              <Calendar className="h-4 w-4" />
                              <span>{oeuvre.annee_creation}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 text-center">
                          <span className="text-xs text-emerald-400/60 flex items-center justify-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {t('works.flipToFront', 'Cliquez pour voir la pochette')}
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
                  ? t('works.viewCover', 'Voir la pochette')
                  : t('works.viewDetails', 'Voir les détails au dos')
                }
              </p>
            </div>

            {/* Actions sous la pochette */}
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
          {/* INFORMATIONS DE L'ALBUM (DROITE) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                <Badge className="bg-emerald-600 text-white">
                  <Music className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                  {t('works.types.album', 'Album')}
                </Badge>
                {oeuvre.annee_creation && (
                  <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                )}
                {oeuvre.AlbumMusical?.Genre && (
                  <Badge variant="secondary">{gt(oeuvre.AlbumMusical.Genre.nom)}</Badge>
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
                      {contributeur.role || t('works.artist', 'Artiste')} : <span className="text-foreground font-medium">
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
                <Headphones className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                {t('works.actions.listenNow', 'Écouter')}
              </Button>
              {noMediaMsg && (
                <span className="text-sm text-muted-foreground self-center animate-pulse">
                  {t('works.noAudio', 'Aucun extrait audio disponible pour le moment')}
                </span>
              )}
            </div>

            {/* Modal Zoom Pochette */}
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
                      <Music className="h-24 w-24 mb-4" />
                      <p>{t('works.noCover', 'Aucune pochette disponible')}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal Player Audio (Album) */}
            <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
              <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                <button
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
                <div className="p-6">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Headphones className="h-5 w-5" />
                      {titre}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-48 rounded-lg overflow-hidden mb-6 shadow-xl">
                      {mainImage ? (
                        <img src={mainImage} alt={titre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-teal-900 flex items-center justify-center">
                          <Music className="h-16 w-16 text-emerald-400/50" />
                        </div>
                      )}
                    </div>
                    {playableMedia && videoMedia ? (
                      <video src={playableMedia.url} controls autoPlay className="w-full rounded-lg" style={{ maxHeight: '50vh' }} />
                    ) : playableMedia ? (
                      <audio src={playableMedia.url} controls autoPlay className="w-full max-w-md" />
                    ) : null}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Description */}
            {oeuvre.description && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('works.description', 'Description')}
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
                <Headphones className="h-5 w-5" />
                <span className="font-medium">{formatNumber(viewCount)}</span>
                <span className="text-sm">{t('works.stats.listens', 'écoutes')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">{formatNumber(commentsCount)}</span>
                <span className="text-sm">{t('works.stats.reviews', 'avis')}</span>
              </div>
              {oeuvre.AlbumMusical?.duree && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{oeuvre.AlbumMusical.duree}</span>
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

export default HeroAlbum;
