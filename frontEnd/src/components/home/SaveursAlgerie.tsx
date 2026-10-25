/**
 * SaveursAlgerie — page d'accueil : quelques plats de la page Gastronomie (même carte).
 * Aucun plat publié : la section n'apparaît pas.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { httpClient } from '@/services/httpClient';
import PlatCard, { type Plat } from '@/components/gastronomie/PlatCard';
import EnTeteSection from './EnTeteSection';

const SaveursAlgerie: React.FC = () => {
  const { t } = useTranslation();
  const { data: plats = [] } = useQuery({
    queryKey: ['home', 'saveurs'],
    queryFn: async (): Promise<Plat[]> => {
      const res = await httpClient.get<{ plats: Plat[] }>('/patrimoine/gastronomie');
      return res.success && res.data ? res.data.plats.slice(0, 4) : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (plats.length === 0) return null;

  return (
    <section className="py-14 lg:py-20" aria-labelledby="titre-saveurs">
      <div className="container">
        <EnTeteSection
          id="titre-saveurs"
          surtitre={t('home.saveurs.surtitre', 'Gastronomie')}
          titre={t('home.saveurs.titre', 'Saveurs d’Algérie')}
          accroche={t('home.saveurs.accroche', 'Les plats de nos régions, leur histoire et les fêtes où on les sert.')}
          lien={{ to: '/artisanat/gastronomie', libelle: t('home.saveurs.tous', 'Tous les plats') }}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plats.map(p => <PlatCard key={p.id_oeuvre} plat={p} />)}
        </div>
      </div>
    </section>
  );
};

export default SaveursAlgerie;
