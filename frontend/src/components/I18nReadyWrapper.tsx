// components/I18nReadyWrapper.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface I18nReadyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const I18nReadyWrapper: React.FC<I18nReadyWrapperProps> = ({ 
  children, 
  fallback 
}) => {
  const { ready } = useTranslation();
  const [isReady, setIsReady] = useState(ready);

  useEffect(() => {
    if (ready) {
      setIsReady(true);
    }
  }, [ready]);

  // Afficher le fallback si i18n n'est pas prêt
  if (!isReady) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};