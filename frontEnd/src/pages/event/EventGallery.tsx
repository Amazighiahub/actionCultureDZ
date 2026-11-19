/**
 * EventGallery - Galerie de médias de l'événement
 * Affiche les images, vidéos et autres médias avec lightbox
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Grid, List } from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useTranslateData } from '@/hooks/useTranslateData';
import type { Media } from '@/types/models/media.types';
import type { Programme } from '@/types/models/programme.types';
import { useFormatDate } from '@/hooks/useFormatDate';
import { jourProgramme } from '@/utils/programmeHoraire';
import { VignetteMedia, VisionneuseMedias, ICONES_MEDIA } from '@/components/shared/VisionneuseMedias';
interface EventGalleryProps {
  medias: Media[];
  /** Programme de l'événement : les photos rangées dans un jour s'affichent sous ce jour */
  programs?: Programme[];
}

// Vignette et visionneuse communes (components/shared/VisionneuseMedias.tsx) ; avant : une copie ici

// Composant principal
const EventGallery: React.FC<EventGalleryProps> = ({ medias, programs = [] }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { formatDate } = useFormatDate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  // Filtrer les médias
  const filteredMedias = filter === 'all' 
    ? medias 
    : medias.filter(m => m.type_media === filter);

  // Galerie rangée par jour du programme (exposition sur plusieurs jours) : chaque jour avec sa date,
  // son titre et sa description, puis les photos sans jour. Sans photo rangée : la galerie d'avant.
  const jours = programs
    .filter((p) => filteredMedias.some((m) => m.id_programme === p.id_programme))
    .sort((a, b) => jourProgramme(a).localeCompare(jourProgramme(b)) || (a.ordre || 0) - (b.ordre || 0));
  const idsJours = new Set(jours.map((p) => p.id_programme));
  const sections = jours.length > 0
    ? [
        ...jours.map((p) => ({ cle: `j${p.id_programme}`, programme: p as Programme | null, medias: filteredMedias.filter((m) => m.id_programme === p.id_programme) })),
        { cle: 'autres', programme: null as Programme | null, medias: filteredMedias.filter((m) => !m.id_programme || !idsJours.has(m.id_programme)) }
      ].filter((s) => s.medias.length > 0)
    : null;
  // Ordre de la visionneuse = ordre affiché
  const ordonnes = sections ? sections.flatMap((s) => s.medias) : filteredMedias;
  const titreJour = (p: Programme) => [
    jourProgramme(p) ? formatDate(new Date(jourProgramme(p)), { weekday: 'long', day: 'numeric', month: 'long' }) : '',
    td(p.titre)
  ].filter(Boolean).join(' · ');

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
    setCurrentIndex((prev) => (prev === 0 ? ordonnes.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === ordonnes.length - 1 ? 0 : prev + 1));
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
            const Icon = ICONES_MEDIA[type] || ImageIcon;
            const count = medias.filter(m => m.type_media === type).length;
            return (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(type)}
              >
                <Icon className="h-4 w-4 me-1" />
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
      </div>

      {/* Galerie */}
      {viewMode === 'grid' && sections ? (
        <div className="space-y-8">
          {sections.map((s) => {
            const debut = ordonnes.indexOf(s.medias[0]);
            return (
              <section key={s.cle} aria-label={s.programme ? titreJour(s.programme) : t('gallery.autresPhotos', 'Autres photos')}>
                <h3 className="text-lg font-semibold first-letter:uppercase" dir="auto">
                  {s.programme ? titreJour(s.programme) : t('gallery.autresPhotos', 'Autres photos')}
                </h3>
                {s.programme && td(s.programme.description) && (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground" dir="auto">{td(s.programme.description)}</p>
                )}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {s.medias.map((media, i) => (
                    <VignetteMedia key={media.id_media || i} media={media} onClick={() => openLightbox(debut + i)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedias.map((media, index) => (
            <VignetteMedia
              key={media.id_media || index}
              media={media}
              onClick={() => openLightbox(index)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {ordonnes.map((media, index) => {
            const Icon = ICONES_MEDIA[media.type_media] || ImageIcon;
            return (
              <div
                key={media.id_media || index}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(index); } }}
              >
                <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                  {media.type_media === 'image' || media.type_media === 'video' ? (
                    <LazyImage
                      src={media.type_media === 'video'
                        ? (media.thumbnail_url || '/images/video-placeholder.svg')
                        : (media.url || media.thumbnail_url || '/images/placeholder-media.svg')}
                      alt={td(media.titre) || 'Media'}
                      className="w-full h-full object-cover"
                      fallback={media.type_media === 'video' ? '/images/video-placeholder.svg' : '/images/placeholder-media.svg'}
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
                  <Icon className="h-3 w-3 me-1" />
                  {media.type_media}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <VisionneuseMedias
        medias={ordonnes}
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
