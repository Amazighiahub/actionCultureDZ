import { useTranslation } from 'react-i18next';

/** Donne le focus au contenu principal (<main>) de la page affichée */
export function focusMainContent(): boolean {
  const main = document.querySelector<HTMLElement>('main');
  if (!main) return false;
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
  return true;
}

/**
 * Lien d'évitement : premier élément atteint au clavier, il permet de sauter
 * l'en-tête et la navigation (WCAG 2.4.1). Visible seulement quand il a le focus.
 */
const SkipLink = () => {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="skip-to-content"
      onClick={(e) => {
        e.preventDefault();
        if (focusMainContent()) document.querySelector('main')?.scrollIntoView();
      }}
    >
      {t('a11y.skipToContent', 'Aller au contenu principal')}
    </a>
  );
};

export default SkipLink;
