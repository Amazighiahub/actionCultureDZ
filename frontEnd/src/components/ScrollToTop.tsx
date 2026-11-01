import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { focusMainContent } from './SkipLink';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const isFirstRender = useRef(true);

  // Lien vers une partie de page (« /a-propos#conditions » du pied de page) : on y descend, une fois la
  // page affichée. Avant : retour en haut de page, le lien n'avait aucun effet.
  useEffect(() => {
    if (!hash) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const cible = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (cible) cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (cible || ++tries > 40) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [pathname, hash]);

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);

    // Changement de page : le focus va au contenu de la nouvelle page, pour que le
    // clavier et les lecteurs d'écran ne restent pas sur le lien cliqué (pas au premier
    // affichage, pour ne pas voler le focus à l'arrivée sur le site)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Les pages sont chargées à la demande : on attend que leur <main> soit affiché
    let tries = 0;
    const timer = window.setInterval(() => {
      if (focusMainContent() || ++tries > 20) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
