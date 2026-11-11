/**
 * Recherche générale : une seule recherche pour tout le site (audit V11 UX-13).
 *
 * Avant, chaque rubrique avait sa propre recherche : une personne qui cherchait « Tlemcen » ou
 * « chaâbi » ne savait pas où regarder. Cette page interroge en même temps les recherches existantes
 * (lieux, événements, œuvres et artisanat, professionnels, organisations), déjà gardées en cache par
 * le serveur, et la liste des wilayas ; les résultats sont groupés par type.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Building, Calendar, Landmark, MapPin, Palette, Search, Users, type LucideIcon } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { httpClient } from '@/services/httpClient';
import { wilayaVitrineService } from '@/services/wilayaVitrine.service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { nomWilaya, type Wilaya } from '@/components/gastronomie/PlatCard';
import { evenementPath, lieuPath, oeuvrePath, organisationPath, professionnelPath, wilayaPath } from '@/utils/slug';

const PAR_GROUPE = 6;

/** Recherches existantes interrogées en même temps (déjà gardées en cache par le serveur) */
const SOURCES = [
  { id: 'lieux', adresse: '/patrimoine/search', limite: true },
  { id: 'evenements', adresse: '/evenements/search', limite: true },
  { id: 'oeuvres', adresse: '/oeuvres/search', limite: true },
  { id: 'pros', adresse: '/users/professionals', limite: true },
  { id: 'organisations', adresse: '/organisations', limite: false },
] as const;

interface Resultat {
  cle: string;
  titre: string;
  detail?: string;
  lien: string;
  image?: string | null;
}

type Brut = Record<string, unknown>;

/** Liste d'une réponse, quelle que soit sa forme ({ data: [...] }, { data: { oeuvres: [...] } }…) */
const liste = (data: unknown, cles: string[] = []): Brut[] => {
  if (Array.isArray(data)) return data as Brut[];
  if (data && typeof data === 'object') {
    for (const c of [...cles, 'items', 'data']) {
      const v = (data as Brut)[c];
      if (Array.isArray(v)) return v as Brut[];
    }
  }
  return [];
};

