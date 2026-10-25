/**
 * ALaUne — page d'accueil : les prochains événements. Le plus proche en grande carte (photo,
 * dates, lieu, compte à rebours, programme), les suivants en liste à côté.
 * Aucun événement à venir : la section n'apparaît pas.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { evenementService } from '@/services/evenement.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getLocalizedText } from '@/utils/getLocalizedText';
import type { Evenement } from '@/types';
import EnTeteSection from './EnTeteSection';
import { evenementPath } from '@/utils/slug';

type EvenementAccueil = Evenement & {
  image_url?: string | null;
  TypeEvenement?: { nom_type?: unknown } | null;
  Lieu?: { id_lieu?: number; nom?: unknown } | null;
};

const JOUR = 24 * 60 * 60 * 1000;

const ALaUne: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatDate } = useFormatDate();

  const { data: evenements = [], isLoading } = useQuery({
    queryKey: ['home', 'a-la-une', i18n.language],
    queryFn: async (): Promise<EvenementAccueil[]> => {
      const res = await evenementService.getUpcoming({ limit: 4 });
      // Réponse paginée : tableau direct, ou { data } / { items } selon l'API
      const d = (res.success ? res.data : null) as unknown;
      const o = d as { data?: unknown; items?: unknown } | null;
      const liste = Array.isArray(d) ? d : Array.isArray(o?.data) ? o!.data : Array.isArray(o?.items) ? o!.items : [];
      return liste as EvenementAccueil[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && evenements.length === 0) return null;

  const image = (e: EvenementAccueil) => e.Media?.[0]?.url || e.image_url || null;
  const nom = (e: EvenementAccueil) => getLocalizedText(e.nom_evenement as unknown, i18n.language);
  const lieu = (e: EvenementAccueil) => getLocalizedText(e.Lieu?.nom, i18n.language);

  // « 29 – 30 octobre 2026 », ou une seule date
  const periode = (e: EvenementAccueil) => {
    if (!e.date_debut) return t('sections.events.dateToConfirm', 'Date à confirmer');
    const d = new Date(e.date_debut), f = e.date_fin ? new Date(e.date_fin) : null;
    const complet = { day: 'numeric', month: 'long', year: 'numeric' } as const;
    if (!f || d.toDateString() === f.toDateString()) return formatDate(d, complet);
    if (d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear()) return `${d.getDate()} – ${formatDate(f, complet)}`;
    return `${formatDate(d, { day: 'numeric', month: 'long' })} – ${formatDate(f, complet)}`;
  };

  // « Dans 4 jours », « Demain », « Aujourd'hui », « En cours »
  const quand = (e: EvenementAccueil) => {
    if (!e.date_debut) return null;
    const debut = new Date(e.date_debut).getTime(), fin = e.date_fin ? new Date(e.date_fin).getTime() : debut;
    const maintenant = Date.now();
    if (maintenant >= debut && maintenant <= fin) return t('home.aLaUne.enCours', 'En ce moment');
    const jours = Math.ceil((new Date(new Date(e.date_debut).toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / JOUR);
    if (jours <= 0) return t('home.aLaUne.aujourdhui', 'Aujourd’hui');
    if (jours === 1) return t('home.aLaUne.demain', 'Demain');
    return t('home.aLaUne.dansJours', { defaultValue: 'Dans {{count}} jours', count: jours });
  };

  const [premier, ...suivants] = evenements;

  return (
    <section className="py-14 lg:py-20" aria-labelledby="titre-a-la-une">
      <div className="container">
        <EnTeteSection
          id="titre-a-la-une"
          surtitre={t('home.aLaUne.surtitre', 'À la une')}
          titre={t('home.aLaUne.titre', 'Les prochains événements')}
          lien={{ to: '/evenements', libelle: t('home.aLaUne.tous', 'Tout l’agenda') }}
        />

        {isLoading || !premier ? (
          <div className="grid gap-8 lg:grid-cols-5">
            <Skeleton className="lg:col-span-3 aspect-[16/10] rounded-2xl" />
            <div className="lg:col-span-2 space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24 w-full" /></div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {/* Grande carte : le prochain événement */}
            <article className="group relative">
              <Link to={evenementPath(premier.id_evenement, premier.nom_evenement)} className="block overflow-hidden rounded-2xl bg-muted aspect-[16/10]">
                {image(premier) ? (
                  <img src={getAssetUrl(image(premier), { width: 1200 })} alt="" loading="eager" decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/25 to-accent/25 flex items-center justify-center" aria-hidden="true">
                    <CalendarDays className="h-16 w-16 text-primary/50" />
                  </div>
                )}
              </Link>
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {quand(premier) && <Badge className="bg-primary text-primary-foreground">{quand(premier)}</Badge>}
                  {getLocalizedText(premier.TypeEvenement?.nom_type, i18n.language) && (
                    <Badge variant="outline">{getLocalizedText(premier.TypeEvenement?.nom_type, i18n.language)}</Badge>
                  )}
                </div>
                <h3 className="font-serif text-2xl md:text-3xl font-bold leading-tight">
                  <Link to={evenementPath(premier.id_evenement, premier.nom_evenement)} className="hover:text-primary transition-colors">{nom(premier)}</Link>
                </h3>
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />{periode(premier)}</span>
                  {lieu(premier) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{lieu(premier)}</span>}
                </p>
                {getLocalizedText(premier.description as unknown, i18n.language) && (
                  <p className="text-muted-foreground line-clamp-3 max-w-2xl">{getLocalizedText(premier.description as unknown, i18n.language)}</p>
                )}
                <Button asChild size="lg" className="mt-1">
                  <Link to={evenementPath(premier.id_evenement, premier.nom_evenement)}>{t('home.aLaUne.programme', 'Voir le programme')}</Link>
                </Button>
              </div>
            </article>

            {/* Les suivants */}
            {suivants.length > 0 ? (
              <ul className="divide-y border-y lg:border-y-0 lg:border-s lg:ps-8 self-start">
                {suivants.map(e => (
                  <li key={e.id_evenement} className="py-4 first:pt-0 lg:first:pt-0">
                    <Link to={evenementPath(e.id_evenement, e.nom_evenement)} className="group flex gap-4">
                      <div className="shrink-0 w-16 rounded-lg border bg-card text-center py-1.5">
                        {e.date_debut ? (
                          <>
                            <span className="block text-2xl font-bold leading-none">{new Date(e.date_debut).getDate()}</span>
                            <span className="block text-xs uppercase text-muted-foreground mt-1">{formatDate(e.date_debut, { month: 'short' })}</span>
                          </>
                        ) : <CalendarDays className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{nom(e)}</p>
                        {lieu(e) && <p className="text-sm text-muted-foreground truncate">{lieu(e)}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-muted/50 p-6 self-start">
                <p className="font-serif text-xl font-semibold mb-2">{t('home.aLaUne.organiser', 'Vous organisez un événement ?')}</p>
                <p className="text-muted-foreground mb-4">{t('home.aLaUne.organiserTexte', 'Salon, festival, exposition, conférence : publiez-le sur Tala DZ avec son programme et ses intervenants.')}</p>
                <Button asChild variant="outline"><Link to="/ajouter-evenement">{t('home.aLaUne.publier', 'Publier un événement')}</Link></Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ALaUne;
