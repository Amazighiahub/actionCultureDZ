import { createRoot } from 'react-dom/client'
import { i18nReady } from '../i18n/config'
import App from './App.tsx'
import ErrorBoundary from './components/shared/ErrorBoundary'
import './styles/fonts'
import './index.css'

const render = () =>
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary level="global">
      <App />
    </ErrorBoundary>
  );

// Afficher l'application une fois la langue du visiteur chargée (sinon le texte
// apparaîtrait d'abord en clés ou en français) ; au plus 3 s d'attente si le réseau est lent
Promise.race([i18nReady, new Promise((resolve) => setTimeout(resolve, 3000))]).finally(render);
