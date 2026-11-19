/**
 * Page d'un service : grande photo, miniatures de la galerie (agrandies au toucher, avec suivante et
 * précédente) et menus (PDF à ouvrir, ou image à agrandir). Accord de la responsable du 2026-11-15.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getAssetUrl } from '@/helpers/assetUrl';
import { VisionneuseMedias } from '@/components/shared/VisionneuseMedias';
import type { MediaService } from '@/services/service.service';
import { getLocalizedText } from '@/utils/getLocalizedText';

interface Props {
  nom: string;
  photoPrincipale?: string | null;
  galerie?: MediaService[];
  /** Ce qui s'affiche sans aucune photo (icône du type de service) */
  sansPhoto: React.ReactNode;
}

export function GalerieService({ nom, photoPrincipale, galerie = [], sansPhoto }: Props) {
  const { t } = useTranslation();
  // La photo principale du service reste la première ; la galerie suit
  const photos = [photoPrincipale, ...galerie.map((g) => g.url)].filter((u): u is string => !!u);
  const [ouverte, setOuverte] = useState<number | null>(null);
  const aller = (pas: number) => setOuverte((i) => (i === null ? null : (i + pas + photos.length) % photos.length));

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
      {/* Visionneuse commune (flèches, glissement du doigt, Échap) ; avant : une copie ici */}
      <VisionneuseMedias
        medias={photos.map((url) => ({ type_media: 'image' as const, url, titre: nom }))}
        currentIndex={ouverte ?? 0}
        isOpen={ouverte !== null}
        onClose={() => setOuverte(null)}
        onPrevious={() => aller(-1)}
        onNext={() => aller(1)}
      />
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
  if (photos.length === 0) return null;
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
      {/* Visionneuse commune ; la légende dit qui a publié la photo */}
      <VisionneuseMedias
        medias={photos.map((p) => {
          const prenom = getLocalizedText(p.prenom, i18n.language, '');
          return { type_media: 'image' as const, url: p.url,
            titre: prenom ? t('servicesVisiteurs.photosVisiteurs.par', 'Publiée par {{prenom}}', { prenom }) : t('servicesVisiteurs.photosVisiteurs.titreCourt', 'Photo d’un visiteur') };
        })}
        currentIndex={ouverte ?? 0}
        isOpen={ouverte !== null}
        onClose={() => setOuverte(null)}
        onPrevious={() => aller(-1)}
        onNext={() => aller(1)}
      />
    </section>
  );
}
