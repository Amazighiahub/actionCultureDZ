/**
 * HeroFilm - Hero section spécifique au type Film
 * Effet flip 3D affiche avant/arrière (carte partagée : HeroCarteRetournable)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
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
  Film, Star, Heart, Eye, MessageCircle,
  Play, Clock, FileText, X
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';
import HeroCarteRetournable from './HeroCarteRetournable';

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
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();

  // État pour la modal de lecture vidéo/audio
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <div className="relative bg-gradient-to-br from-slate-900/50 via-background to-purple-950/30 dark:from-slate-950 dark:via-background dark:to-purple-950/20 min-h-[500px]">
      <div className="container max-w-7xl mx-auto px-4 py-8">

        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* AFFICHE DU FILM AVEC EFFET FLIP */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2">
            <HeroCarteRetournable
              theme="film"
              oeuvre={oeuvre}
              mainImage={mainImage}
              titre={titre}
              mainContributors={mainContributors}
              gt={gt}
              icone={Film}
              badgeRecto={(oeuvre.Film?.duree_minutes ?? 0) > 0 && (
                <Badge className="bg-purple-600 text-white border-0 shadow-lg">
                  <Clock className="h-3 w-3 me-1" />
                  {oeuvre.Film.duree_minutes} min
                </Badge>
              )}
              motifVerso={
                /* Motif pellicule en fond */
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute start-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
                    {[...Array(15)].map((_, i) => (
                      <div key={i} className="w-5 h-3 mx-auto rounded-sm bg-white/50" />
                    ))}
                  </div>
                  <div className="absolute end-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
                    {[...Array(15)].map((_, i) => (
                      <div key={i} className="w-5 h-3 mx-auto rounded-sm bg-white/50" />
                    ))}
                  </div>
                </div>
              }
              typeLibelle={gt(oeuvre.TypeOeuvre?.nom_type) || 'Film'}
              descriptionVerso={gt(oeuvre.description) || t('works.noSynopsisFilm', 'Aucun synopsis disponible pour ce film.')}
              lignesVerso={[
                ...(oeuvre.Film?.realisateur ? [{
                  cle: 'realisateur',
                  libelle: t('works.directedBy', 'Réalisateur'),
                  valeur: oeuvre.Film.realisateur,
                  classeValeur: 'font-medium',
                }] : []),
                ...(oeuvre.Film?.duree_minutes ? [{
                  cle: 'duree',
                  libelle: t('works.duration.label', 'Durée'),
                  valeur: `${oeuvre.Film.duree_minutes} min`,
                }] : []),
              ]}
              textes={{
                retourRecto: t('works.flipToFrontFilm', "Cliquez pour voir l'affiche"),
                voirRecto: t('works.viewPoster', "Voir l'affiche"),
                voirVerso: t('works.viewSynopsis', 'Voir le synopsis au dos'),
                sansImage: t('works.noPoster', 'Aucune affiche disponible'),
              }}
            />

            {/* Actions sous l'affiche */}
            <div className="flex flex-wrap gap-2 mt-6 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={onToggleFavorite}
                disabled={favoriteLoading}
                variant="favorite" data-active={isFavorite}
                aria-label={isFavorite ? t('works.removeFromFavorites', 'Retirer des favoris') : t('works.actions.addToFavorites', 'Ajouter aux favoris')}
              >
                <Heart className={cn("h-5 w-5 me-2", isFavorite && "fill-current")} aria-hidden="true" />
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
                {(oeuvre.Film?.duree_minutes ?? 0) > 0 && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 me-1" />
                    {oeuvre.Film.duree_minutes} min
                  </Badge>
                )}
                {Number((oeuvre as any).note_moyenne) > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Star className="h-3 w-3 me-1 fill-current" />
                    {(oeuvre as any).note_moyenne.toFixed(1)}
                  </Badge>
                )}
              </div>

              <h1 dir="auto" className="text-4xl lg:text-5xl font-bold mb-4">{titre}</h1>

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
            {oeuvre.prix != null && ( /* prix non renseigné (null) : rien à afficher */
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-primary">
                  {oeuvre.prix === 0 ? t('works.pricing.free', 'Gratuit') : formatPrice(oeuvre.prix)}
                </span>
              </div>
            )}

            {/* Actions principales */}
            <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
              <Button size="lg" className="shadow-lg" onClick={() => (playableMedia ? setShowPlayer(true) : handlePlay())}>
                <Play className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                {t('works.actions.watchTrailer', 'Voir la bande-annonce')}
              </Button>
              {noMediaMsg && (
                <span className="text-sm text-muted-foreground self-center animate-pulse">
                  {t('works.noTrailer', 'Aucune bande-annonce disponible pour le moment')}
                </span>
              )}
            </div>

            {/* Modal Player Vidéo (Film) */}
            <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
              <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                <button
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-4 end-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  aria-label={t('common.close', 'Fermer')}
                >
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
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
                      playsInline
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
                  <p dir="auto" className="leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Vues et Avis */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
              {/* Compteurs à zéro masqués (audit V11 UX-18) */}
              {viewCount > 0 && (
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">{formatNumber(viewCount)}</span>
                <span className="text-sm">{t('works.stats.views', 'vues')}</span>
              </div>
              )}
              {commentsCount > 0 && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">{formatNumber(commentsCount)}</span>
                <span className="text-sm">{t('works.stats.reviews', 'avis')}</span>
              </div>
              )}
              {(oeuvre.Film?.duree_minutes ?? 0) > 0 && (
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
