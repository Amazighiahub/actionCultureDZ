/**
 * Annuaire des professionnels (/professionnels) : retrouver un auteur, un artisan, un écrivain…
 * Recherche par nom ; filtres par métier (?type= dans l'adresse) et par wilaya.
 * Seuls les profils publics et validés apparaissent.
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Users } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface Professionnel {
  id_user: number;
  nom: unknown;
  prenom: unknown;
  photo_url?: string;
  id_type_user: number;
  biographie?: unknown;
}

// Ni visiteur ni administrateur : ce ne sont pas des métiers
const TYPES_EXCLUS = [1, 29];
const PAR_PAGE = 24;

const Professionnels: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || 'tous';
  const [recherche, setRecherche] = useState(() => params.get('q') || '');
  const q = useDebouncedValue(recherche, 300).trim();
  const [wilaya, setWilaya] = useState('toutes');
  const [types, setTypes] = useState<TypeUser[]>([]);
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
    metadataService.getWilayas().then((r) => {
      if (r.success && Array.isArray(r.data)) setWilayas(r.data as unknown as Wilaya[]);
    }).catch(() => undefined);
  }, [lang]);

  const choisirType = (valeur: string) => {
    const suite = new URLSearchParams(params);
    if (valeur === 'tous') suite.delete('type'); else suite.set('type', valeur);
    setParams(suite, { replace: true });
  };

  // Nouvelle recherche : on repart de la première page
  useEffect(() => { setPage(1); }, [q, type, wilaya, lang]);

  useEffect(() => {
    let actif = true;
    setChargement(true);
    httpClient.get<Professionnel[]>('/users/professionals', {
      page,
      limit: PAR_PAGE,
      ...(q.length >= 2 ? { q } : {}),
      ...(type !== 'tous' ? { type } : {}),
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
  }, [q, type, wilaya, page, lang]);

  const filtres = !!recherche || type !== 'tous' || wilaya !== 'toutes';
  const effacer = () => { setRecherche(''); setWilaya('toutes'); choisirType('tous'); };
  const nomMetier = (id: number) => {
    const trouve = types.find((x) => x.id_type_user === id);
    return trouve ? getLocalizedText(trouve.nom_type) : '';
  };

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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">{t('professionnels.titre', 'Professionnels de la culture')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('professionnels.sousTitre', 'Retrouvez un auteur, un artisan, un écrivain, un artiste ou un chercheur, et découvrez son travail.')}
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label={t('professionnels.rechercher', 'Rechercher par nom…')}
                  placeholder={t('professionnels.rechercher', 'Rechercher par nom…')}
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={type} onValueChange={choisirType}>
                <SelectTrigger className="md:w-[220px]" aria-label={t('professionnels.metier', 'Métier')}>
                  <SelectValue placeholder={t('professionnels.metier', 'Métier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">{t('professionnels.tousMetiers', 'Tous les métiers')}</SelectItem>
                  {types.map((x) => <SelectItem key={x.id_type_user} value={String(x.id_type_user)}>{getLocalizedText(x.nom_type)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={wilaya} onValueChange={setWilaya}>
                <SelectTrigger className="md:w-[220px]" aria-label={t('gastronomie.wilaya', 'Wilaya')}>
                  <SelectValue placeholder={t('gastronomie.wilaya', 'Wilaya')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">{t('gastronomie.toutesWilayas', 'Toutes les wilayas')}</SelectItem>
                  {wilayas.map((w) => <SelectItem key={w.id_wilaya} value={String(w.id_wilaya)}>{nomWilaya(w, lang)}</SelectItem>)}
                </SelectContent>
              </Select>
              {filtres && (
                <Button variant="ghost" size="icon" onClick={effacer} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <ErrorBoundary>
          {chargement && page === 1 ? (
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
                            {metier && <Badge variant="secondary" className="mt-1 capitalize">{metier}</Badge>}
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
