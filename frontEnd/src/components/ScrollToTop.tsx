import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { focusMainContent } from './SkipLink';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
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
