/**
 * HeroAlbum - Hero section spécifique au type Album Musical
 * Effet flip 3D pochette avant / vinyle au dos (carte partagée : HeroCarteRetournable)
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
  Music, FileText, Heart, Star,
  MessageCircle, Clock, Headphones, X
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';
import HeroCarteRetournable from './HeroCarteRetournable';

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
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();

  const [showPlayer, setShowPlayer] = useState(false);


  return (
    <div className="relative bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10 min-h-[500px]">
      <div className="container max-w-7xl mx-auto px-4 py-8">

        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* POCHETTE ALBUM AVEC EFFET FLIP (VIYLE AU DOS) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2">
            <HeroCarteRetournable
              theme="album"
              oeuvre={oeuvre}
              mainImage={mainImage}
              titre={titre}
              mainContributors={mainContributors}
              gt={gt}
              icone={Music}
              badgeRecto={oeuvre.prix === 0 && (
                <Badge className="bg-green-500 text-white border-0 shadow-lg">
                  {t('works.pricing.free', 'Gratuit')}
                </Badge>
              )}
              motifVerso={
                /* Vinyle en fond */
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <div className="w-[80%] aspect-square rounded-full border-[20px] border-white/20 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                    <div className="absolute inset-[30%] rounded-full bg-white/10" />
                    <div className="absolute inset-[45%] rounded-full bg-white/20" />
                  </div>
                </div>
              }
              typeLibelle={oeuvre.TypeOeuvre?.nom_type || 'Album'}
              descriptionVerso={gt(oeuvre.description) || t('works.noDescription', 'Aucune description disponible pour cet album.')}
              lignesVerso={[
                ...(oeuvre.AlbumMusical?.label ? [{
                  cle: 'label',
                  libelle: t('oeuvre.label', 'Label'),
                  valeur: oeuvre.AlbumMusical.label === 'Indépendant' ? t('musique.independant', 'Indépendant') : oeuvre.AlbumMusical.label,
                  classeValeur: 'font-medium',
                }] : []),
                ...(oeuvre.AlbumMusical?.duree ? [{
                  cle: 'duree',
                  libelle: t('works.duration.label', 'Durée'),
                  valeur: t('musique.minutes', '{{count}} min', { count: Number(oeuvre.AlbumMusical.duree) }),
                }] : []),
              ]}
              textes={{
                retourRecto: t('works.flipToFront', 'Cliquez pour voir la pochette'),
                voirRecto: t('works.viewCover', 'Voir la pochette'),
                voirVerso: t('works.viewDetails', 'Voir les détails au dos'),
                sansImage: t('works.noCover', 'Aucune pochette disponible'),
              }}
            />

            {/* Actions sous la pochette */}
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
                      {contributeur.role || t('works.artist', 'Artiste')} : <span className="text-foreground font-medium">
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
                <Headphones className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                {t('works.actions.listenNow', 'Écouter')}
              </Button>
              {noMediaMsg && (
                <span className="text-sm text-muted-foreground self-center animate-pulse">
                  {t('works.noAudio', 'Aucun extrait audio disponible pour le moment')}
                </span>
              )}
            </div>

            {/* Modal Player Audio (Album) */}
            <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
              <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                <button
                  onClick={() => setShowPlayer(false)}
                  className="absolute top-4 end-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  aria-label={t('common.close', 'Fermer')}
                >
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
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
                    {playableMedia?.type_media === 'video' ? (
                      <video src={playableMedia.url} controls autoPlay playsInline className="w-full rounded-lg" style={{ maxHeight: '50vh' }} />
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
                <Headphones className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">{formatNumber(viewCount)}</span>
                <span className="text-sm">{t('works.stats.listens', 'écoutes')}</span>
              </div>
              )}
              {commentsCount > 0 && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">{formatNumber(commentsCount)}</span>
                <span className="text-sm">{t('works.stats.reviews', 'avis')}</span>
              </div>
              )}
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
