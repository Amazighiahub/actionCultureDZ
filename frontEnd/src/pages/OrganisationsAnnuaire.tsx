/**
 * Annuaire des organisations (/organisations) : associations, maisons d'édition, musées,
 * institutions… vérifiées par l'équipe. Filtres : famille (?categorie=edition depuis le menu),
 * wilaya, texte.
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Building } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import OrganisationCard from '@/components/organisations/OrganisationCard';
import { CATEGORIES_ORGANISATION, styleCategorie, type OrganisationAnnuaire } from '@/components/organisations/categoriesOrganisation';
import { nomWilaya, type Wilaya } from '@/components/gastronomie/PlatCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';

const OrganisationsAnnuaire: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();
  const categorie = (CATEGORIES_ORGANISATION as readonly string[]).includes(params.get('categorie') || '') ? params.get('categorie')! : 'toutes';
  const [recherche, setRecherche] = useState('');
  const q = useDebouncedValue(recherche, 300);
  const [wilaya, setWilaya] = useState('toutes');
  const [organisations, setOrganisations] = useState<OrganisationAnnuaire[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  // La famille vit dans l'adresse : les liens du menu (« Maisons d'édition »…) l'ouvrent directement
  const choisirCategorie = (cle: string) => {
    const suite = new URLSearchParams(params);
    if (cle === 'toutes') suite.delete('categorie'); else suite.set('categorie', cle);
    setParams(suite, { replace: true });
  };

  useEffect(() => {
    let actif = true;
    setChargement(true);
    httpClient.get<{ organisations: OrganisationAnnuaire[]; categories: Record<string, number>; wilayas: Wilaya[] }>('/organisations', {
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(categorie !== 'toutes' ? { categorie } : {}),
      ...(wilaya !== 'toutes' ? { wilaya } : {})
    })
      .then(res => {
        if (!actif) return;
        setOrganisations(res.success && res.data ? res.data.organisations : []);
        if (res.success && res.data) { setCategories(res.data.categories); setWilayas(res.data.wilayas); }
        setErreur(!res.success);
      })
      .catch(() => { if (actif) setErreur(true); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [q, categorie, wilaya]);

  const filtres = recherche || categorie !== 'toutes' || wilaya !== 'toutes';
  const effacer = () => { setRecherche(''); setWilaya('toutes'); choisirCategorie('toutes'); };
  // Seules les familles présentes ont un bouton (plus celle choisie, même vide)
  const familles = CATEGORIES_ORGANISATION.filter(c => categories[c] || c === categorie);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('organisations.title', 'Organisations culturelles')}
        description={t('organisations.subtitle', 'Associations, maisons d’édition, musées et institutions qui font vivre la culture algérienne.')}
        type="website"
        keywords={['association culturelle Algérie', 'maison d’édition algérienne', 'éditeur', 'musée', 'culture']}
      />
      <Header />

      <main className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">{t('organisations.title', 'Organisations culturelles')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('organisations.subtitle', 'Associations, maisons d’édition, musées et institutions qui font vivre la culture algérienne.')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6" role="group" aria-label={t('organisations.famille', 'Type d’organisation')}>
          {['toutes', ...familles].map(cle => {
            const Icone = cle === 'toutes' ? Building : styleCategorie(cle).icon;
            const actif = categorie === cle;
            return (
              <Button key={cle} type="button" size="sm" variant={actif ? 'default' : 'outline'} aria-pressed={actif} onClick={() => choisirCategorie(cle)} className="gap-1.5">
                <Icone className="h-4 w-4" aria-hidden="true" />
                {cle === 'toutes' ? t('common.all', 'Tous') : t(`organisations.categories.${cle}`, cle)}
              </Button>
            );
          })}
        </div>

        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label={t('organisations.search', 'Rechercher une organisation…')}
                  placeholder={t('organisations.search', 'Rechercher une organisation…')}
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={wilaya} onValueChange={setWilaya}>
                <SelectTrigger className="md:w-[220px]" aria-label={t('gastronomie.wilaya', 'Wilaya')}>
                  <SelectValue placeholder={t('gastronomie.wilaya', 'Wilaya')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">{t('gastronomie.toutesWilayas', 'Toutes les wilayas')}</SelectItem>
                  {wilayas.map(w => <SelectItem key={w.id_wilaya} value={String(w.id_wilaya)}>{nomWilaya(w, lang)}</SelectItem>)}
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
          {chargement ? (
            <LoadingSkeleton type="card" count={6} />
          ) : erreur ? (
            <Card className="p-8 text-center"><p className="text-destructive">{t('common.loadError', 'Erreur de chargement')}</p></Card>
          ) : organisations.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <Building className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="text-lg font-medium">
                {filtres ? t('organisations.aucunResultat', 'Aucune organisation ne correspond à votre recherche') : t('organisations.aucune', 'Aucune organisation pour l’instant')}
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {organisations.map(o => <OrganisationCard key={o.id_organisation} organisation={o} />)}
            </div>
          )}
        </ErrorBoundary>

        {/* Inviter les organisations à créer leur page */}
        <Card className="mt-10 bg-muted/40">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-lg font-medium">{t('organisations.invitation', 'Vous représentez une association, une maison d’édition, un musée ?')}</p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {t('organisations.invitationDetail', 'Créez la page de votre organisation : vos événements et vos publications y seront réunis. Elle est publiée après vérification par l’équipe Tala DZ.')}
            </p>
            <Button asChild>
              <Link to={isAuthenticated ? '/ajouter-organisation' : '/auth'}>{t('organisations.creer', 'Créer la page de mon organisation')}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default OrganisationsAnnuaire;
