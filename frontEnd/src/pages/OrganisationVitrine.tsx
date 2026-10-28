/**
 * Page publique (vitrine) d'une organisation : /organisations/6-editions-barzakh
 * Présentation, contacts, réseaux ; ses événements, ses publications (maison d'édition), ses membres.
 * Pas encore vérifiée : visible seulement de ses membres et de l'équipe, avec un bandeau.
 */
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Mail, Phone, Pencil, BookOpen, CalendarDays, Users, Building, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead, { SITE_URL } from '@/components/SEOHead';
import SocialLinks from '@/components/shared/SocialLinks';
import ShareButtons from '@/components/shared/ShareButtons';
import { ItemCard, ItemGrid, firstImage, type MediaItem } from '@/components/shared/ItemCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { httpClient } from '@/services/httpClient';
import { getAssetUrl } from '@/helpers/assetUrl';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { idFromSlug, professionnelPath, evenementPath, organisationPath } from '@/utils/slug';
import { nomWilaya } from '@/components/gastronomie/PlatCard';
import { styleCategorie } from '@/components/organisations/categoriesOrganisation';

interface Vitrine {
  id_organisation: number;
  nom: unknown;
  description?: unknown;
  statut: 'en_attente' | 'valide' | 'rejete';
  logo_url?: string | null;
  site_web?: string | null;
  adresse?: string | null;
  email?: string | null;
  telephone?: string | null;
  reseaux?: Record<string, string> | null;
  categorie: string;
  TypeOrganisation?: { nom: unknown; code?: string | null } | null;
  Wilaya?: { id_wilaya: number; nom?: string; wilaya_name_ascii?: string } | null;
  membres: Array<{ id_user: number; nom: unknown; prenom: unknown; photo_url?: string | null; role: string }>;
  evenements: Array<{ id_evenement: number; nom_evenement: unknown; date_debut?: string; image_url?: string | null; role_organisation?: string }>;
  oeuvres: Array<{ id_oeuvre: number; titre: unknown; annee_creation?: number | null; Media?: MediaItem[] }>;
  peutModifier: boolean;
}

