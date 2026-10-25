/**
 * Gastronomie — sous-page de l'Artisanat (/artisanat/gastronomie) : les plats traditionnels,
 * tirés des articles écrits dans la section Gastronomie des lieux (« La rechta, le fil des jours
 * de fête » pour la Casbah d'Alger). Chaque carte mène à l'article complet ; recherche et wilaya.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, MapPin, Search, Utensils, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LazyImage, LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { httpClient } from '@/services/httpClient';
import { texteLangue } from '@/utils/programmeIntervenants';

type Texte = string | Record<string, string | undefined> | null;
interface Wilaya { id_wilaya: number; nom?: string; wilaya_name_ascii?: string; codeW?: number }
interface Plat {
  id_oeuvre: number;
  titre: Texte;
  resume: Texte;
  image: string | null;
  lieux: Array<{ id_lieu: number; nom: Texte; commune?: { nom?: string; commune_name_ascii?: string } | null; wilaya?: Wilaya | null }>;
}

const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring';

const Gastronomie: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const arabe = lang.startsWith('ar');
  const [recherche, setRecherche] = useState('');
  const q = useDebouncedValue(recherche, 300);
  const [wilaya, setWilaya] = useState('toutes');
  const [plats, setPlats] = useState<Plat[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    setChargement(true);
    httpClient.get<{ plats: Plat[]; wilayas: Wilaya[] }>('/patrimoine/gastronomie', {
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(wilaya !== 'toutes' ? { wilaya } : {})
    })
      .then(res => {
        if (!actif) return;
        setPlats(res.success && res.data ? res.data.plats : []);
        if (res.success && res.data) setWilayas(res.data.wilayas);
        setErreur(!res.success);
      })
      .catch(() => { if (actif) setErreur(true); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [q, wilaya]);

  const nomWilaya = (w?: Wilaya | null) => (w ? (arabe && w.nom) || w.wilaya_name_ascii || w.nom || '' : '');
  const filtres = recherche || wilaya !== 'toutes';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('gastronomie.title', 'Gastronomie algérienne')}
        description={t('gastronomie.subtitle', 'Les plats traditionnels d’Algérie, racontés par ceux qui les préparent : leur histoire, leurs ingrédients, les fêtes où on les sert.')}
        type="website"
        keywords={['gastronomie algérienne', 'cuisine traditionnelle', 'rechta', 'couscous', 'plats algériens']}
      />
      <Header />

      <main className="container py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight font-serif mb-4">{t('gastronomie.title', 'Gastronomie algérienne')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('gastronomie.subtitleShort', 'Les plats traditionnels, leur histoire et les fêtes où on les sert')}
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label={t('gastronomie.search', 'Rechercher un plat, un lieu…')}
                  placeholder={t('gastronomie.search', 'Rechercher un plat, un lieu…')}
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
                  {wilayas.map(w => <SelectItem key={w.id_wilaya} value={String(w.id_wilaya)}>{nomWilaya(w)}</SelectItem>)}
                </SelectContent>
              </Select>
              {filtres && (
                <Button variant="ghost" size="icon" onClick={() => { setRecherche(''); setWilaya('toutes'); }} aria-label={t('common.resetFilters', 'Réinitialiser les filtres')}>
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
          ) : plats.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <Utensils className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="text-lg font-medium">{filtres ? t('gastronomie.aucunResultat', 'Aucun plat ne correspond à votre recherche') : t('gastronomie.aucun', 'Aucun plat pour l’instant')}</p>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                {t('gastronomie.commentAjouter', 'Les plats s’ajoutent depuis la page d’un lieu : bloc « Gastronomie locale », bouton « Écrire un article ».')}
              </p>
              <Button asChild variant="outline"><Link to={arabe ? '/guide/ar/article' : '/guide/article'}><BookOpen className="h-4 w-4 me-2" aria-hidden="true" />{t('gastronomie.guide', 'Guide : écrire un article')}</Link></Button>
            </Card>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted-foreground">{t('gastronomie.compte', { defaultValue: '{{count}} plat(s)', count: plats.length })}</p>
              <h2 className="sr-only">{t('gastronomie.liste', 'Liste des plats')}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {plats.map(plat => {
                  const titre = texteLangue(plat.titre, lang);
                  const resume = texteLangue(plat.resume, lang);
                  const lieu = plat.lieux[0];
                  return (
                    <Card key={plat.id_oeuvre} className="relative overflow-hidden hover:shadow-lg transition-all group">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {plat.image ? (
                          <LazyImage src={plat.image} maxWidth={640} alt={titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" aria-hidden="true"><Utensils className="h-10 w-10 text-muted-foreground" /></div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-serif text-lg font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                          <Link to={`/articles/${plat.id_oeuvre}`} className={STRETCHED_LINK_CLASS}>{titre}</Link>
                        </h3>
                        {lieu && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {[texteLangue(lieu.nom, lang), nomWilaya(lieu.wilaya)].filter(Boolean).join(' · ')}
                              {plat.lieux.length > 1 && ` +${plat.lieux.length - 1}`}
                            </span>
                          </p>
                        )}
                        {resume && <p className="text-sm text-muted-foreground line-clamp-3">{resume}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export default Gastronomie;
