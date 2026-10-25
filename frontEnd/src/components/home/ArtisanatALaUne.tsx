/**
 * ArtisanatALaUne — page d'accueil : quelques produits artisanaux complets (avec photo), avec la
 * carte de la page Artisanat. Aucun produit avec photo : la section n'apparaît pas.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { httpClient } from '@/services/httpClient';
import ArtisanatCard from '@/components/artisanat/ArtisanatCard';
import EnTeteSection from './EnTeteSection';

type Produit = Record<string, unknown> & {
  Oeuvre?: { Media?: Array<{ url?: string }> };
  medias?: Array<{ url?: string }>;
  image_url?: string | null;
};

const aUnePhoto = (p: Produit) => !!(p.Oeuvre?.Media?.[0]?.url || p.medias?.[0]?.url || p.image_url);

const ArtisanatALaUne: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: produits = [] } = useQuery({
    queryKey: ['home', 'artisanat-une', i18n.language],
    queryFn: async (): Promise<Produit[]> => {
      const res = await httpClient.get<unknown>('/artisanat', { limit: 12 });
      const d = (res.success ? res.data : null) as unknown;
      const o = d as { data?: unknown; artisanats?: unknown; items?: unknown } | null;
      const liste = (Array.isArray(d) ? d : Array.isArray(o?.data) ? o!.data : Array.isArray(o?.artisanats) ? o!.artisanats : Array.isArray(o?.items) ? o!.items : []) as Produit[];
      return liste.filter(aUnePhoto).slice(0, 4);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (produits.length === 0) return null;

  return (
    <section className="py-14 lg:py-20" aria-labelledby="titre-artisanat">
      <div className="container">
        <EnTeteSection
          id="titre-artisanat"
          surtitre={t('home.artisanat.surtitre', 'Fait main')}
          titre={t('home.artisanat.titre', 'Artisanat')}
          accroche={t('home.artisanat.accroche', 'Poterie, tapis, bijoux, cuir : des savoir-faire transmis de génération en génération.')}
          lien={{ to: '/artisanat', libelle: t('home.artisanat.tous', 'Tout l’artisanat') }}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {produits.map((p, i) => <ArtisanatCard key={String(p.id_artisanat ?? p.id ?? i)} artisanat={p} />)}
        </div>
      </div>
    </section>
  );
};

export default ArtisanatALaUne;
