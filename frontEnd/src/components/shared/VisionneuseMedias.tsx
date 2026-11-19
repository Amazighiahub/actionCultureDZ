/**
 * Vignette et visionneuse de médias (images, vidéos, sons, documents), communes aux galeries d'un événement et
 * d'une œuvre (lot 3 doublons, 2026-11-19 : deux copies presque identiques, l'une sans titres traduits, l'autre
 * sans touche Échap ni libellé de type traduit).
 * Clavier : flèches (inversées en arabe), Échap pour fermer ; glissement du doigt sur téléphone.
 */
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, Video, FileText, Music, ChevronLeft, ChevronRight, X, ZoomIn, Download, Play } from 'lucide-react';
import { LazyImage } from '@/components/shared/LazyImage';
import { useTranslateData } from '@/hooks/useTranslateData';
import type { Media } from '@/types/models/media.types';
import { getAssetUrl } from '@/helpers/assetUrl';

export const ICONES_MEDIA: Record<string, React.ElementType> = { image: ImageIcon, video: Video, audio: Music, document: FileText };
const LIBELLE_TYPE: Record<string, string> = { video: 'Vidéo', audio: 'Son', document: 'Document' };

/** Vignette d'un média dans une grille ; un clic ouvre la visionneuse */
export const VignetteMedia: React.FC<{ media: Media; onClick: () => void }> = ({ media, onClick }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const Icon = ICONES_MEDIA[media.type_media] || ImageIcon;
  const isVideo = media.type_media === 'video';
  const titre = td(media.titre);

  return (
    <div
      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-muted"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={titre || t(`media.types.${media.type_media}`, LIBELLE_TYPE[media.type_media] || 'Image')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {media.type_media === 'image' || isVideo ? (
        <LazyImage
          // Vidéo : le fichier vidéo n'est pas une image → vignette ou visuel vidéo par défaut
          src={isVideo
            ? (media.thumbnail_url || '/images/video-placeholder.svg')
            : (media.url || media.thumbnail_url || '/images/placeholder-media.svg')}
          alt={titre || td(media.description) || ''}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          fallback={isVideo ? '/images/video-placeholder.svg' : '/images/placeholder-media.svg'}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
        {/* Icône lecture toujours visible pour une vidéo (pas de survol sur téléphone) */}
        <div className={isVideo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}>
          <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
            {isVideo ? <Play className="h-8 w-8 text-white" aria-hidden="true" /> : <ZoomIn className="h-6 w-6 text-white" aria-hidden="true" />}
          </div>
        </div>
      </div>

      {LIBELLE_TYPE[media.type_media] && (
        <div className="absolute top-2 start-2">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            <Icon className="h-3 w-3 me-1" aria-hidden="true" />
            {t(`media.types.${media.type_media}`, LIBELLE_TYPE[media.type_media])}
          </Badge>
        </div>
      )}

      {titre && (
        <div className="absolute bottom-0 start-0 end-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm truncate">{titre}</p>
        </div>
      )}
    </div>
  );
};

/** Ce dont la visionneuse a besoin d'un média (une photo de service suffit : { type_media: 'image', url }) */
export type MediaVisionneuse = Pick<Media, 'type_media' | 'url'> & { titre?: Media['titre']; description?: Media['description'] };

interface VisionneuseProps {
  medias: MediaVisionneuse[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/** Visionneuse plein écran : un média à la fois, précédent / suivant, compteur */
export const VisionneuseMedias: React.FC<VisionneuseProps> = ({ medias, currentIndex, isOpen, onClose, onPrevious, onNext }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const toucher = useRef<number | null>(null);
  const media = medias[currentIndex];
  if (!media) return null;
  const plusieurs = medias.length > 1;
  const rtl = () => document.dir === 'rtl';

  const clavier = (e: React.KeyboardEvent) => {
    if (!plusieurs) return;
    if (e.key === 'ArrowLeft') { if (rtl()) onNext(); else onPrevious(); }
    if (e.key === 'ArrowRight') { if (rtl()) onPrevious(); else onNext(); }
  };
  // Glissement du doigt : vers la gauche = suivant (inversé en arabe)
  const finToucher = (x: number) => {
    if (toucher.current === null || !plusieurs) return;
    const d = x - toucher.current;
    toucher.current = null;
    if (Math.abs(d) < 50) return;
    if ((d < 0) !== rtl()) onNext(); else onPrevious();
  };

  const titre = td(media.titre);
  const description = td(media.description);
  const url = getAssetUrl(media.url);

  const contenu = () => {
    switch (media.type_media) {
      case 'video':
        return (
          <video src={url} controls preload="metadata" playsInline className="max-h-[80vh] max-w-full rounded-lg">
            {t('media.videoNotSupported', 'Votre navigateur ne supporte pas la lecture vidéo.')}
          </video>
        );
      case 'audio':
        return (
          <div className="bg-muted p-8 rounded-lg text-center">
            <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
            <p className="mb-4 font-medium">{titre || t('media.types.audio', 'Son')}</p>
            <audio src={url} controls preload="metadata" className="w-full max-w-md">
              {t('media.audioNotSupported', 'Votre navigateur ne supporte pas la lecture audio.')}
            </audio>
          </div>
        );
      case 'document':
        return (
          <div className="bg-muted p-8 rounded-lg text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
            <p className="mb-4 font-medium">{titre || t('media.types.document', 'Document')}</p>
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 me-2" aria-hidden="true" />
                {t('common.download', 'Télécharger')}
              </a>
            </Button>
          </div>
        );
      default:
        return <img src={getAssetUrl(media.url, { width: 1600 })} alt={titre || description || ''} className="max-h-[80vh] max-w-full object-contain rounded-lg" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(ouvert) => { if (!ouvert) onClose(); }}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0"
        onKeyDown={clavier}
        onTouchStart={(e) => { toucher.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => finToucher(e.changedTouches[0]?.clientX ?? 0)}
      >
        <DialogTitle className="sr-only">{titre || `${t('media.media', 'Média')} ${currentIndex + 1}`}</DialogTitle>

        <Button variant="ghost" size="icon" className="absolute top-4 end-4 z-50 text-white hover:bg-white/20" onClick={onClose} aria-label={t('common.close', 'Fermer')}>
          <X className="h-6 w-6" aria-hidden="true" />
        </Button>

        {plusieurs && (
          <>
            <Button variant="ghost" size="icon" className="absolute start-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20" onClick={onPrevious} aria-label={t('common.previous', 'Précédent')}>
              <ChevronLeft className="h-8 w-8 rtl:-scale-x-100" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute end-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20" onClick={onNext} aria-label={t('common.next', 'Suivant')}>
              <ChevronRight className="h-8 w-8 rtl:-scale-x-100" aria-hidden="true" />
            </Button>
          </>
        )}

        <div className="flex items-center justify-center min-h-[60vh] p-8">{contenu()}</div>

        <div className="absolute bottom-0 start-0 end-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div>
              {titre && <p className="font-medium">{titre}</p>}
              {description && <p className="text-sm text-white/70">{description}</p>}
            </div>
            <div className="text-sm text-white/70">{currentIndex + 1} / {medias.length}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