/** Texte comparé sans accents ni majuscules (wilayas, cherchées sur place) */
const simplifier = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Une recherche existante ; un échec n'empêche pas les autres groupes de s'afficher */
const chercher = async (adresse: string, params: Record<string, unknown>): Promise<unknown> => {
  try {
    const r = await httpClient.get<unknown>(adresse, params);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
};

interface Groupe {
  id: string;
  titre: string;
  icone: LucideIcon;
  resultats: Resultat[];
  charge: boolean;
}

export default function Recherche() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'fr';
  const [params, setParams] = useSearchParams();
  const [saisie, setSaisie] = useState(params.get('q') || '');
  const terme = useDebouncedValue(saisie.trim(), 400);
  const actif = terme.length >= 2;

  // L'adresse garde la recherche (lien partageable, retour arrière)
  useEffect(() => {
    if ((params.get('q') || '') !== terme) setParams(terme ? { q: terme } : {}, { replace: true });
  }, [terme, params, setParams]);

  const [lieux, evenements, oeuvres, pros, organisations] = useQueries({
    queries: SOURCES.map((s) => ({
      queryKey: ['recherche-generale', s.id, terme, lang],
      queryFn: () => chercher(s.adresse, s.limite ? { q: terme, limit: PAR_GROUPE } : { q: terme }),
      enabled: actif,
      staleTime: 60_000,
    })),
  });
  // Même requête que DashboardUser et WilayaVitrine (même clé, même forme : une liste) ; avant, une copie
  // sous la même clé gardait « null » en cas d'échec et faisait planter ces pages
  const wilayas = useQuery({ queryKey: ['wilayas-liste'], queryFn: wilayaVitrineService.wilayas, staleTime: 60 * 60_000 });

  const cherche = simplifier(terme);
  const groupes: Groupe[] = [
    {
      id: 'wilayas', titre: t('recherche.wilayas', 'Wilayas'), icone: MapPin, charge: wilayas.isLoading,
      resultats: actif ? liste(wilayas.data).filter((w) => simplifier(w.wilaya_name_ascii).includes(cherche) || simplifier(w.nom).includes(cherche))
        .slice(0, PAR_GROUPE).map((w) => ({
          cle: `w${w.id_wilaya}`, titre: nomWilaya(w as unknown as Wilaya, lang), lien: wilayaPath(Number(w.id_wilaya), w.wilaya_name_ascii),
        })) : [],
    },
    {
      id: 'lieux', titre: t('recherche.lieux', 'Lieux et patrimoine'), icone: Landmark, charge: lieux.isLoading,
      resultats: liste(lieux.data).map((l) => ({
        cle: `l${l.id_lieu}`, titre: getLocalizedText(l.nom, lang), lien: lieuPath(Number(l.id_lieu), l.nom),
        detail: getLocalizedText((l.Commune as Brut | undefined)?.nom, lang) || undefined,
      })),
    },
    {
      id: 'evenements', titre: t('recherche.evenements', 'Événements'), icone: Calendar, charge: evenements.isLoading,
      resultats: liste(evenements.data).map((e) => ({
        cle: `e${e.id_evenement}`, titre: getLocalizedText(e.nom_evenement, lang), lien: evenementPath(Number(e.id_evenement), e.nom_evenement),
        image: (e.image_url as string) || null,
        detail: e.date_debut ? new Date(String(e.date_debut)).toLocaleDateString(lang, { dateStyle: 'medium' }) : undefined,
      })),
    },
    {
      id: 'oeuvres', titre: t('recherche.oeuvres', 'Œuvres et artisanat'), icone: Palette, charge: oeuvres.isLoading,
      resultats: liste(oeuvres.data, ['oeuvres']).map((o) => ({
        cle: `o${o.id_oeuvre}`, titre: getLocalizedText(o.titre, lang), lien: oeuvrePath(Number(o.id_oeuvre), o.titre, Number(o.id_type_oeuvre)),
        image: (o.image_url as string) || null,
        detail: getLocalizedText((o.TypeOeuvre as Brut | undefined)?.nom_type, lang) || undefined,
      })),
    },
    {
      id: 'pros', titre: t('recherche.professionnels', 'Professionnels'), icone: Users, charge: pros.isLoading,
      resultats: liste(pros.data, ['professionals', 'professionnels', 'users']).map((u) => ({
        cle: `u${u.id_user}`,
        titre: `${getLocalizedText(u.prenom, lang)} ${getLocalizedText(u.nom, lang)}`.trim(),
        lien: professionnelPath(Number(u.id_user), getLocalizedText(u.prenom, 'fr'), getLocalizedText(u.nom, 'fr')),
        image: (u.photo_url as string) || null,
        detail: getLocalizedText(u.entreprise, lang) || undefined,
      })),
    },
    {
      id: 'organisations', titre: t('recherche.organisations', 'Organisations'), icone: Building, charge: organisations.isLoading,
      resultats: liste(organisations.data, ['organisations']).slice(0, PAR_GROUPE).map((o) => ({
        cle: `g${o.id_organisation}`, titre: getLocalizedText(o.nom, lang), lien: organisationPath(Number(o.id_organisation), o.nom),
        image: (o.logo_url as string) || null,
      })),
    },
  ];

  const enCours = actif && groupes.some((g) => g.charge);
  const total = groupes.reduce((n, g) => n + g.resultats.length, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title={t('recherche.titre', 'Rechercher sur Tala DZ')} noindex />
      <Header />
      <main className="flex-1 container py-8 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif mb-4">{t('recherche.titre', 'Rechercher sur Tala DZ')}</h1>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mb-6">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            autoFocus
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={t('recherche.placeholder', 'Un lieu, une wilaya, un événement, une œuvre, une personne…')}
            aria-label={t('recherche.titre', 'Rechercher sur Tala DZ')}
            className="!ps-10 h-12 text-base"
          />
        </form>

        {!actif ? (
          <p className="text-muted-foreground">{t('recherche.aide', 'Écrivez au moins 2 lettres : par exemple « Tlemcen », « chaâbi » ou « poterie ».')}</p>
        ) : (
          <>
            <p role="status" className="text-sm text-muted-foreground mb-4">
              {enCours
                ? t('recherche.enCours', 'Recherche en cours…')
                : total
                  ? t('recherche.nombre', '{{count}} résultat(s) pour « {{terme}} »', { count: total, terme })
                  : t('recherche.aucun', 'Aucun résultat pour « {{terme}} ». Essayez un autre mot, ou une autre orthographe.', { terme })}
            </p>
            <div className="space-y-6">
              {groupes.filter((g) => g.resultats.length > 0).map((g) => (
                <section key={g.id} aria-labelledby={`groupe-${g.id}`}>
                  <h2 id={`groupe-${g.id}`} className="flex items-center gap-2 text-lg font-semibold mb-2">
                    <g.icone className="h-5 w-5 text-primary" aria-hidden="true" />
                    {g.titre}
                  </h2>
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {g.resultats.map((r) => (
                        <Link key={r.cle} to={r.lien} className="flex items-center gap-3 p-3 min-h-[56px] hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                          {r.image ? (
                            <img src={r.image} alt="" loading="lazy" className="h-10 w-10 rounded object-cover shrink-0" />
                          ) : (
                            <span className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                              <g.icone className="h-5 w-5 text-muted-foreground" />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block font-medium truncate">{r.titre}</span>
                            {r.detail && <span className="block text-sm text-muted-foreground truncate">{r.detail}</span>}
                          </span>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              ))}
            </div>
            {!enCours && total === 0 && (
              <Button asChild variant="outline" className="mt-4">
                <Link to="/patrimoine">{t('recherche.parcourir', 'Parcourir le patrimoine')}</Link>
              </Button>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
