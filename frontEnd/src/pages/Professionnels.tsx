/**
 * Annuaire des professionnels (/professionnels) : retrouver un auteur, un artisan, un écrivain…
 * La page ne montre que la recherche et ses filtres (choix de la responsable du site) : les
 * professionnels apparaissent dès qu'on tape un nom ou un métier (2 lettres au moins), ou qu'on
 * choisit un métier (?type= dans l'adresse) ou une wilaya. Seuls les profils publics et validés.
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { nomWilaya, type Wilaya } from '@/components/gastronomie/PlatCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { httpClient } from '@/services/httpClient';
import { metadataService } from '@/services/metadata.service';
import type { TypeUser } from '@/types/models/type-user.types';
import { libelleRole } from '@/utils/rolesOeuvre';

interface Professionnel {
  id_user: number;
  nom: unknown;
  prenom: unknown;
  photo_url?: string;
  id_type_user: number;
  biographie?: unknown;
}

interface TypeOrganisation { id_type_organisation: number; nom: unknown }

// Ni visiteur ni administrateur : ce ne sont pas des métiers
const TYPES_EXCLUS = [1, 29];
const PAR_PAGE = 24;
const OFFRES = ['oeuvres', 'evenements', 'services'] as const;

/** Liste « 3,7 » lue dans l'adresse (?types=, ?organisations=, ?propose=) */
const lireListe = (valeur: string | null) => (valeur ? valeur.split(',').filter(Boolean) : []);

/** Un groupe de cases à cocher (plusieurs choix possibles) */
const GroupeCases: React.FC<{
  titre: string; nom: string; choix: Array<{ valeur: string; libelle: string }>;
  coches: string[]; basculer: (valeur: string) => void;
}> = ({ titre, nom, choix, coches, basculer }) => (
  <fieldset className="min-w-0">
    <legend className="mb-2 text-sm font-semibold">{titre}</legend>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {choix.map((c) => {
        const id = `filtre-${nom}-${c.valeur}`;
        return (
          <label key={c.valeur} htmlFor={id} className="flex items-center gap-2 min-h-[36px] cursor-pointer text-sm">
            <Checkbox id={id} checked={coches.includes(c.valeur)} onCheckedChange={() => basculer(c.valeur)} />
            <span className="[overflow-wrap:anywhere]">{c.libelle}</span>
          </label>
        );
      })}
    </div>
  </fieldset>
);

