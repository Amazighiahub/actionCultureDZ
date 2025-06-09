// src/components/providers/AppProviders.tsx - Composant qui regroupe tous les providers
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { AppProvider } from '../../contexts/AppContext';
import { FilterProvider } from '../../contexts/FilterContext';
import { NotificationProvider } from './NotificationProvider';
import { ErrorBoundary } from './ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <AppProvider>
              <FilterProvider>
                {children}
              </FilterProvider>
            </AppProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};
