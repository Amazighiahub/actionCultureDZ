/**
 * OeuvreGallery - Galerie de médias de l'œuvre
 * Réutilise la logique de EventGallery adapté aux œuvres
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Grid, List } from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import type { Media } from '@/types/models/media.types';
import { getAssetUrl } from '@/helpers/assetUrl';
import { VignetteMedia, VisionneuseMedias, ICONES_MEDIA } from '@/components/shared/VisionneuseMedias';
interface OeuvreGalleryProps {
  medias: Media[];
}

// Vignette et visionneuse communes (components/shared/VisionneuseMedias.tsx) ; avant : une copie ici

// Composant principal
const OeuvreGallery: React.FC<OeuvreGalleryProps> = ({ medias }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  const filteredMedias = filter === 'all' ? medias : medias.filter(m => m.type_media === filter);
  const mediaTypes = [...new Set(medias.map(m => m.type_media))];

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  if (!medias || medias.length === 0) {
    return (
      <EmptyState
        type="documents"
        title={t('gallery.empty', 'Aucun média disponible')}
        description={t('gallery.emptyDescOeuvre', 'La galerie est vide pour le moment')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres seulement s'il y a au moins deux types de médias, bascule grille/liste seulement à partir
          de deux médias : sinon ces boutons ne servent à rien (audit V11 UX-18). Libellés traduits. */}
      {(mediaTypes.length >= 2 || medias.length >= 2) && (
      <div className="flex flex-wrap items-center justify-between gap-4">
        {mediaTypes.length >= 2 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            {t('gallery.all', 'Tous')} ({medias.length})
          </Button>
          {mediaTypes.map((type) => {
            const Icon = ICONES_MEDIA[type] || ImageIcon;
            const count = medias.filter(m => m.type_media === type).length;
            return (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(type)}
                aria-pressed={filter === type}
              >
                <Icon className="h-4 w-4 me-1" aria-hidden="true" />
                {t(`gallery.types.${type}`, { defaultValue: type })} ({count})
              </Button>
            );
          })}
        </div>
        ) : <span />}

        {medias.length >= 2 && (
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label={t('gallery.gridView', 'Vue en grille')}
            aria-pressed={viewMode === 'grid'}
          >
            <Grid className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label={t('gallery.listView', 'Vue en liste')}
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        )}
      </div>
      )}

      {/* Galerie */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedias.map((media, index) => (
            <VignetteMedia key={media.id_media || index} media={media} onClick={() => openLightbox(index)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedias.map((media, index) => {
            const Icon = ICONES_MEDIA[media.type_media] || ImageIcon;
            return (
              <div
                key={media.id_media || index}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(index); } }}
              >
                <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                  {media.type_media === 'image' ? (
                    <LazyImage src={getAssetUrl(media.url)} alt={media.titre || 'Media'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{media.titre || t('gallery.mediaNumero', 'Média {{n}}', { n: index + 1 })}</p>
                  {media.description && <p className="text-sm text-muted-foreground truncate">{media.description}</p>}
                </div>
                {/* Type traduit (avant : valeur brute « image », « video ») */}
                <Badge variant="outline">
                  <Icon className="h-3 w-3 me-1" aria-hidden="true" />
                  {t(`gallery.types.${media.type_media}`, { defaultValue: media.type_media })}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      <VisionneuseMedias
        medias={filteredMedias}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => setCurrentIndex((prev) => (prev === 0 ? filteredMedias.length - 1 : prev - 1))}
        onNext={() => setCurrentIndex((prev) => (prev === filteredMedias.length - 1 ? 0 : prev + 1))}
      />
    </div>
  );
};

export default OeuvreGallery;