const Professionnels: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  // Choix gardés dans l'adresse : une recherche filtrée peut être partagée. L'ancien ?type=3 reste lu.
  const metiers = lireListe(params.get('types') || params.get('type'));
  const organisations = lireListe(params.get('organisations'));
  const offres = lireListe(params.get('propose')).filter((o) => (OFFRES as readonly string[]).includes(o));
  const wilaya = params.get('wilaya') || 'toutes';
  const [recherche, setRecherche] = useState(() => params.get('q') || '');
  const q = useDebouncedValue(recherche, 300).trim();
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [types, setTypes] = useState<TypeUser[]>([]);
  const [typesOrganisation, setTypesOrganisation] = useState<TypeOrganisation[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [liste, setListe] = useState<Professionnel[]>([]);
  const [page, setPage] = useState(1);
  const [encore, setEncore] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    metadataService.getTypesUsers().then((r) => {
      if (r.success && Array.isArray(r.data)) setTypes(r.data.filter((x) => !TYPES_EXCLUS.includes(x.id_type_user)));
    }).catch(() => undefined);
    metadataService.getTypesOrganisations().then((r) => {
      if (r.success && Array.isArray(r.data)) setTypesOrganisation(r.data as TypeOrganisation[]);
    }).catch(() => undefined);
    metadataService.getWilayas().then((r) => {
      if (r.success && Array.isArray(r.data)) setWilayas(r.data as unknown as Wilaya[]);
    }).catch(() => undefined);
  }, [lang]);

  /** Met à jour un choix dans l'adresse (liste vide ou valeur par défaut : retiré) */
  const ecrire = (cle: string, valeur: string | string[]) => {
    const suite = new URLSearchParams(params);
    if (cle === 'types') suite.delete('type');
    const texte = Array.isArray(valeur) ? valeur.join(',') : valeur;
    if (!texte || texte === 'toutes') suite.delete(cle); else suite.set(cle, texte);
    setParams(suite, { replace: true });
  };
  const basculer = (cle: string, actuels: string[]) => (valeur: string) =>
    ecrire(cle, actuels.includes(valeur) ? actuels.filter((v) => v !== valeur) : [...actuels, valeur]);

  const nbFiltres = metiers.length + organisations.length + offres.length;
  // Recherche lancée : un nom ou un métier (2 lettres au moins), une case cochée ou une wilaya
  const rechercheActive = q.length >= 2 || nbFiltres > 0 || wilaya !== 'toutes';
  const cleRecherche = [q, metiers.join(','), organisations.join(','), offres.join(','), wilaya].join('|');

  // Nouvelle recherche : on repart de la première page
  useEffect(() => { setPage(1); }, [cleRecherche, lang]);

  useEffect(() => {
    // Rien de demandé : pas de liste (la page n'affiche que la recherche)
    if (!rechercheActive) { setListe([]); setEncore(false); setErreur(false); setChargement(false); return undefined; }
    let actif = true;
    setChargement(true);
    httpClient.get<Professionnel[]>('/users/professionals', {
      page,
      limit: PAR_PAGE,
      ...(q.length >= 2 ? { q } : {}),
      ...(metiers.length ? { types: metiers.join(',') } : {}),
      ...(organisations.length ? { typesOrganisation: organisations.join(',') } : {}),
      ...(offres.length ? { propose: offres.join(',') } : {}),
      ...(wilaya !== 'toutes' ? { wilaya } : {}),
    }).then((res) => {
      if (!actif) return;
      const reçus = res.success && Array.isArray(res.data) ? res.data : [];
      setListe((avant) => (page === 1 ? reçus : [...avant, ...reçus]));
      setEncore(reçus.length === PAR_PAGE);
      setErreur(!res.success);
    }).catch(() => { if (actif) setErreur(true); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleRecherche résume la recherche, les cases cochées et la wilaya
  }, [cleRecherche, page, lang, rechercheActive]);

  const effacer = () => {
    setRecherche('');
    const suite = new URLSearchParams(params);
    ['type', 'types', 'organisations', 'propose', 'wilaya', 'q'].forEach((c) => suite.delete(c));
    setParams(suite, { replace: true });
  };
  // Métiers : codes (« directeur_photo ») traduits par libelleRole, comme les rôles des œuvres
  const nomMetier = (id: number) => {
    const trouve = types.find((x) => x.id_type_user === id);
    return trouve ? libelleRole(t, String(trouve.nom_type)) : '';
  };
  const choixMetiers = types
    .map((x) => ({ valeur: String(x.id_type_user), libelle: libelleRole(t, String(x.nom_type)), autre: String(x.nom_type) === 'autre' }))
    .sort((a, b) => Number(a.autre) - Number(b.autre) || a.libelle.localeCompare(b.libelle, lang));

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('professionnels.titre', 'Professionnels de la culture')}
        description={t('professionnels.sousTitre', 'Retrouvez un auteur, un artisan, un écrivain, un artiste ou un chercheur, et découvrez son travail.')}
        type="website"
        keywords={['écrivain algérien', 'artisan algérien', 'artiste algérien', 'auteur', 'culture']}
      />
      <Header />

      <main id="main" className="container pt-24 pb-16">
        <h1 className="text-3xl font-bold tracking-tight font-serif mb-6 text-center">{t('professionnels.titre', 'Professionnels de la culture')}</h1>

        <Card className="mb-8">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  role="searchbox"
                  inputMode="search"
                  enterKeyHint="search"
                  aria-label={t('professionnels.rechercher', 'Rechercher un nom ou un métier…')}
                  placeholder={t('professionnels.rechercher', 'Rechercher un nom ou un métier…')}
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={wilaya} onValueChange={(v) => ecrire('wilaya', v)}>
                <SelectTrigger className="md:w-[220px]" aria-label={t('gastronomie.wilaya', 'Wilaya')}>
                  <SelectValue placeholder={t('gastronomie.wilaya', 'Wilaya')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">{t('gastronomie.toutesWilayas', 'Toutes les wilayas')}</SelectItem>
                  {wilayas.map((w) => <SelectItem key={w.id_wilaya} value={String(w.id_wilaya)}>{nomWilaya(w, lang)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={panneauOuvert || nbFiltres ? 'secondary' : 'outline'}
                onClick={() => setPanneauOuvert((o) => !o)}
                aria-expanded={panneauOuvert}
                aria-controls="filtres-professionnels"
                className="gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {t('professionnels.filtres', 'Filtres')}
                {nbFiltres > 0 && <Badge className="ms-1 h-5 min-w-5 px-1.5">{nbFiltres}</Badge>}
              </Button>
            </div>

            {panneauOuvert && (
              <div id="filtres-professionnels" className="grid gap-6 border-t pt-4 lg:grid-cols-3">
                <GroupeCases
                  titre={t('professionnels.metiers', 'Métiers')}
                  nom="metier"
                  choix={choixMetiers}
                  coches={metiers}
                  basculer={basculer('types', metiers)}
                />
                <GroupeCases
                  titre={t('professionnels.typesOrganisation', 'Organisation ou association')}
                  nom="organisation"
                  choix={typesOrganisation.map((x) => ({ valeur: String(x.id_type_organisation), libelle: getLocalizedText(x.nom) }))}
                  coches={organisations}
                  basculer={basculer('organisations', organisations)}
                />
                <GroupeCases
                  titre={t('professionnels.propose', 'Ce qu’ils proposent')}
                  nom="offre"
                  choix={[
                    { valeur: 'oeuvres', libelle: t('professionnels.offres.oeuvres', 'Des œuvres publiées') },
                    { valeur: 'evenements', libelle: t('professionnels.offres.evenements', 'Des événements') },
                    { valeur: 'services', libelle: t('professionnels.offres.services', 'Des services (visites, ateliers…)') },
                  ]}
                  coches={offres}
                  basculer={basculer('propose', offres)}
                />
              </div>
            )}

            {(rechercheActive || recherche) && (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={effacer} className="gap-1">
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t('common.resetFilters', 'Réinitialiser les filtres')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ErrorBoundary>
          {!rechercheActive ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <Search className="h-10 w-10 mx-auto opacity-60" aria-hidden="true" />
              <p className="text-lg">{t('professionnels.invitation', 'Tapez un nom ou un métier, ou choisissez une wilaya ou des filtres, pour trouver un professionnel.')}</p>
            </div>
          ) : chargement && page === 1 ? (
            <LoadingSkeleton type="card" count={6} />
          ) : erreur ? (
            <Card className="p-8 text-center"><p className="text-destructive">{t('common.loadError', 'Erreur de chargement')}</p></Card>
          ) : liste.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="text-lg font-medium">{t('professionnels.aucun', 'Aucun professionnel ne correspond à votre recherche')}</p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {liste.map((p) => {
                  const prenom = getLocalizedText(p.prenom);
                  const nom = getLocalizedText(p.nom);
                  const metier = nomMetier(p.id_type_user);
                  const bio = getLocalizedText(p.biographie);
                  return (
                    <Link key={p.id_user} to={`/professionnels/${p.id_user}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <CardContent className="flex items-start gap-4 p-4">
                          <Avatar className="h-16 w-16 shrink-0">
                            <AvatarImage src={p.photo_url ? getAssetUrl(p.photo_url, { width: 128 }) : undefined} alt="" />
                            <AvatarFallback>{`${prenom[0] || ''}${nom[0] || ''}`.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-lg [overflow-wrap:anywhere]">{prenom} {nom}</h2>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {metier && <Badge variant="secondary">{metier}</Badge>}
                              {(Array.isArray((p as unknown as { specialites?: unknown }).specialites) ? (p as unknown as { specialites: unknown[] }).specialites : [])
                                .filter((s): s is string => typeof s === 'string').slice(0, 3)
                                .map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                            </div>
                            {bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2 [overflow-wrap:anywhere]">{bio}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
              {encore && (
                <div className="mt-8 text-center">
                  <Button variant="outline" disabled={chargement} onClick={() => setPage((n) => n + 1)}>
                    {t('common.loadMore', 'Voir plus')}
                  </Button>
                </div>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default Professionnels;
