import { useEffect } from 'react';
import i18n from 'i18next';

/** Question posée avant de quitter une page qui a des modifications non enregistrées */
export const confirmerSortie = () => window.confirm(
  i18n.t('common.quitterSansEnregistrer', 'Vous avez des modifications non enregistrées. Quitter quand même ?')
);

/**
 * Prévient avant de quitter la page s'il reste des modifications non enregistrées :
 * fermeture ou rechargement de l'onglet (fenêtre du navigateur), et clic sur un lien interne
 * du site (le routeur, BrowserRouter, ne permet pas de bloquer la navigation lui-même).
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const avantFermeture = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Phase de capture : avant que le lien du routeur ne change de page
    const clicLien = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!lien || lien.target === '_blank' || lien.hasAttribute('download')) return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!confirmerSortie()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', avantFermeture);
    document.addEventListener('click', clicLien, true);
    return () => {
      window.removeEventListener('beforeunload', avantFermeture);
      document.removeEventListener('click', clicLien, true);
    };
  }, [isDirty]);
}
