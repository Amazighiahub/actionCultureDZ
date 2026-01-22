/**
 * EventGallery - Galerie de médias de l'événement
 * Affiche les images, vidéos et autres médias avec lightbox
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/UI/dialog';
import {
  Image as ImageIcon, Video, FileText, Music,
  ChevronLeft, ChevronRight, X, ZoomIn, Download,
  Play, Maximize2, Grid, List
} from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useTranslateData } from '@/hooks/useTranslateData';
import { cn } from '@/lib/utils';
import type { Media } from '@/types/models/media.types';
import { getAssetUrl } from '@/helpers/assetUrl';

interface EventGalleryProps {
  medias: Media[];
}

// Icônes par type de média
const mediaIcons: Record<string, React.ElementType> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText
};

// Composant pour un élément de la galerie
interface GalleryItemProps {
  media: Media;
  onClick: () => void;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ media, onClick }) => {
  const { td } = useTranslateData();
  const Icon = mediaIcons[media.type_media] || ImageIcon;
  const isVideo = media.type_media === 'video';
  const isAudio = media.type_media === 'audio';
  const isDocument = media.type_media === 'document';

  return (
    <div 
      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-muted"
      onClick={onClick}
    >
      {/* Image ou placeholder */}
      {media.type_media === 'image' || isVideo ? (
        <LazyImage
          src={media.url || media.thumbnail_url || '/images/placeholder-media.png'}
          alt={td(media.titre) || td(media.description) || 'Media'}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          fallback="/images/placeholder-media.png"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Overlay au survol */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {isVideo ? (
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="h-8 w-8 text-white" />
            </div>
          ) : (
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <ZoomIn className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Badge type */}
      {(isVideo || isAudio || isDocument) && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            <Icon className="h-3 w-3 mr-1" />
            {media.type_media}
          </Badge>
        </div>
      )}

      {/* Titre si présent */}
      {td(media.titre) && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm truncate">{td(media.titre)}</p>
        </div>
      )}
    </div>
  );
};

// Lightbox pour visualiser les médias
interface LightboxProps {
  medias: Media[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({
  medias,
  currentIndex,
  isOpen,
  onClose,
  onPrevious,
  onNext
}) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const currentMedia = medias[currentIndex];

  if (!currentMedia) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') onPrevious();
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'Escape') onClose();
  };

  const renderMedia = () => {
    switch (currentMedia.type_media) {
      case 'video':
        return (
          <video
            src={getAssetUrl(currentMedia.url)}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-lg"
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        );

      case 'audio':
        return (
          <div className="bg-muted p-8 rounded-lg text-center">
            <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-4 font-medium">{td(currentMedia.titre) || 'Audio'}</p>
            <audio src={getAssetUrl(currentMedia.url)} controls className="w-full max-w-md">
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </div>
        );

      case 'document':
        return (
          <div className="bg-muted p-8 rounded-lg text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-4 font-medium">{td(currentMedia.titre) || 'Document'}</p>
            <Button asChild>
              <a href={getAssetUrl(currentMedia.url)} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                {t('common.download', 'Télécharger')}
              </a>
            </Button>
          </div>
        );

      default:
        return (
          <img
            src={getAssetUrl(currentMedia.url)}
            alt={td(currentMedia.titre) || td(currentMedia.description) || 'Image'}
            className="max-h-[80vh] max-w-full object-contain rounded-lg"
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">
          {td(currentMedia.titre) || `Media ${currentIndex + 1}`}
        </DialogTitle>
        
        {/* Bouton fermer */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation précédent */}
        {medias.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
            onClick={onPrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Contenu */}
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          {renderMedia()}
        </div>

        {/* Navigation suivant */}
        {medias.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
            onClick={onNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Infos et compteur */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div>
              {td(currentMedia.titre) && (
                <p className="font-medium">{td(currentMedia.titre)}</p>
              )}
              {td(currentMedia.description) && (
                <p className="text-sm text-white/70">{td(currentMedia.description)}</p>
              )}
            </div>
            <div className="text-sm text-white/70">
              {currentIndex + 1} / {medias.length}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Composant principal
const EventGallery: React.FC<EventGalleryProps> = ({ medias }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  // Filtrer les médias
  const filteredMedias = filter === 'all' 
    ? medias 
    : medias.filter(m => m.type_media === filter);

  // Types de médias disponibles
  const mediaTypes = [...new Set(medias.map(m => m.type_media))];

  // Handlers lightbox
  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? filteredMedias.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === filteredMedias.length - 1 ? 0 : prev + 1));
  };

  if (!medias || medias.length === 0) {
    return (
      <EmptyState
        type="documents"
        title={t('gallery.empty', 'Aucun média disponible')}
        description={t('gallery.emptyDesc', 'La galerie de cet événement est vide pour le moment')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres et vue */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filtres par type */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {t('gallery.all', 'Tous')} ({medias.length})
          </Button>
          {mediaTypes.map((type) => {
            const Icon = mediaIcons[type] || ImageIcon;
            const count = medias.filter(m => m.type_media === type).length;
            return (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(type)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {t(`gallery.types.${type}`, type)} ({count})
              </Button>
            );
          })}
        </div>

        {/* Mode de vue */}
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Galerie */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedias.map((media, index) => (
            <GalleryItem
              key={media.id_media || index}
              media={media}
              onClick={() => openLightbox(index)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedias.map((media, index) => {
            const Icon = mediaIcons[media.type_media] || ImageIcon;
            return (
              <div
                key={media.id_media || index}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => openLightbox(index)}
              >
                <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                  {media.type_media === 'image' || media.type_media === 'video' ? (
                    <LazyImage
                      src={media.url || media.thumbnail_url}
                      alt={td(media.titre) || 'Media'}
                      className="w-full h-full object-cover"
                      fallback="/images/placeholder-media.png"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {td(media.titre) || `${media.type_media} ${index + 1}`}
                  </p>
                  {td(media.description) && (
                    <p className="text-sm text-muted-foreground truncate">
                      {td(media.description)}
                    </p>
                  )}
                </div>
                <Badge variant="outline">
                  <Icon className="h-3 w-3 mr-1" />
                  {media.type_media}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        medias={filteredMedias}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onPrevious={goToPrevious}
        onNext={goToNext}
      />
    </div>
  );
};

export default EventGallery;
