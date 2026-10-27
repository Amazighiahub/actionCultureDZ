import { createRoot } from 'react-dom/client'
import { i18nReady } from '../i18n/config'
import App from './App.tsx'
import ErrorBoundary from './components/shared/ErrorBoundary'
import './styles/fonts'
import './index.css'
import { HERO_PREMIERE_IMAGE } from './components/home/heroPremiereImage'

const render = () =>
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary level="global">
      <App />
    </ErrorBoundary>
  );

// Accueil : la photo du bandeau est demandée dès le démarrage (sinon seulement après les traductions
// et le code de la page : environ 0,9 s plus tard sur téléphone). Script en ligne interdit (CSP).
if (window.location.pathname === '/') {
  const lien = document.createElement('link');
  lien.rel = 'preload';
  lien.as = 'image';
  lien.setAttribute('imagesrcset', HERO_PREMIERE_IMAGE.srcSet);
  lien.setAttribute('imagesizes', '100vw');
  lien.setAttribute('fetchpriority', 'high');
  document.head.appendChild(lien);
}

// Pendant le chargement des traductions, la page demandée est déjà téléchargée (sinon elle ne
// partait qu'après : environ 0,3 à 0,5 s de plus sur téléphone). Mêmes modules que les routes d'App.
const PAGES: Array<[RegExp, () => Promise<unknown>]> = [
  [/^\/$/, () => import('./pages/index')],
  [/^\/evenements\/?$/, () => import('./pages/Evenements')],
  [/^\/evenements\/[^/]+$/, () => import('./pages/EventDetailsPage')],
  [/^\/patrimoine\/?$/, () => import('./pages/Patrimoine')],
  [/^\/patrimoine\/(?!services$)[^/]+$/, () => import('./pages/PatrimoineDetail')],
  [/^\/oeuvres\/?$/, () => import('./pages/Oeuvres')],
  [/^\/oeuvres\/[^/]+$/, () => import('./pages/oeuvreDetail/OeuvreDetailPage')],
  [/^\/artisanat\/?$/, () => import('./pages/Artisanat')],
  [/^\/articles\/[^/]+$/, () => import('./pages/articles/ArticleViewPage')],
];
PAGES.find(([chemin]) => chemin.test(window.location.pathname))?.[1]().catch(() => { /* la route la rechargera */ });

// Afficher l'application une fois la langue du visiteur chargée (sinon le texte
// apparaîtrait d'abord en clés ou en français) ; au plus 3 s d'attente si le réseau est lent
Promise.race([i18nReady, new Promise((resolve) => setTimeout(resolve, 3000))]).finally(render);
