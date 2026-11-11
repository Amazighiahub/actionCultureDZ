/**
 * Page « introuvable » commune aux fiches (lieu, œuvre, événement, artisanat) et aux adresses inconnues.
 *
 * Avant, quatre comportements différents : un lieu retiré affichait « Erreur de connexion au serveur »
 * (on réessayait en vain), une œuvre absente laissait 7 s de chargement, l'artisanat disait « Erreur
 * lors du chargement », et aucune n'avait de titre principal (h1) ni de bouton « Réessayer » (audit V11 UX-7).
 *
 * Deux cas seulement :
 * - le contenu n'existe pas ou n'est plus publié (réponse 404, 403, ou aucune donnée) : lien vers la liste ;
 * - le serveur n'a pas pu répondre (réseau coupé, délai, erreur serveur) : « Réessayer ».
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Search, WifiOff } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Vrai si l'erreur dit « pas là » (et non « pas pu répondre ») ; pas d'erreur = pas de données = introuvable */
export function estIntrouvable(erreur: unknown): boolean {
  if (!erreur) return true;
  const e = erreur as { status?: number; code?: string; response?: { status?: number } };
  const statut = e.status ?? e.response?.status;
  // Réponse du serveur : un refus (4xx) dit « pas là », sauf délai (408) et trop de demandes (429)
  if (typeof statut === 'number') return statut >= 400 && statut < 500 && statut !== 408 && statut !== 429;
  // Sans statut : réseau coupé ou délai dépassé ; sinon une réponse « success: false », donc un refus
  return !['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(String(e.code));
}

interface Props {
  /** Erreur reçue (HttpError, réponse d'échec) ; absente si le serveur n'a rien renvoyé */
  erreur?: unknown;
  /** Titre quand le contenu n'existe pas (« Œuvre non trouvée ») */
  titre: string;
  /** Explication sous le titre ; par défaut « … n'existe pas ou n'est plus publié » */
  message?: string;
  /** Lien vers la liste de la rubrique */
  lienListe: { to: string; libelle: string };
  /** Relance le chargement (bouton « Réessayer », seulement quand le serveur n'a pas pu répondre) */
  onReessayer?: () => void;
  /** Grand « 404 » décoratif (page d'une adresse inconnue) */
  grand404?: boolean;
}

export default function ContenuIntrouvable({ erreur, titre, message, lienListe, onReessayer, grand404 = false }: Props) {
  const { t } = useTranslation();
  const introuvable = estIntrouvable(erreur);
  const titreAffiche = introuvable ? titre : t('introuvable.connexionTitre', 'Chargement impossible');
  const texte = introuvable
    ? (message || t('introuvable.message', 'Ce contenu n’existe pas ou n’est plus publié.'))
    : t('introuvable.connexionMessage', 'La page n’a pas pu être chargée. Vérifiez votre connexion, puis réessayez.');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Exclue de l'index (sinon page vide indexée) */}
      <SEOHead title={titreAffiche} description={texte} noindex />
      <Header />
      <main className="flex-1 container flex items-center justify-center py-12">
        <Card className="max-w-lg w-full text-center shadow-sm">
          <CardContent className="pt-10 pb-8 px-6 sm:px-8">
            <div className="relative mb-6" aria-hidden="true">
              {grand404 && introuvable && (
                <span className="block text-[110px] sm:text-[140px] font-bold text-primary/10 leading-none select-none">404</span>
              )}
              <div className={grand404 && introuvable ? 'absolute inset-0 flex items-center justify-center' : 'flex justify-center'}>
                {introuvable
                  ? <Search className="h-14 w-14 text-primary/60" />
                  : <WifiOff className="h-14 w-14 text-muted-foreground" />}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif mb-3">{titreAffiche}</h1>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">{texte}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!introuvable && onReessayer && (
                <Button onClick={onReessayer} className="min-h-[44px]">
                  <RefreshCw className="h-4 w-4 me-2" />
                  {t('common.retry', 'Réessayer')}
                </Button>
              )}
              <Button variant={introuvable ? 'default' : 'outline'} className="min-h-[44px]" asChild>
                <Link to={lienListe.to}>
                  <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />
                  {lienListe.libelle}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
