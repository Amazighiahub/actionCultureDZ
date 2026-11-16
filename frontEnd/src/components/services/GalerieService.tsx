/**
 * Page d'un service : grande photo, miniatures de la galerie (agrandies au toucher, avec suivante et
 * précédente) et menus (PDF à ouvrir, ou image à agrandir). Accord de la responsable du 2026-11-15.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, FileText, UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getAssetUrl } from '@/helpers/assetUrl';
import type { MediaService } from '@/services/service.service';
import { getLocalizedText } from '@/utils/getLocalizedText';

interface Props {
  nom: string;
  photoPrincipale?: string | null;
  galerie?: MediaService[];
  /** Ce qui s'affiche sans aucune photo (icône du type de service) */
  sansPhoto: React.ReactNode;
}

/** Visionneuse : flèches du clavier (inversées en arabe) et glissement du doigt pour passer d'une photo à l'autre */
function useNavigationPhotos(aller: (pas: number) => void) {
  const debut = React.useRef<number | null>(null);
  const rtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return {
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') aller(rtl() ? -1 : 1);
      if (e.key === 'ArrowLeft') aller(rtl() ? 1 : -1);
    },
    onTouchStart: (e: React.TouchEvent) => { debut.current = e.touches[0]?.clientX ?? null; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (debut.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? debut.current) - debut.current;
      debut.current = null;
      if (Math.abs(dx) < 40) return;
      // Glisser vers la gauche = photo suivante (inverse en arabe)
      aller((dx < 0) !== rtl() ? 1 : -1);
    },
  };
}

