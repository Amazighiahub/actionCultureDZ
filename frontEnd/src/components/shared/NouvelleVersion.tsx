/**
 * Onglet ouvert avant une mise en ligne : il garde l'ancienne version (nouveaux boutons absents) tant
 * qu'on ne recharge pas. On compare de temps en temps, et au retour sur l'onglet, le script principal de
 * la page à celui du site en ligne ; s'il a changé, un bandeau propose de recharger (2026-11-17 : le
 * bouton « Gérer » de l'administration restait invisible dans un onglet déjà ouvert).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MOTIF = /<script[^>]+src="(\/assets\/index-[^"]+\.js)"/;
const INTERVALLE = 10 * 60 * 1000;
const ECART_MIN = 2 * 60 * 1000;

/** Script principal de la page ouverte ; null en développement (pas de version à comparer) */
export function scriptActuel(doc: Document = document): string | null {
  const script = Array.from(doc.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((s) => s.getAttribute('src') || '')
    .find((src) => /^\/assets\/index-[^/]+\.js$/.test(src));
  return script || null;
}

/** Script principal du site en ligne (null si la page ne se lit pas) */
export async function scriptEnLigne(): Promise<string | null> {
  const reponse = await fetch('/', { cache: 'no-store', credentials: 'same-origin' });
  if (!reponse.ok) return null;
  return (await reponse.text()).match(MOTIF)?.[1] || null;
}

const NouvelleVersion: React.FC = () => {
  const { t } = useTranslation();
  const [disponible, setDisponible] = useState(false);
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    const actuel = scriptActuel();
    if (!actuel) return;
    let dernier = 0;
    let actif = true;
    const verifier = () => {
      if (Date.now() - dernier < ECART_MIN || document.visibilityState === 'hidden') return;
      dernier = Date.now();
      scriptEnLigne()
        .then((enLigne) => { if (actif && enLigne && enLigne !== actuel) setDisponible(true); })
        .catch(() => {});
    };
    const minuteur = window.setInterval(verifier, INTERVALLE);
    const auRetour = () => { if (document.visibilityState === 'visible') verifier(); };
    document.addEventListener('visibilitychange', auRetour);
    window.addEventListener('focus', auRetour);
    return () => {
      actif = false;
      window.clearInterval(minuteur);
      document.removeEventListener('visibilitychange', auRetour);
      window.removeEventListener('focus', auRetour);
    };
  }, []);

  if (!disponible || ferme) return null;
  return (
    <div role="status" className="fixed bottom-4 inset-x-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 text-sm">{t('nouvelleVersion.texte', 'Une nouvelle version du site est disponible.')}</p>
      <Button size="sm" onClick={() => window.location.reload()}>{t('nouvelleVersion.recharger', 'Recharger')}</Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setFerme(true)} aria-label={t('common.close', 'Fermer')}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default NouvelleVersion;
