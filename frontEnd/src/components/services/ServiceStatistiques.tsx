/**
 * Statistiques d'un service pour son professionnel (2026-11-16) : vues de la fiche et clics sur
 * WhatsApp, « Réserver en ligne », « Appeler », sur 30 jours et depuis le début. Sans données
 * personnelles : une vue ou un clic par jour et par navigateur.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, CalendarCheck, Eye, MessageCircle, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { httpClient } from '@/services/httpClient';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';

type Chiffres = { vues: number; whatsapp: number; reservation: number; appel: number };
interface Stats { total: Chiffres; trente_jours: Chiffres; par_jour: ({ jour: string } & Chiffres)[] }

const ServiceStatistiques: React.FC<{ serviceId: number }> = ({ serviceId }) => {
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const { data, isError } = useQuery({
    queryKey: ['service-stats', serviceId],
    queryFn: async () => {
      const res = await httpClient.get<Stats>(`/services/${serviceId}/stats`);
      if (!res.success || !res.data) throw res;
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  if (isError) return null;

  const cases: { cle: keyof Chiffres; libelle: string; Icone: React.ElementType }[] = [
    { cle: 'vues', libelle: t('service.stats.vues', 'Vues de la fiche'), Icone: Eye },
    { cle: 'whatsapp', libelle: t('service.stats.whatsapp', 'Clics WhatsApp'), Icone: MessageCircle },
    { cle: 'reservation', libelle: t('service.stats.reservation', 'Clics « Réserver en ligne »'), Icone: CalendarCheck },
    { cle: 'appel', libelle: t('service.stats.appel', 'Clics « Appeler »'), Icone: Phone },
  ];
  // Petit histogramme des vues des 30 derniers jours
  const max = Math.max(1, ...(data?.par_jour || []).map((j) => j.vues));

  return (
    <Card data-testid="service-statistiques">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
          {t('service.stats.titre', 'Statistiques (30 derniers jours)')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cases.map(({ cle, libelle, Icone }) => (
            <div key={cle} className="rounded-lg border p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icone className="h-3.5 w-3.5" aria-hidden="true" />{libelle}</dt>
              <dd className="mt-1 text-2xl font-semibold">{data ? formatNumber(data.trente_jours[cle]) : '–'}</dd>
              <dd className="text-xs text-muted-foreground">{data ? t('service.stats.depuisDebut', 'Depuis le début : {{n}}', { n: formatNumber(data.total[cle]) }) : ''}</dd>
            </div>
          ))}
        </dl>
        {data && data.par_jour.length > 0 && (
          <div aria-hidden="true" className="flex h-16 items-end gap-0.5" title={t('service.stats.vuesParJour', 'Vues par jour')}>
            {data.par_jour.map((j) => (
              <div key={j.jour} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(4, (j.vues / max) * 100)}%` }} />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t('service.stats.aide', 'Une vue ou un clic est compté une fois par jour et par visiteur. Vos propres visites ne comptent pas. Aucune donnée personnelle n’est gardée.')}
        </p>
      </CardContent>
    </Card>
  );
};

export default ServiceStatistiques;
