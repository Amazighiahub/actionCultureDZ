/**
 * Services aux visiteurs — sous-page du Patrimoine (/patrimoine/services) : restaurants,
 * hébergements, guides, transports… proposés par les professionnels près des lieux du patrimoine,
 * une fois validés par l'équipe. Filtres : type, wilaya, texte.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Store } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ServiceCard, { type ServiceAnnuaire } from '@/components/services/ServiceCard';
import { TYPES_SERVICE, styleTypeService } from '@/components/services/typesService';
import { nomWilaya, type Wilaya } from '@/components/gastronomie/PlatCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { httpClient } from '@/services/httpClient';

const ServicesVisiteurs: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [recherche, setRecherche] = useState('');
  const q = useDebouncedValue(recherche, 300);
  const [type, setType] = useState('tous');
  const [wilaya, setWilaya] = useState('toutes');
  const [services, setServices] = useState<ServiceAnnuaire[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    setChargement(true);
    httpClient.get<{ services: ServiceAnnuaire[]; wilayas: Wilaya[] }>('/services/annuaire', {
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(type !== 'tous' ? { type } : {}),
      ...(wilaya !== 'toutes' ? { wilaya } : {})
    })
      .then(res => {
        if (!actif) return;
        setServices(res.success && res.data ? res.data.services : []);
        if (res.success && res.data) setWilayas(res.data.wilayas);
        setErreur(!res.success);
      })
      .catch(() => { if (actif) setErreur(true); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [q, type, wilaya]);

  const filtres = recherche || type !== 'tous' || wilaya !== 'toutes';
  const effacer = () => { setRecherche(''); setType('tous'); setWilaya('toutes'); };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('servicesVisiteurs.title', 'Services aux visiteurs')}
        description={t('servicesVisiteurs.subtitle', 'Où manger, où dormir, avec qui visiter : les adresses des professionnels près des lieux du patrimoine algérien.')}
        type="website"
        keywords={['tourisme Algérie', 'guide touristique', 'hébergement', 'restaurant', 'patrimoine']}
      />
      <Header />

      <main className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">{t('servicesVisiteurs.title', 'Services aux visiteurs')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('servicesVisiteurs.subtitleShort', 'Où manger, où dormir, avec qui visiter, près des lieux du patrimoine')}
          </p>
        </div>

        {/* Types de service : un bouton par type */}
        <div className="flex flex-wrap justify-center gap-2 mb-6" role="group" aria-label={t('servicesVisiteurs.types', 'Type de service')}>
          {['tous', ...TYPES_SERVICE].map(cle => {
            const Icone = cle === 'tous' ? Store : styleTypeService(cle).icon;
            const actif = type === cle;
            return (
              <Button key={cle} type="button" size="sm" variant={actif ? 'default' : 'outline'} aria-pressed={actif} onClick={() => setType(cle)} className="gap-1.5">
                <Icone className="h-4 w-4" aria-hidden="true" />
                {cle === 'tous' ? t('common.all', 'Tous') : t(`service.types.${cle}`, cle)}
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
                  aria-label={t('servicesVisiteurs.search', 'Rechercher un service, un lieu…')}
                  placeholder={t('servicesVisiteurs.search', 'Rechercher un service, un lieu…')}
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
            <LoadingSkeleton type="card" count={8} />
          ) : erreur ? (
            <Card className="p-8 text-center"><p className="text-destructive">{t('common.loadError', 'Erreur de chargement')}</p></Card>
          ) : services.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <Store className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="text-lg font-medium">
                {filtres ? t('servicesVisiteurs.aucunResultat', 'Aucun service ne correspond à votre recherche') : t('servicesVisiteurs.aucun', 'Aucun service pour l’instant')}
              </p>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                {t('servicesVisiteurs.commentAjouter', 'Vous tenez un restaurant, un gîte, ou vous êtes guide ? Proposez votre service depuis votre tableau de bord professionnel.')}
              </p>
              {/* Page statique (public/guide) : lien classique, pas <Link> */}
              <Button asChild variant="outline">
                <a href={lang.startsWith('ar') ? '/guide/ar/service' : '/guide/service'}>{t('servicesVisiteurs.guide', 'Guide : proposer un service')}</a>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.map(s => <ServiceCard key={s.id} service={s} />)}
            </div>
          )}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default ServicesVisiteurs;