const OrganisationVitrine: React.FC = () => {
  const { id: param } = useParams<{ id: string }>();
  const id = idFromSlug(param);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { formatDate } = useFormatDate();

  const { data: org, isLoading, isError } = useQuery({
    queryKey: ['organisation-vitrine', id],
    queryFn: async () => {
      const res = await httpClient.get<Vitrine>(`/organisations/${id}/vitrine`);
      if (!res.success || !res.data) throw new Error('introuvable');
      return res.data;
    },
    enabled: !!id,
    retry: false
  });

  const retour = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ms-2">
      <Link to="/organisations"><ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" aria-hidden="true" />{t('organisations.title', 'Organisations culturelles')}</Link>
    </Button>
  );

  if (!id || isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-24 text-center">
          <Building className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">{t('organisations.introuvable', 'Organisation introuvable')}</h1>
          <p className="text-muted-foreground mb-6">{t('organisations.introuvableDetail', 'Cette organisation n’existe pas ou sa page n’est pas encore publiée.')}</p>
          <Button asChild><Link to="/organisations">{t('organisations.voirToutes', 'Voir toutes les organisations')}</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading || !org) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-24 space-y-6" role="status">
          <span className="sr-only">{t('common.loading', 'Chargement...')}</span>
          <div className="flex items-center gap-6">
            <Skeleton className="h-28 w-28 rounded-lg" />
            <div className="space-y-3 flex-1"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
          </div>
          <Skeleton className="h-40 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  const nom = getLocalizedText(org.nom, lang, t('common.unnamed', 'Sans nom'));
  const description = getLocalizedText(org.description, lang, '');
  const type = getLocalizedText(org.TypeOrganisation?.nom, lang, '');
  const wilaya = nomWilaya(org.Wilaya, lang);
  const style = styleCategorie(org.categorie);
  const Icone = style.icon;
  const pageUrl = `${SITE_URL}${organisationPath(org.id_organisation, org.nom)}`;
  const nomMembre = (m: Vitrine['membres'][number]) => `${getLocalizedText(m.prenom, lang, '')} ${getLocalizedText(m.nom, lang, '')}`.trim();

  const onglets = [
    { cle: 'oeuvres', libelle: t('organisations.publications', 'Publications'), icone: BookOpen, nombre: org.oeuvres.length },
    { cle: 'evenements', libelle: t('portfolio.tabs.events', 'Événements'), icone: CalendarDays, nombre: org.evenements.length },
    { cle: 'membres', libelle: t('organisations.membres', 'Membres'), icone: Users, nombre: org.membres.length },
  ].filter(o => o.nombre > 0);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={nom}
        description={description.replace(/\s+/g, ' ').slice(0, 160) || `${nom} — ${type}`}
        image={org.logo_url || undefined}
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: nom,
          url: pageUrl,
          description: description || undefined,
          logo: org.logo_url ? getAssetUrl(org.logo_url) : undefined,
          email: org.email || undefined,
          telephone: org.telephone || undefined,
          address: wilaya ? { '@type': 'PostalAddress', addressLocality: wilaya, streetAddress: org.adresse || undefined, addressCountry: 'DZ' } : undefined,
          sameAs: [org.site_web, ...Object.values(org.reseaux || {})].filter(Boolean),
        }}
      />
      <Header />

      <main id="main" className="container pt-8 pb-16 space-y-10">
        <div>{retour}</div>

        {org.statut !== 'valide' && (
          <Alert>
            <AlertDescription>
              {org.statut === 'rejete'
                ? t('organisations.refusee', 'Cette page a été refusée : corrigez-la, elle repartira en vérification.')
                : t('organisations.enAttente', 'En attente de vérification : seuls les membres de l’organisation et l’équipe Tala DZ voient cette page pour l’instant.')}
            </AlertDescription>
          </Alert>
        )}

        {/* En-tête */}
        <section className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className={`h-28 w-28 shrink-0 rounded-xl overflow-hidden flex items-center justify-center ${org.logo_url ? 'bg-white border' : style.bg}`}>
            {org.logo_url
              ? <img src={getAssetUrl(org.logo_url, { width: 224 })} alt={t('organisations.logoDe', { nom, defaultValue: 'Logo de {{nom}}' })} className="h-full w-full object-contain" />
              : <Icone className={`h-14 w-14 ${style.color}`} aria-hidden="true" />}
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold font-serif">{nom}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {type && <Badge className="gap-1"><Icone className="h-3.5 w-3.5" aria-hidden="true" />{type}</Badge>}
            </div>
            {(wilaya || org.adresse) && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />{[org.adresse, wilaya].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <SocialLinks links={org.reseaux} website={org.site_web} ownerName={nom} />
              {org.email && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`mailto:${org.email}`}><Mail className="h-4 w-4 me-2" aria-hidden="true" />{org.email}</a>
                </Button>
              )}
              {org.telephone && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`tel:${org.telephone.replace(/\s/g, '')}`}><Phone className="h-4 w-4 me-2" aria-hidden="true" />{org.telephone}</a>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ShareButtons url={pageUrl} title={nom} />
              {org.peutModifier && (
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/organisations/${org.id_organisation}/modifier`}><Pencil className="h-4 w-4 me-2" aria-hidden="true" />{t('organisations.modifier', 'Modifier la page')}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {description && (
          <section aria-labelledby="presentation-titre" className="max-w-3xl">
            <h2 id="presentation-titre" className="text-xl font-semibold mb-3">{t('organisations.presentation', 'Présentation')}</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/90" dir="auto">{description}</p>
          </section>
        )}

        <section aria-labelledby="activites-titre">
          <h2 id="activites-titre" className="text-xl font-semibold mb-4">{t('organisations.activites', 'Activités')}</h2>
          {onglets.length === 0 ? (
            <p className="text-muted-foreground">{t('portfolio.empty', 'Aucun contenu publié pour le moment.')}</p>
          ) : (
            <Tabs defaultValue={onglets[0].cle}>
              <TabsList className="flex-wrap h-auto">
                {onglets.map(({ cle, libelle, icone: I, nombre }) => (
                  <TabsTrigger key={cle} value={cle} className="gap-2">
                    <I className="h-4 w-4" aria-hidden="true" />{libelle}<span className="text-muted-foreground">({nombre})</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="oeuvres" className="mt-6">
                <ItemGrid>
                  {org.oeuvres.map(o => (
                    <ItemCard key={o.id_oeuvre} to={`/oeuvres/${o.id_oeuvre}`} title={getLocalizedText(o.titre, lang)}
                      image={firstImage(o.Media)} subtitle={o.annee_creation ? String(o.annee_creation) : undefined} />
                  ))}
                </ItemGrid>
              </TabsContent>

              <TabsContent value="evenements" className="mt-6">
                <ItemGrid>
                  {org.evenements.map(e => (
                    <ItemCard key={e.id_evenement} to={evenementPath(e.id_evenement, e.nom_evenement)} title={getLocalizedText(e.nom_evenement, lang)}
                      image={e.image_url} subtitle={e.date_debut ? formatDate(e.date_debut) : undefined}
                      badge={e.role_organisation && e.role_organisation !== 'organisateur_principal' ? t(`event.roles.${e.role_organisation}`, e.role_organisation) : undefined} />
                  ))}
                </ItemGrid>
              </TabsContent>

              <TabsContent value="membres" className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {org.membres.map(m => (
                    <Card key={m.id_user}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={m.photo_url ? getAssetUrl(m.photo_url, { width: 96 }) : undefined} alt="" />
                          <AvatarFallback>{nomMembre(m).slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link to={professionnelPath(m.id_user, getLocalizedText(m.prenom, 'fr'), getLocalizedText(m.nom, 'fr'))} className="font-medium hover:underline underline-offset-4">
                            {nomMembre(m)}
                          </Link>
                          <p className="text-sm text-muted-foreground">{t(`organisations.rolesMembre.${m.role}`, m.role)}</p>
                        </div>
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

export default OrganisationVitrine;