export function GalerieService({ nom, photoPrincipale, galerie = [], sansPhoto }: Props) {
  const { t } = useTranslation();
  // La photo principale du service reste la première ; la galerie suit
  const photos = [photoPrincipale, ...galerie.map((g) => g.url)].filter((u): u is string => !!u);
  const [ouverte, setOuverte] = useState<number | null>(null);
  const aller = (pas: number) => setOuverte((i) => (i === null ? null : (i + pas + photos.length) % photos.length));
  const navigation = useNavigationPhotos(aller);

  return (
    <div className="mb-6 space-y-2">
      <div className="overflow-hidden rounded-xl bg-muted aspect-[16/9] max-h-[480px] w-full">
        {photos[0]
          ? (
            <button type="button" className="h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary" onClick={() => setOuverte(0)}
              aria-label={t('servicesVisiteurs.galerie.agrandir', 'Agrandir la photo {{n}} sur {{total}}', { n: 1, total: photos.length })}>
              <img src={getAssetUrl(photos[0], { width: 1200 })} alt={nom} className="h-full w-full object-cover" />
            </button>
          )
          : sansPhoto}
      </div>
      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={t('servicesVisiteurs.galerie.titre', 'Photos')}>
          {photos.slice(1).map((url, i) => (
            <li key={url} className="shrink-0">
              <button type="button" onClick={() => setOuverte(i + 1)} className="block overflow-hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={t('servicesVisiteurs.galerie.agrandir', 'Agrandir la photo {{n}} sur {{total}}', { n: i + 2, total: photos.length })}>
                <img src={getAssetUrl(url, { width: 240 })} alt="" loading="lazy" className="h-20 w-28 object-cover sm:h-24 sm:w-32" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={ouverte !== null} onOpenChange={(o) => { if (!o) setOuverte(null); }}>
        <DialogContent className="max-w-4xl p-2" aria-describedby={undefined} {...(photos.length > 1 ? navigation : {})}>
          <DialogTitle className="sr-only">{nom}</DialogTitle>
          {ouverte !== null && (
            <div className="relative">
              <img src={getAssetUrl(photos[ouverte], { width: 1600 })} alt="" className="max-h-[80vh] w-full rounded object-contain" />
              {photos.length > 1 && (
                <>
                  <Button type="button" size="icon" variant="secondary" className="absolute start-2 top-1/2 -translate-y-1/2" onClick={() => aller(-1)} aria-label={t('common.previous', 'Précédent')}>
                    <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary" className="absolute end-2 top-1/2 -translate-y-1/2" onClick={() => aller(1)} aria-label={t('common.next', 'Suivant')}>
                    <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                  <p className="mt-1 text-center text-sm text-muted-foreground">{ouverte + 1} / {photos.length}</p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Menus d'un restaurant, tarifs d'un hôtel… : PDF ouvert dans un onglet, image agrandie */
export function MenusService({ menus = [] }: { menus?: MediaService[] }) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  if (menus.length === 0) return null;
  return (
    <section className="mb-8" aria-labelledby="menus-titre">
      <h2 id="menus-titre" className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden="true" />
        {t('servicesVisiteurs.menus.titre', 'Menu et tarifs')}
      </h2>
      <ul className="flex flex-wrap gap-3">
        {menus.map((m, i) => {
          const libelle = m.nom || t('servicesVisiteurs.menus.sansNom', 'Menu {{n}}', { n: i + 1 });
          return (
            <li key={m.id}>
              {m.pdf && m.lien ? (
                <a href={getAssetUrl(m.lien)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border px-4 py-3 hover:bg-muted">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span dir="auto">{libelle}</span>
                  <span className="text-xs text-muted-foreground">PDF</span>
                </a>
              ) : m.url ? (
                <button type="button" onClick={() => setImage(m.url!)} className="block overflow-hidden rounded-lg border text-start hover:bg-muted">
                  <img src={getAssetUrl(m.url, { width: 320 })} alt="" loading="lazy" className="h-28 w-40 object-cover" />
                  <span className="block px-3 py-2 text-sm" dir="auto">{libelle}</span>
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Dialog open={!!image} onOpenChange={(o) => { if (!o) setImage(null); }}>
        <DialogContent className="max-w-4xl p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t('servicesVisiteurs.menus.titre', 'Menu et tarifs')}</DialogTitle>
          {image && <img src={getAssetUrl(image, { width: 1600 })} alt="" className="max-h-[85vh] w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/**
 * Photos des visiteurs (jointes à leurs avis, relues par l'équipe), en haut de la page du service,
 * comme TripAdvisor : miniatures, agrandies au toucher, avec le prénom de l'auteur.
 */
export function PhotosVisiteurs({ photos = [] }: { photos?: { id: number; url: string; prenom?: unknown }[] }) {
  const { t, i18n } = useTranslation();
  const [ouverte, setOuverte] = useState<number | null>(null);
  const aller = (pas: number) => setOuverte((i) => (i === null ? null : (i + pas + photos.length) % photos.length));
  const navigation = useNavigationPhotos(aller);
  if (photos.length === 0) return null;
  const courante = ouverte !== null ? photos[ouverte] : null;
  return (
    <section className="mb-6" aria-labelledby="photos-visiteurs-titre">
      <h2 id="photos-visiteurs-titre" className="mb-2 text-sm font-semibold text-muted-foreground">
        {t('servicesVisiteurs.photosVisiteurs.titre', 'Photos des visiteurs ({{n}})', { n: photos.length })}
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, i) => (
          <li key={p.id} className="shrink-0">
            <button type="button" onClick={() => setOuverte(i)} className="block overflow-hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={t('servicesVisiteurs.photosVisiteurs.agrandir', 'Agrandir la photo de visiteur {{n}} sur {{total}}', { n: i + 1, total: photos.length })}>
              <img src={getAssetUrl(p.url, { width: 200 })} alt="" loading="lazy" className="h-16 w-16 object-cover sm:h-20 sm:w-20" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={ouverte !== null} onOpenChange={(o) => { if (!o) setOuverte(null); }}>
        <DialogContent className="max-w-4xl p-2" aria-describedby={undefined} {...(photos.length > 1 ? navigation : {})}>
          <DialogTitle className="sr-only">{t('servicesVisiteurs.photosVisiteurs.titreCourt', 'Photo d’un visiteur')}</DialogTitle>
          {courante && (
            <div className="relative">
              <img src={getAssetUrl(courante.url, { width: 1600 })} alt="" className="max-h-[80vh] w-full rounded object-contain" />
              {photos.length > 1 && (
                <>
                  <Button type="button" size="icon" variant="secondary" className="absolute start-2 top-1/2 -translate-y-1/2" onClick={() => aller(-1)} aria-label={t('common.previous', 'Précédent')}>
                    <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary" className="absolute end-2 top-1/2 -translate-y-1/2" onClick={() => aller(1)} aria-label={t('common.next', 'Suivant')}>
                    <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                </>
              )}
              <p className="mt-1 text-center text-sm text-muted-foreground" dir="auto">
                {getLocalizedText(courante.prenom, i18n.language, '')
                  ? t('servicesVisiteurs.photosVisiteurs.par', 'Publiée par {{prenom}}', { prenom: getLocalizedText(courante.prenom, i18n.language, '') })
                  : t('servicesVisiteurs.photosVisiteurs.titreCourt', 'Photo d’un visiteur')}
                {photos.length > 1 && ` · ${ouverte! + 1} / ${photos.length}`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
