// components/ConfigCheck.tsx - Composant pour vérifier la configuration

import React from 'react';
import { useConfigValidation } from '../utils/config-validator';
import { ENV } from '../config';

interface ConfigCheckProps {
  children: React.ReactNode;
  showInProduction?: boolean;
}

/**
 * Composant qui vérifie la configuration et affiche les erreurs si nécessaire
 */
export const ConfigCheck: React.FC<ConfigCheckProps> = ({ 
  children, 
  showInProduction = false 
}) => {
  const { valid, errors, warnings } = useConfigValidation();

  // Ne rien afficher en production sauf si explicitement demandé
  if (ENV.IS_PRODUCTION && !showInProduction) {
    return <>{children}</>;
  }

  // Si tout est OK, afficher les enfants normalement
  if (valid && warnings.length === 0) {
    return <>{children}</>;
  }

  // Si des erreurs critiques, afficher un écran d'erreur
  if (!valid) {
    return (
      <div className="config-error-screen">
        <div className="config-error-container">
          <h1>⚠️ Erreur de Configuration</h1>
          <p>L'application ne peut pas démarrer à cause d'erreurs de configuration.</p>
          
          <div className="config-errors">
            <h3>Erreurs critiques :</h3>
            <ul>
              {errors.map((error, index) => (
                <li key={index} className="error-item">
                  {error}
                </li>
              ))}
            </ul>
          </div>

          <div className="config-help">
            <h3>Comment résoudre :</h3>
            <ol>
              <li>Créez un fichier <code>.env.development</code> à la racine du projet</li>
              <li>Copiez le contenu de <code>.env.example</code></li>
              <li>Ajustez les valeurs selon votre environnement</li>
              <li>Redémarrez le serveur de développement</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Si seulement des avertissements, afficher une bannière
  return (
    <>
      {warnings.length > 0 && (
        <ConfigWarningBanner warnings={warnings} />
      )}
      {children}
    </>
  );
};

/**
 * Bannière d'avertissement pour la configuration
 */
const ConfigWarningBanner: React.FC<{ warnings: string[] }> = ({ warnings }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  if (!isOpen) return null;

  return (
    <div className="config-warning-banner">
      <div className="config-warning-content">
        <span className="warning-icon">⚠️</span>
        <div className="warning-messages">
          <strong>Avertissements de configuration :</strong>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
        <button 
          className="warning-close"
          onClick={() => setIsOpen(false)}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/**
 * Hook pour accéder à la configuration dans les composants
 */
export const useConfig = () => {
  return {
    env: ENV,
    apiUrl: ENV.API_URL,
    appName: ENV.APP_NAME,
    appVersion: ENV.APP_VERSION,
    isDevelopment: ENV.IS_DEVELOPMENT,
    isProduction: ENV.IS_PRODUCTION
  };
};

// Styles CSS à ajouter dans votre fichier de styles global
const styles = `
/* Écran d'erreur de configuration */
.config-error-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.config-error-container {
  max-width: 600px;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.config-error-container h1 {
  color: #d32f2f;
  margin-bottom: 1rem;
}

.config-errors {
  background: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  padding: 1rem;
  margin: 1rem 0;
}

.config-errors h3 {
  color: #c62828;
  margin-bottom: 0.5rem;
}

.error-item {
  color: #d32f2f;
  margin: 0.5rem 0;
}

.config-help {
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 1rem;
}

.config-help h3 {
  color: #1565c0;
  margin-bottom: 0.5rem;
}

.config-help code {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

/* Bannière d'avertissement */
.config-warning-banner {
  background: #fff3cd;
  border-bottom: 1px solid #ffeaa7;
  padding: 0.75rem 1rem;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.config-warning-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-messages {
  flex: 1;
  color: #856404;
}

.warning-messages ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.warning-messages li {
  margin: 0.25rem 0;
}

.warning-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #856404;
  padding: 0;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.warning-close:hover {
  opacity: 1;
}
`;

export default ConfigCheck;