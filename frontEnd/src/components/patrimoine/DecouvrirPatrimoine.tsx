/**
 * Rubriques de découverte sous la carte (page Patrimoine, 2e temps, 2026-11-19) :
 * - Incontournables : grands sites avec photo, les plus riches en points de visite ;
 * - Près de vous : sur demande, les sites les plus proches (position demandée seulement au clic) ;
 * - Le patrimoine par wilaya : nombre de sites, un clic recentre la carte sur la wilaya.
 * Mêmes données que la carte (useLieuxCarte), aucune requête de plus.
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, LocateFixed, Loader2, MapPin, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAssetUrl } from '@/helpers/assetUrl';
import { useWilayas } from '@/hooks/useGeographie';
import { useLieuxCarte, incontournables, presDe, sitesParWilaya } from '@/hooks/useLieuxCarte';
import { couleurType } from '@/utils/couleursPatrimoine';
import { economieDonneesActive } from '@/components/shared/CarteALaDemande';

const Titre: React.FC<{ icone: React.ReactNode; children: React.ReactNode }> = ({ icone, children }) => (
  <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold">{icone}{children}</h2>
);

const DecouvrirPatrimoine: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Économie de données : rien n'est téléchargé pour ces rubriques ; elles apparaissent si la carte est demandée
  const [economie] = useState(economieDonneesActive);
  const { lieux } = useLieuxCarte({ actif: !economie });
  const { wilayas } = useWilayas();
  const [proches, setProches] = useState<ReturnType<typeof presDe> | null>(null);
  const [recherche, setRecherche] = useState<'attente' | 'refus' | null>(null);
  const [toutes, setToutes] = useState(false);

  const stars = useMemo(() => incontournables(lieux), [lieux]);
  const parWilaya = useMemo(() => sitesParWilaya(lieux), [lieux]);
  const nomWilaya = (id: number) => {
    const w = wilayas.find((x) => x.id_wilaya === id);
    return w ? `${String(w.codeW).padStart(2, '0')} · ${lang === 'ar' ? w.nom : w.wilaya_name_ascii}` : '';
  };
  const max = parWilaya[0]?.n || 1;

  const chercherPres = () => {
    if (!navigator.geolocation) { setRecherche('refus'); return; }
    setRecherche('attente');
    navigator.geolocation.getCurrentPosition(
      (p) => { setProches(presDe(lieux, { lat: p.coords.latitude, lng: p.coords.longitude })); setRecherche(null); },
      () => setRecherche('refus'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  };
  // Les autres réglages de la page (type, recherche) sont gardés ; un nouveau clic sur la même wilaya
  // recentre aussi la carte (nouvelle entrée d'historique, lue par la carte)
  const voirWilaya = (id: number) => {
    const suite = new URLSearchParams(params);
    suite.set('wilaya', String(id));
    navigate({ pathname: '/patrimoine', search: `?${suite.toString()}` });
    document.getElementById('carte-patrimoine')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!lieux.length) return null;
  return (
    <div className="mb-12 space-y-12">
      {stars.length > 0 && (
        <section aria-labelledby="titre-incontournables">
          <Titre icone={<Star className="h-6 w-6 text-primary" aria-hidden="true" />}><span id="titre-incontournables">{t('patrimoine.decouvrir.incontournables', 'Incontournables')}</span></Titre>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stars.map((s) => (
              <Link key={s.id} to={`/patrimoine/${s.id}`} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md">
                {s.image
                  ? <img src={getAssetUrl(s.image, { width: 480 })} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" />
                  : (
                    <span className="grid aspect-[4/3] w-full place-items-center" style={{ background: `${couleurType(s.type)}1f` }}>
                      <Landmark className="h-12 w-12" style={{ color: couleurType(s.type) }} aria-hidden="true" />
                    </span>
                  )}
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 font-semibold leading-tight" dir="auto">{s.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {[t(`patrimoine.types.${s.type}`, s.type), s.nbPoints ? (s.nbPoints === 1 ? t('patrimoine.carte.nbPoint', '1 point de visite') : t('patrimoine.carte.nbPoints', { n: s.nbPoints, defaultValue: '{{n}} points de visite' })) : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="titre-pres">
        <Titre icone={<LocateFixed className="h-6 w-6 text-primary" aria-hidden="true" />}><span id="titre-pres">{t('patrimoine.decouvrir.pres', 'Près de vous')}</span></Titre>
        {!proches && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4">
            <p className="flex-1 text-sm text-muted-foreground">{t('patrimoine.decouvrir.presAide', 'Les sites à moins de 150 km de vous. Votre position sert seulement à ce calcul, elle n’est pas enregistrée.')}</p>
            <Button onClick={chercherPres} disabled={recherche === 'attente'}>
              {recherche === 'attente' ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <LocateFixed className="h-4 w-4 me-2" />}
              {t('patrimoine.decouvrir.presBouton', 'Trouver les sites près de moi')}
            </Button>
            {recherche === 'refus' && <p role="alert" className="w-full text-sm text-destructive">{t('patrimoine.decouvrir.presRefus', 'Position indisponible : autorisez la localisation, ou choisissez une wilaya sur la carte.')}</p>}
          </div>
        )}
        {proches && (proches.length === 0
          ? <p className="text-sm text-muted-foreground">{t('patrimoine.decouvrir.presAucun', 'Aucun site à moins de 150 km pour le moment.')}</p>
          : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {proches.map((s) => (
                <li key={s.id}>
                  <Link to={`/patrimoine/${s.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/60">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: couleurType(s.type) }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium" dir="auto">{s.nom}</span>
                      <span className="block text-xs text-muted-foreground">{t('patrimoine.decouvrir.km', { km: s.km < 10 ? s.km.toFixed(1) : Math.round(s.km), defaultValue: 'à {{km}} km' })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <section aria-labelledby="titre-wilayas">
        <Titre icone={<Landmark className="h-6 w-6 text-primary" aria-hidden="true" />}><span id="titre-wilayas">{t('patrimoine.decouvrir.parWilaya', 'Le patrimoine par wilaya')}</span></Titre>
        <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {(toutes ? parWilaya : parWilaya.slice(0, 12)).map(({ wilaya, n }) => (
            <li key={wilaya}>
              <button type="button" onClick={() => voirWilaya(wilaya)} className="group flex w-full items-center gap-3 text-start text-sm"
                aria-label={t('patrimoine.decouvrir.voirWilaya', { wilaya: nomWilaya(wilaya), n, defaultValue: '{{wilaya}} : {{n}} sites, voir sur la carte' })}>
                <span className="w-40 shrink-0 truncate group-hover:underline">{nomWilaya(wilaya)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (n / max) * 100)}%` }} /></span>
                <span className="w-8 shrink-0 text-end tabular-nums text-muted-foreground">{n}</span>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {parWilaya.length > 12 && (
          <Button variant="link" className="px-0" onClick={() => setToutes((v) => !v)}>
            {toutes ? t('patrimoine.decouvrir.moins', 'Afficher moins') : t('patrimoine.decouvrir.toutes', { n: parWilaya.length, defaultValue: 'Voir les {{n}} wilayas' })}
          </Button>
        )}
      </section>
    </div>
  );
};

export default DecouvrirPatrimoine;
