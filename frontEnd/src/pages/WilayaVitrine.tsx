/**
 * Page d'une wilaya (/wilayas/:id) : les personnes qui y vivent, leurs œuvres, et ce qui s'y passe.
 * Sans numéro (/wilayas) : la liste des wilayas. Une section vide n'est pas affichée.
 */
import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSkeleton } from '@/components/shared';
import { ItemCard, ItemGrid } from '@/components/shared/ItemCard';
import OrganisationCard from '@/components/organisations/OrganisationCard';
import type { OrganisationAnnuaire } from '@/components/organisations/categoriesOrganisation';
import { nomWilaya } from '@/components/gastronomie/PlatCard';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { evenementPath, professionnelPath } from '@/utils/slug';
import { libelleRole } from '@/utils/rolesOeuvre';
import { partiesEvenement } from '@/utils/dateHeureEvenement';
import { wilayaVitrineService, lienOeuvre, type OeuvreCarte, type PersonneWilaya } from '@/services/wilayaVitrine.service';
import { idFromSlug, wilayaPath } from '@/utils/slug';

const Section: React.FC<{ titre: string; total: number; affiches: number; children: React.ReactNode }> = ({ titre, total, affiches, children }) => {
  const { t } = useTranslation();
  if (!total) return null;
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4">{titre} <span className="text-muted-foreground font-normal text-base">({total})</span></h2>
      {children}
      {total > affiches && (
        <p className="text-sm text-muted-foreground mt-3">{t('wilaya.autres', '{{n}} affichés sur {{total}}', { n: affiches, total })}</p>
      )}
    </section>
  );
};

/** Personnes regroupées par métier : Écrivains, Artisans, Artistes… */
const parMetier = (personnes: PersonneWilaya[]) => {
  const groupes = new Map<number, PersonneWilaya[]>();
  for (const p of personnes) groupes.set(p.id_type_user, [...(groupes.get(p.id_type_user) || []), p]);
  return [...groupes.values()].sort((a, b) => b.length - a.length);
};

const CartesOeuvres: React.FC<{ oeuvres: OeuvreCarte[]; lang: string }> = ({ oeuvres, lang }) => (
  <ItemGrid>
    {oeuvres.map(o => (
      <ItemCard key={o.id_oeuvre} to={lienOeuvre(o)} title={getLocalizedText(o.titre as never, lang)} image={o.image} />
    ))}
  </ItemGrid>
);

/** Panne ou réseau coupé : on ne dit pas que la wilaya n'existe pas, et on propose de réessayer */
const ErreurChargement: React.FC<{ onReessayer: () => void }> = ({ onReessayer }) => {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16">
      <p className="mb-4">{t('wilaya.erreurChargement', 'Cette page n’a pas pu être chargée. Vérifiez votre connexion.')}</p>
      <Button onClick={onReessayer}>{t('wilaya.reessayer', 'Réessayer')}</Button>
    </div>
  );
};

