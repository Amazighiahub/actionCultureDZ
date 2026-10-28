/**
 * Portfolio public d'un professionnel : /professionnels/:id-prenom-nom
 * Profil, biographie, liens, et ses contenus publiés (œuvres, articles, artisanat,
 * événements, services). Le propriétaire voit les boutons de partage sur ses réseaux.
 */
import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { MapPin, Mail, Phone, Pencil, BookOpen, FileText, Hammer, CalendarDays, Briefcase, UserX, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PortfolioQRCode from '@/components/user/PortfolioQRCode';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead, { SITE_URL } from '@/components/SEOHead';
import SocialLinks, { type SocialLinksValue } from '@/components/shared/SocialLinks';
import ShareButtons from '@/components/shared/ShareButtons';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { httpClient } from '@/services/httpClient';
import { getAssetUrl } from '@/helpers/assetUrl';
import { useAuth } from '@/hooks/useAuth';
import { useFormatDate } from '@/hooks/useFormatDate';
import { idFromSlug, professionnelPath, evenementPath } from '@/utils/slug';
import { ListeArticlesPresse, lireArticlesPresse } from '@/components/shared/ArticlesPresse';
import { ItemCard, ItemGrid as Grid, firstImage, type MediaItem } from '@/components/shared/ItemCard';

// Types d'œuvres « articles » (page /articles/:id)
const ARTICLE_TYPES = [4, 5];

interface PortfolioOeuvre {
  id_oeuvre: number;
  titre: string;
  id_type_oeuvre: number;
  annee_creation?: number | null;
  TypeOeuvre?: { nom_type: string };
  Media?: MediaItem[];
}
interface Portfolio {
  profil: {
    id_user: number;
    nom: string;
    prenom: string;
    photo_url?: string | null;
    entreprise?: string | null;
    biographie?: string | null;
    specialites?: string[] | string | null;
    site_web?: string | null;
    reseaux_sociaux?: SocialLinksValue;
    articles_presse?: unknown;
    email?: string | null;
    telephone?: string | null;
    TypeUser?: { nom_type: string };
    Commune?: { nom: string; Daira?: { nom: string; Wilaya?: { nom: string } } } | null;
  };
  oeuvres: PortfolioOeuvre[];
  artisanats: Array<{ id_artisanat: number; prix?: number | null; Oeuvre: { titre: string; Media?: MediaItem[] } }>;
  evenements: Array<{ id_evenement: number; nom_evenement: string; date_debut?: string; date_fin?: string; image_url?: string | null; statut: string }>;
  services: Array<{ id: number; nom: string; type_service?: string; description?: string | null; photo_url?: string | null }>;
  /** Vrai si le visiteur connecté est le professionnel lui-même */
  estProprietaire?: boolean;
}

const ProfessionnelPortfolio: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useLocalizedNumber();
  const { id: param } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatDate } = useFormatDate();
  const id = idFromSlug(param);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio', id, i18n.language],
    enabled: id != null,
    retry: false,
    queryFn: async (): Promise<Portfolio> => {
      const response = await httpClient.get<Portfolio>(`/users/professionals/${id}/portfolio`);
      if (!response.success || !response.data) throw new Error(response.error || 'not found');
      return response.data;
    },
  });

  const profil = data?.profil;
  const fullName = profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '';
  const canonicalPath = profil ? professionnelPath(profil.id_user, profil.prenom, profil.nom) : null;

  // Adresse canonique : /professionnels/17 ou un ancien nom -> /professionnels/17-prenom-nom
  useEffect(() => {
    if (canonicalPath && param && `/professionnels/${param}` !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
    }
  }, [canonicalPath, param, navigate]);

  const isOwner = !!data?.estProprietaire || (!!user && !!profil && Number(user.id_user) === Number(profil.id_user));

  const specialites = useMemo(() => {
    const raw = profil?.specialites;
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(String) : [raw]; } catch { return raw ? [raw] : []; }
    }
    return [];
  }, [profil?.specialites]);

  const works = (data?.oeuvres || []).filter((o) => !ARTICLE_TYPES.includes(o.id_type_oeuvre));
  const articles = (data?.oeuvres || []).filter((o) => ARTICLE_TYPES.includes(o.id_type_oeuvre));
  const location = [profil?.Commune?.nom, profil?.Commune?.Daira?.Wilaya?.nom].filter(Boolean).join(', ');
  const typeLabel = profil?.TypeUser?.nom_type
    ? t(`auth.sectors.${profil.TypeUser.nom_type}`, profil.TypeUser.nom_type)
    : '';

  if (id == null || isError) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title={t('portfolio.notFound', 'Profil introuvable')} noindex />
        <Header />
        <main className="container py-24 text-center">
          <UserX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">{t('portfolio.notFound', 'Profil introuvable')}</h1>
          <p className="text-muted-foreground mb-6">{t('portfolio.notFoundHint', "Ce profil n'existe pas ou n'est pas public.")}</p>
          <Button asChild><Link to="/">{t('common.backToHome', "Retour à l'accueil")}</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading || !profil || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-24 space-y-6" role="status">
          <span className="sr-only">{t('common.loading', 'Chargement...')}</span>
          <div className="flex items-center gap-6">
            <Skeleton className="h-28 w-28 rounded-full" />
            <div className="space-y-3 flex-1"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
          </div>
          <Skeleton className="h-40 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  const pageUrl = `${SITE_URL}${canonicalPath}`;
  const tabs = [
    { key: 'oeuvres', label: t('portfolio.tabs.works', 'Œuvres'), icon: BookOpen, count: works.length },
    { key: 'articles', label: t('portfolio.tabs.articles', 'Articles'), icon: FileText, count: articles.length },
    { key: 'artisanat', label: t('portfolio.tabs.crafts', 'Artisanat'), icon: Hammer, count: data.artisanats.length },
    { key: 'evenements', label: t('portfolio.tabs.events', 'Événements'), icon: CalendarDays, count: data.evenements.length },
    { key: 'services', label: t('portfolio.tabs.services', 'Services'), icon: Briefcase, count: data.services.length },
  ].filter((tab) => tab.count > 0);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={fullName}
        description={(profil.biographie || '').replace(/\s+/g, ' ').slice(0, 160)
          || t('portfolio.seoDescription', '{{name}} — {{type}} sur Tala DZ', { name: fullName, type: typeLabel })}
        image={profil.photo_url || undefined}
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          url: pageUrl,
          mainEntity: {
            '@type': 'Person',
            name: fullName,
            jobTitle: typeLabel || undefined,
            description: profil.biographie || undefined,
            image: profil.photo_url ? getAssetUrl(profil.photo_url) : undefined,
            address: location ? { '@type': 'PostalAddress', addressLocality: location, addressCountry: 'DZ' } : undefined,
            sameAs: [profil.site_web, ...Object.values((typeof profil.reseaux_sociaux === 'object' && profil.reseaux_sociaux) || {})].filter(Boolean),
          },
        }}
      />
      <Header />

      <main id="main" className="container pt-24 pb-16 space-y-10">
        {/* En-tête du profil */}
        <section className="flex flex-col gap-6 md:flex-row md:items-start">
          <Avatar className="h-28 w-28 shrink-0 text-2xl">
            <AvatarImage src={profil.photo_url ? getAssetUrl(profil.photo_url, { width: 224 }) : undefined} alt="" />
            <AvatarFallback>{`${profil.prenom?.[0] || ''}${profil.nom?.[0] || ''}`.toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl font-bold font-serif">{fullName}</h1>
              {profil.entreprise && <p className="text-muted-foreground">{profil.entreprise}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {typeLabel && <Badge>{typeLabel}</Badge>}
              {specialites.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
            </div>
            {location && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {location}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <SocialLinks links={profil.reseaux_sociaux} website={profil.site_web} ownerName={fullName} />
              {profil.email && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`mailto:${profil.email}`}><Mail className="h-4 w-4 me-2" aria-hidden="true" />{profil.email}</a>
                </Button>
              )}
              {profil.telephone && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`tel:${profil.telephone}`}><Phone className="h-4 w-4 me-2" aria-hidden="true" />{profil.telephone}</a>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ShareButtons url={pageUrl} title={fullName} full={isOwner} />
              {isOwner && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <QrCode className="h-4 w-4 me-2" aria-hidden="true" />{t('qrcode.button', 'QR code')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader><DialogTitle>{t('qrcode.title', 'Mon QR code')}</DialogTitle></DialogHeader>
                    <PortfolioQRCode userId={profil.id_user} name={fullName} />
                  </DialogContent>
                </Dialog>
              )}
              {isOwner && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/dashboard-user"><Pencil className="h-4 w-4 me-2" aria-hidden="true" />{t('portfolio.edit', 'Modifier mon profil')}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Biographie */}
        {profil.biographie && (
          <section aria-labelledby="bio-titre" className="max-w-3xl">
            <h2 id="bio-titre" className="text-xl font-semibold mb-3">{t('portfolio.bio', 'Biographie')}</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/90">{profil.biographie}</p>
          </section>
        )}

        {/* Articles de presse (saisis dans le profil) */}
        {lireArticlesPresse(profil.articles_presse).length > 0 && (
          <section aria-labelledby="presse-titre" className="max-w-3xl">
            <h2 id="presse-titre" className="text-xl font-semibold mb-3">{t('portfolio.presse', 'Dans la presse')}</h2>
            <ListeArticlesPresse articles={lireArticlesPresse(profil.articles_presse)} siVide="" />
          </section>
        )}

        {/* Réalisations */}
        <section aria-labelledby="realisations-titre">
          <h2 id="realisations-titre" className="text-xl font-semibold mb-4">{t('portfolio.works', 'Réalisations')}</h2>
          {tabs.length === 0 ? (
            <p className="text-muted-foreground">{t('portfolio.empty', 'Aucun contenu publié pour le moment.')}</p>
          ) : (
            <Tabs defaultValue={tabs[0].key}>
              <TabsList className="flex-wrap h-auto">
                {tabs.map(({ key, label, icon: Icon, count }) => (
                  <TabsTrigger key={key} value={key} className="gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />{label}<span className="text-muted-foreground">({count})</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="oeuvres" className="mt-6">
                <Grid>
                  {works.map((o) => (
                    <ItemCard key={o.id_oeuvre} to={`/oeuvres/${o.id_oeuvre}`} title={o.titre} image={firstImage(o.Media)}
                      badge={o.TypeOeuvre?.nom_type} subtitle={o.annee_creation ? String(o.annee_creation) : undefined} />
                  ))}
                </Grid>
              </TabsContent>
              <TabsContent value="articles" className="mt-6">
                <Grid>
                  {articles.map((o) => (
                    <ItemCard key={o.id_oeuvre} to={`/articles/${o.id_oeuvre}`} title={o.titre} image={firstImage(o.Media)}
                      badge={o.TypeOeuvre?.nom_type} subtitle={o.annee_creation ? String(o.annee_creation) : undefined} />
                  ))}
                </Grid>
              </TabsContent>
              <TabsContent value="artisanat" className="mt-6">
                <Grid>
                  {data.artisanats.map((a) => (
                    <ItemCard key={a.id_artisanat} to={`/artisanat/${a.id_artisanat}`} title={a.Oeuvre.titre} image={firstImage(a.Oeuvre.Media)}
                      subtitle={a.prix ? formatPrice(Number(a.prix), undefined, false) : undefined} />
                  ))}
                </Grid>
              </TabsContent>
              <TabsContent value="evenements" className="mt-6">
                <Grid>
                  {data.evenements.map((e) => (
                    <ItemCard key={e.id_evenement} to={evenementPath(e.id_evenement, e.nom_evenement)} title={e.nom_evenement} image={e.image_url}
                      subtitle={e.date_debut ? formatDate(e.date_debut) : undefined}
                      badge={['annule', 'reporte'].includes(e.statut) ? t(`programme.form.statuses.${e.statut}`, e.statut) : undefined} />
                  ))}
                </Grid>
              </TabsContent>
              <TabsContent value="services" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {data.services.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="p-4 space-y-1">
                        <h3 className="font-semibold">{s.nom}</h3>
                        {s.type_service && <Badge variant="secondary" className="text-xs">{t(`service.types.${s.type_service}`, s.type_service)}</Badge>}
                        {s.description && <p className="text-sm text-muted-foreground line-clamp-3">{s.description}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProfessionnelPortfolio;
