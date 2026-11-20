/**
 * Section Tamazight (/tamazight), 2026-11-20 : textes et voix en tamazight publiés sur Tala DZ, par variante, et
 * voix des lieux du patrimoine. Les textes partagés librement et relus entrent dans les données ouvertes
 * (/donnees-ouvertes) pour la recherche : traduction, reconnaissance de la parole, lecture à voix haute.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Database, Headphones, PenLine, Volume2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { getAssetUrl } from '@/helpers/assetUrl';
import { oeuvrePath, lieuPath } from '@/utils/slug';
import { VARIANTES, LIBELLE_VARIANTE, type Variante } from '@/utils/tamazight';

export interface OeuvreTamazight {
  id_oeuvre: number; titre: unknown; description: unknown; id_type_oeuvre: number; type: unknown;
  ecriture: 'latin' | 'tifinagh'; variante: Variante | null; image_url: string | null;
  auteur: { id_user: number; nom: unknown; prenom: unknown } | null; audio: boolean; donnees_ouvertes: boolean;
}
export interface VoixTamazight {
  id: number; url: string; ecriture: 'latin' | 'tifinagh'; parler: string | null; credit: string | null;
  lieu: { id_lieu: number; nom: unknown };
}

/** Types proposés au filtre : articles et poèmes, livres, musique */
const TYPES = [{ id: 4, cle: 'textes', defaut: 'Articles et poèmes' }, { id: 1, cle: 'livres', defaut: 'Livres' }, { id: 3, cle: 'musique', defaut: 'Musique' }];