const ListeWilayas: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['wilayas-liste'], queryFn: wilayaVitrineService.wilayas, staleTime: 60 * 60 * 1000 });
  return (
    <>
      <SEOHead title={t('wilaya.toutes', 'Les wilayas')} description={t('wilaya.toutesAide', 'Les écrivains, artisans, œuvres, événements et lieux de chaque wilaya d’Algérie.')} />
      <h1 className="text-3xl font-bold mb-2">{t('wilaya.toutes', 'Les wilayas')}</h1>
      <p className="text-muted-foreground mb-6">{t('wilaya.toutesAide', 'Les écrivains, artisans, œuvres, événements et lieux de chaque wilaya d’Algérie.')}</p>
      {isError ? <ErreurChargement onReessayer={() => refetch()} /> : isLoading ? <LoadingSkeleton /> : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {(data || []).map(w => (
            <li key={w.id_wilaya}>
              <Link to={`/wilayas/${w.id_wilaya}`} className="block rounded-lg border p-3 hover:bg-accent transition-colors">
                {nomWilaya(w, i18n.language)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const FicheWilaya: React.FC<{ id: number }> = ({ id }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['wilaya-vitrine', id], queryFn: () => wilayaVitrineService.vitrine(id) });
  // Adresse lisible et partageable : /wilayas/16 -> /wilayas/16-alger
  const naviguerVersCanonique = useNavigate();
  const { id: brut } = useParams();
  useEffect(() => {
    const w = data?.wilaya as { wilaya_name_ascii?: string; nom?: unknown } | undefined;
    if (!w) return;
    const canonique = wilayaPath(id, w.wilaya_name_ascii || w.nom);
    if (`/wilayas/${brut}` !== canonique) naviguerVersCanonique(canonique + window.location.search + window.location.hash, { replace: true });
  }, [data, id, brut, naviguerVersCanonique]);

  if (isLoading) return <LoadingSkeleton />;
  if (isError && (error as { status?: number }).status !== 404) return <ErreurChargement onReessayer={() => refetch()} />;
  if (isError || !data) {
    return (
      <div className="text-center py-16">
        <p className="mb-4">{t('wilaya.introuvable', 'Cette wilaya est introuvable.')}</p>
        <Link to="/wilayas" className="text-primary hover:underline">{t('wilaya.toutes', 'Les wilayas')}</Link>
      </div>
    );
  }

  const nom = nomWilaya(data.wilaya, lang);
  const vide = !data.professionnels.total && !data.oeuvres.total && !data.articles.total && !data.artisanat.total
    && !data.evenements.total && !data.lieux.total && !data.organisations.total;

  return (
    <>
      <SEOHead title={nom} description={t('wilaya.description', 'Écrivains, artisans, œuvres, événements et lieux de la wilaya de {{nom}}.', { nom })} noindex={vide} />
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <MapPin className="h-7 w-7 text-primary shrink-0" aria-hidden="true" />{nom}
      </h1>
      <p className="text-muted-foreground mb-8">
        <Link to="/wilayas" className="hover:underline">{t('wilaya.toutes', 'Les wilayas')}</Link>
      </p>

      {vide && <Card><CardContent className="py-10 text-center text-muted-foreground">{t('wilaya.vide', 'Rien n’est encore publié pour cette wilaya.')}</CardContent></Card>}

      {parMetier(data.professionnels.liste).map(groupe => {
        const code = getLocalizedText(groupe[0].TypeUser?.nom_type as never, 'fr');
        return (
          <Section key={groupe[0].id_type_user} titre={code ? libelleRole(t, code) : t('wilaya.professionnels', 'Professionnels')} total={groupe.length} affiches={groupe.length}>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupe.map(p => {
                const prenom = getLocalizedText(p.prenom as never, lang);
                const nomPersonne = getLocalizedText(p.nom as never, lang);
                return (
                  <li key={p.id_user}>
                    <Link to={professionnelPath(p.id_user, prenom, nomPersonne)} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={p.photo_url ? getAssetUrl(p.photo_url, { width: 96 }) : undefined} alt="" />
                        <AvatarFallback>{(prenom || nomPersonne || '?').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium min-w-0 break-words" dir="auto">{[prenom, nomPersonne].filter(Boolean).join(' ')}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
      {data.professionnels.total > data.professionnels.liste.length && (
        <p className="text-sm text-muted-foreground mb-10">{t('wilaya.autres', '{{n}} affichés sur {{total}}', { n: data.professionnels.liste.length, total: data.professionnels.total })}</p>
      )}

      <Section titre={t('wilaya.oeuvres', 'Œuvres de ces auteurs')} total={data.oeuvres.total} affiches={data.oeuvres.liste.length}>
        <CartesOeuvres oeuvres={data.oeuvres.liste} lang={lang} />
      </Section>
      <Section titre={t('wilaya.artisanat', 'Artisanat')} total={data.artisanat.total} affiches={data.artisanat.liste.length}>
        <CartesOeuvres oeuvres={data.artisanat.liste} lang={lang} />
      </Section>
      <Section titre={t('wilaya.articles', 'Articles')} total={data.articles.total} affiches={data.articles.liste.length}>
        <CartesOeuvres oeuvres={data.articles.liste} lang={lang} />
      </Section>
      <Section titre={t('wilaya.evenements', 'Événements à venir')} total={data.evenements.total} affiches={data.evenements.liste.length}>
        <ItemGrid>
          {data.evenements.liste.map(e => (
            <ItemCard key={e.id_evenement} to={evenementPath(e.id_evenement, e.nom_evenement)} title={getLocalizedText(e.nom_evenement as never, lang)}
              image={e.image_url} subtitle={partiesEvenement(e.date_debut).date || undefined} />
          ))}
        </ItemGrid>
      </Section>
      <Section titre={t('wilaya.lieux', 'Lieux')} total={data.lieux.total} affiches={data.lieux.liste.length}>
        <ItemGrid>
          {data.lieux.liste.map(l => (
            <ItemCard key={l.id_lieu} to={`/patrimoine/${l.id_lieu}`} title={getLocalizedText(l.nom as never, lang)} image={l.image}
              subtitle={(lang.startsWith('ar') && l.Commune?.nom) || l.Commune?.commune_name_ascii || undefined} />
          ))}
        </ItemGrid>
      </Section>
      <Section titre={t('wilaya.organisations', 'Associations et organisations')} total={data.organisations.total} affiches={data.organisations.liste.length}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.organisations.liste.map(o => (
            <OrganisationCard key={String(o.id_organisation)} organisation={o as unknown as OrganisationAnnuaire} />
          ))}
        </div>
      </Section>
    </>
  );
};

const WilayaVitrine: React.FC = () => {
  const { id } = useParams();
  const numero = idFromSlug(id) ?? NaN;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {id && Number.isInteger(numero) && numero > 0 ? <FicheWilaya id={numero} /> : <ListeWilayas />}
      </main>
      <Footer />
    </div>
  );
};

export default WilayaVitrine;
