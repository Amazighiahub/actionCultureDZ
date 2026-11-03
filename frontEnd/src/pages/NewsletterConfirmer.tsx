/**
 * Page ouverte depuis l'e-mail de confirmation de la newsletter. La confirmation demande un clic :
 * certaines messageries ouvrent les liens toutes seules, sans l'accord de la personne.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/services/httpClient';

export default function NewsletterConfirmer() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [etat, setEtat] = useState<'attente' | 'enCours' | 'fait' | 'erreur'>('attente');

  const confirmer = async () => {
    setEtat('enCours');
    try {
      const res = await httpClient.post<unknown>('/newsletter/confirmer', { u: params.get('u'), t: params.get('t') });
      setEtat(res.success ? 'fait' : 'erreur');
    } catch {
      setEtat('erreur');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t('newsletter.titre', 'Recevoir la newsletter')} noindex />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl text-center space-y-6">
        <h1 className="text-2xl font-bold">{t('newsletter.titre', 'Recevoir la newsletter')}</h1>
        {etat === 'fait' && <p role="status">{t('newsletter.confirmee', 'C’est fait : vous recevrez la newsletter de Tala DZ.')}</p>}
        {etat === 'erreur' && (
          <p role="alert">{t('newsletter.lienInvalide', 'Ce lien n’est plus valable. Inscrivez-vous de nouveau depuis le bas de la page.')}</p>
        )}
        {(etat === 'attente' || etat === 'enCours') && (
          <>
            <p>{t('newsletter.confirmerTexte', 'Cliquez pour confirmer que vous souhaitez recevoir la newsletter à cette adresse.')}</p>
            <Button onClick={confirmer} disabled={etat === 'enCours'}>
              {etat === 'enCours' && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {t('newsletter.confirmer', 'Confirmer mon inscription')}
            </Button>
          </>
        )}
        <p><Link to="/" className="underline">{t('newsletter.retour', 'Retour à l’accueil')}</Link></p>
      </main>
      <Footer />
    </div>
  );
}