const Tamazight: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [variante, setVariante] = useState<string>('');
  const [type, setType] = useState<number | null>(null);
  const [oeuvres, setOeuvres] = useState<OeuvreTamazight[]>([]);
  const [voix, setVoix] = useState<VoixTamazight[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const nomVariante = (v: Variante) => t(`tamazight.variantes.${v}`, LIBELLE_VARIANTE[v]);
  const texte = (v: unknown) => getLocalizedText(v as never, lang) || getLocalizedText(v as never, 'tz-ltn') || '';

  useEffect(() => {
    let actif = true;
    setChargement(true);
    httpClient.get<{ oeuvres: OeuvreTamazight[] }>('/tamazight/oeuvres', { ...(variante ? { variante } : {}), ...(type ? { type } : {}), limit: 48 })
      .then((r) => { if (!actif) return; if (!r.success) throw r; setOeuvres(r.data?.oeuvres || []); setErreur(false); })
      .catch(() => { if (actif) setErreur(true); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [variante, type]);

  useEffect(() => {
    httpClient.get<VoixTamazight[]>('/tamazight/voix').then((r) => { if (r.success && Array.isArray(r.data)) setVoix(r.data); }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('tamazight.page.titre', 'Tamazight : textes et voix')}
        description={t('tamazight.page.description', 'Contes, poèmes, proverbes et chansons en tamazight, en texte et en audio, par variante : kabyle, chaoui, mozabite, chenoui, touareg… Partagés librement pour faire vivre la langue.')}
        type="website"
        keywords={['tamazight', 'ⵜⴰⵎⴰⵣⵉⵖⵜ', 'kabyle', 'chaoui', 'mozabite', 'amazigh', 'tifinagh', 'contes', 'poésie']}
      />
      <Header />
      <main className="container py-8">
        {/* Présentation */}
        <section className="mb-10 rounded-2xl bg-primary/10 p-6 md:p-10">
          <p className="mb-2 text-sm font-semibold tracking-wide text-primary" lang="ber-Tfng">ⵜⴰⵎⴰⵣⵉⵖⵜ</p>
          <h1 className="mb-4 font-serif text-4xl font-bold">{t('tamazight.page.titre', 'Tamazight : textes et voix')}</h1>
          <p className="mb-6 max-w-3xl text-lg text-muted-foreground">
            {t('tamazight.page.intro', 'Écrivez, enregistrez et partagez en tamazight. Chaque conte, poème ou chanson publié ici fait connaître la langue ; partagé librement, il aide aussi les chercheurs à créer des outils de traduction et de reconnaissance de la parole.')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild><Link to="/ajouter-oeuvre"><PenLine className="me-2 h-4 w-4" aria-hidden="true" />{t('tamazight.page.ecrire', 'Publier un texte en tamazight')}</Link></Button>
            <Button asChild variant="outline"><Link to="/donnees-ouvertes"><Database className="me-2 h-4 w-4" aria-hidden="true" />{t('tamazight.page.donnees', 'Données ouvertes')}</Link></Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t('tamazight.page.aide', 'Dans l’éditeur, choisissez « Le texte de l’article est écrit en : tamazight » puis indiquez la variante.')}</p>
        </section>

        {/* Filtres */}
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label={t('tamazight.page.filtres', 'Filtrer')}>
          <select value={variante} onChange={(e) => setVariante(e.target.value)} aria-label={t('tamazight.form.variante', 'Variante (parler)')}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm sm:w-64">
            <option value="">{t('tamazight.page.toutesVariantes', 'Toutes les variantes')}</option>
            {VARIANTES.map((v) => <option key={v} value={v}>{nomVariante(v)}</option>)}
          </select>
          <Button size="sm" variant={type === null ? 'default' : 'outline'} aria-pressed={type === null} onClick={() => setType(null)}>{t('tamazight.page.tout', 'Tout')}</Button>
          {TYPES.map((ty) => (
            <Button key={ty.id} size="sm" variant={type === ty.id ? 'default' : 'outline'} aria-pressed={type === ty.id} onClick={() => setType(ty.id)}>
              {t(`tamazight.page.types.${ty.cle}`, ty.defaut)}
            </Button>
          ))}
        </div>

        <ErrorBoundary>
          {chargement ? <LoadingSkeleton type="card" count={6} /> : erreur ? (
            <Card className="p-8 text-center"><p role="alert" className="text-destructive">{t('common.loadError', 'Erreur de chargement')}</p></Card>
          ) : oeuvres.length === 0 ? (
            <Card className="space-y-3 p-10 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-lg font-medium">{t('tamazight.page.vide', 'Aucun texte pour l’instant : soyez le premier à publier en tamazight.')}</p>
            </Card>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {oeuvres.map((o) => (
                <li key={o.id_oeuvre}>
                  <Link to={oeuvrePath(o.id_oeuvre, o.titre, o.id_type_oeuvre)} className="block h-full">
                    <Card className="h-full overflow-hidden transition hover:shadow-md">
                      {o.image_url && <img src={getAssetUrl(o.image_url, { width: 480 })} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />}
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {o.variante && <Badge variant="secondary">{nomVariante(o.variante)}</Badge>}
                          <Badge variant="outline">{o.ecriture === 'tifinagh' ? t('tamazight.ecriture.tifinagh', 'Tifinagh') : t('tamazight.ecriture.latin', 'Lettres latines')}</Badge>
                          {o.audio && <Badge variant="outline"><Volume2 className="me-1 h-3 w-3" aria-hidden="true" />{t('tamazight.page.audio', 'Audio')}</Badge>}
                          {o.donnees_ouvertes && <Badge variant="outline"><Database className="me-1 h-3 w-3" aria-hidden="true" />{t('tamazight.page.ouvert', 'Données ouvertes')}</Badge>}
                        </div>
                        <h2 className="font-serif text-lg font-semibold leading-tight" dir="auto">{texte(o.titre)}</h2>
                        {texte(o.description) && <p className="line-clamp-3 text-sm text-muted-foreground" dir="auto">{texte(o.description)}</p>}
                        {o.auteur && <p className="text-xs text-muted-foreground">{[texte(o.auteur.prenom), texte(o.auteur.nom)].filter(Boolean).join(' ')}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ErrorBoundary>

        {/* Voix des lieux */}
        {voix.length > 0 && (
          <section className="mt-12" aria-labelledby="titre-voix">
            <h2 id="titre-voix" className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold">
              <Headphones className="h-6 w-6 text-primary" aria-hidden="true" />{t('tamazight.page.voix', 'Écouter le patrimoine en tamazight')}
            </h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {voix.map((v) => (
                <li key={v.id} className="space-y-2 rounded-lg border p-4">
                  <Link to={lieuPath(v.lieu.id_lieu, v.lieu.nom)} className="font-medium text-primary hover:underline" dir="auto">{texte(v.lieu.nom)}</Link>
                  {(v.parler || v.credit) && <p className="text-sm text-muted-foreground" dir="auto">{[v.parler, v.credit].filter(Boolean).join(' · ')}</p>}
                  <audio controls preload="none" src={getAssetUrl(v.url)} className="w-full" aria-label={texte(v.lieu.nom)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Tamazight;
