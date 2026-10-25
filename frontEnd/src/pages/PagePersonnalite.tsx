/**
 * PagePersonnalite — page d'une personnalité (poète, musicien, résistant, potière…) :
 * portrait, dates, biographie, articles complets qui lui sont consacrés (éditeur avancé),
 * lieux patrimoniaux liés et œuvres. Professionnels validés et modération : « Écrire un article » ;
 * la personne qui a ajouté la fiche (ou l'administration) : « Modifier la fiche ».
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, FileText, Landmark, Loader2, Pencil, User } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import FicheIntervenantDialog from '@/components/forms/FicheIntervenantDialog';
import OeuvresPersonnalite from '@/components/patrimoine/OeuvresPersonnalite';
import PagesDetaillees from '@/components/patrimoine/PagesDetaillees';
import { httpClient } from '@/services/httpClient';
import {
  getPagePersonnalite, retirerArticlePersonnalite, lienEcrireArticlePersonnalite,
  type PagePersonnaliteData
} from '@/services/patrimoineArticles.service';
import { usePermissions } from '@/hooks/usePermissions';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getAssetUrl } from '@/helpers/assetUrl';
import { texteLangue } from '@/utils/programmeIntervenants';

const PagePersonnalite: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const idIntervenant = parseInt(id || '', 10);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { formatDate } = useFormatDate();
  const { isAuthenticated, isAdmin, hasRole, isValidatedProfessional } = usePermissions();
  const proValide = isValidatedProfessional();
  const peutEcrire = isAdmin || hasRole('Moderateur') || proValide;

  const [page, setPage] = useState<PagePersonnaliteData | null>(null);
  const [chargement, setChargement] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);
  const [peutModifier, setPeutModifier] = useState(false);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const charger = useCallback(async () => {
    if (!(idIntervenant > 0)) { setIntrouvable(true); setChargement(false); return; }
    try {
      const res = await getPagePersonnalite(idIntervenant);
      if (res.success && res.data) { setPage(res.data); setIntrouvable(false); } else setIntrouvable(true);
    } catch {
      setIntrouvable(true);
    } finally {
      setChargement(false);
    }
  }, [idIntervenant]);

  // Rechargée à la connexion : l'auteur voit aussi ses articles en attente de validation
  useEffect(() => { window.scrollTo(0, 0); charger(); }, [charger, isAuthenticated]);

  // Droit de modifier la fiche : demandé au serveur pour un professionnel ou l'administration,
  // une fois le compte chargé (la page peut s'afficher avant la fin de la connexion)
  useEffect(() => {
    setPeutModifier(false);
    if (!(idIntervenant > 0) || !(isAdmin || proValide)) return;
    let actif = true;
    httpClient.get<{ peut_modifier: boolean }>(`/intervenants/${idIntervenant}/edition`)
      .then(res => { if (actif) setPeutModifier(!!res.data?.peut_modifier); })
      .catch(() => { /* lecture seule */ });
    return () => { actif = false; };
  }, [idIntervenant, isAdmin, proValide]);

  if (chargement) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label={t('common.loading', 'Chargement')} /></div>
      </div>
    );
  }

  if (introuvable || !page) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title={t('personnalites.introuvable', 'Personnalité introuvable')} noindex />
        <Header />
        <div className="container max-w-3xl py-24 text-center space-y-4">
          <User className="h-12 w-12 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-lg">{t('personnalites.introuvable', 'Personnalité introuvable')}</p>
          <Button variant="outline" onClick={() => navigate('/patrimoine')}>{t('patrimoine.backToList', 'Retour au patrimoine')}</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const inv = page.intervenant;
  const nom = `${texteLangue(inv.prenom, lang)} ${texteLangue(inv.nom, lang)}`.trim();
  const biographie = texteLangue(inv.biographie, lang);
  const annee = (d?: string | null) => (d ? String(new Date(d).getFullYear()) : '');
  const date = (d?: string | null) => (d ? formatDate(new Date(d), { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const periodeVie = inv.date_naissance || inv.date_deces ? [annee(inv.date_naissance) || '?', annee(inv.date_deces)].filter(Boolean).join(' – ') : '';
  const naissance = [date(inv.date_naissance), inv.lieu_naissance].filter(Boolean).join(', ');
  const deces = [date(inv.date_deces), inv.lieu_deces].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={nom} description={biographie ? biographie.slice(0, 160) : inv.titre_professionnel || undefined} image={inv.photo_url || undefined} />
      <Header />

      <main>
        {/* Portrait */}
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container max-w-5xl px-4 py-10 md:py-14">
            <Button variant="ghost" size="sm" className="mb-6 -ms-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 me-1 rtl:-scale-x-100" aria-hidden="true" />{t('common.back', 'Retour')}
            </Button>
            <div className="grid gap-8 md:grid-cols-[220px_1fr] items-center">
              {inv.photo_url ? (
                <img src={getAssetUrl(inv.photo_url)} alt={nom} className="h-56 w-56 md:h-[220px] md:w-[220px] rounded-2xl object-cover shadow-lg mx-auto md:mx-0" />
              ) : (
                <div className="h-48 w-48 md:h-[220px] md:w-[220px] rounded-2xl bg-primary/10 flex items-center justify-center mx-auto md:mx-0" aria-hidden="true">
                  <span className="font-serif text-6xl text-primary/70">{nom.split(/\s+/).map(m => m[0]).slice(-2).join('')}</span>
                </div>
              )}
              <div className="text-center md:text-start space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t('personnalites.surtitre', 'Personnalité')}</p>
                <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">{nom}</h1>
                {inv.titre_professionnel && <p className="text-lg text-muted-foreground">{inv.titre_professionnel}</p>}
                {periodeVie && <p className="font-serif text-xl text-foreground/80">{periodeVie}</p>}
                <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                  {peutEcrire && (
                    <Button asChild>
                      <Link to={lienEcrireArticlePersonnalite(inv.id_intervenant)}><FileText className="h-4 w-4 me-2" aria-hidden="true" />{t('personnalites.ecrireArticle', 'Écrire un article sur cette personnalité')}</Link>
                    </Button>
                  )}
                  {peutModifier && (
                    <Button variant="outline" onClick={() => setFicheOuverte(true)}>
                      <Pencil className="h-4 w-4 me-2" aria-hidden="true" />{t('personnalites.modifierFiche', 'Modifier la fiche')}
                    </Button>
                  )}
                  {inv.wikipedia_url && (
                    <Button variant="ghost" asChild>
                      <a href={inv.wikipedia_url} target="_blank" rel="noopener noreferrer">{t('personnalites.wikipedia', 'Page Wikipédia')}<ExternalLink className="h-3 w-3 ms-1" aria-hidden="true" /></a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container max-w-5xl px-4 py-10 grid gap-12 lg:grid-cols-[1fr_300px]">
          <div className="space-y-12 min-w-0">
            {biographie && (
              <section>
                <h2 className="font-serif text-2xl font-bold mb-4">{t('personnalites.biographie', 'Biographie')}</h2>
                <p className="text-lg leading-8 text-foreground/90 whitespace-pre-line">{biographie}</p>
              </section>
            )}

            <section>
              <PagesDetaillees
                pages={page.articles}
                titre={t('personnalites.articles', 'Articles')}
                retirer={(pg) => retirerArticlePersonnalite(inv.id_intervenant, pg.id_lien)}
                onChange={charger}
              />
              {page.articles.length === 0 && peutEcrire && (
                <div className="rounded-xl border-2 border-dashed p-6 text-center text-muted-foreground">
                  <p className="mb-3">{t('personnalites.aucunArticle', 'Aucun article complet sur cette personnalité pour l’instant.')}</p>
                  <Button asChild variant="outline">
                    <Link to={lienEcrireArticlePersonnalite(inv.id_intervenant)}><FileText className="h-4 w-4 me-2" aria-hidden="true" />{t('personnalites.ecrireArticle', 'Écrire un article sur cette personnalité')}</Link>
                  </Button>
                </div>
              )}
            </section>

            <OeuvresPersonnalite idIntervenant={inv.id_intervenant} peutAjouter={peutEcrire} />
          </div>

          <aside className="space-y-6">
            {(naissance || deces) && (
              <dl className="rounded-xl border bg-card p-5 space-y-3 text-sm">
                {naissance && <div><dt className="text-muted-foreground">{t('personnalites.naissance', 'Naissance')}</dt><dd className="font-medium">{naissance}</dd></div>}
                {deces && <div><dt className="text-muted-foreground">{t('personnalites.deces', 'Décès')}</dt><dd className="font-medium">{deces}</dd></div>}
              </dl>
            )}
            {page.lieux.length > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" aria-hidden="true" />{t('personnalites.sesLieux', 'Ses lieux')}</h2>
                <ul className="space-y-3">
                  {page.lieux.map(l => (
                    <li key={l.id_lieu}>
                      <Link to={`/patrimoine/${l.id_lieu}`} className="font-medium text-primary hover:underline">{texteLangue(l.nom, lang)}</Link>
                      {(l.role_sur_site || l.periode) && <p className="text-xs text-muted-foreground">{[l.role_sur_site, l.periode].filter(Boolean).join(' · ')}</p>}
                      {l.contexte && <p className="text-sm text-muted-foreground mt-1">{l.contexte}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />

      <FicheIntervenantDialog
        idIntervenant={ficheOuverte ? inv.id_intervenant : null}
        description={t('personnalites.ficheDescription', 'Présentation affichée sur la page du site.')}
        onClose={() => setFicheOuverte(false)}
        onSaved={() => { setFicheOuverte(false); charger(); }}
      />
    </div>
  );
};

export default PagePersonnalite;
