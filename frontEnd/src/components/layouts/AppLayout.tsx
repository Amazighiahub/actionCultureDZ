/**
 * AppLayout - Layout principal de l'application
 * Contient Header, Footer et le contenu principal avec espacement cohérent
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRTL } from '@/hooks/useRTL';

interface AppLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, className }) => {
  const { isRtl } = useRTL();

  return (
    <div className={`min-h-screen bg-background ${isRtl ? 'rtl' : 'ltr'}`}>
      <Header />
      
      <main className={`flex-1 ${className || ''}`}>
        {children || <Outlet />}
      </main>
      
      <Footer />
    </div>
  );
};

export default AppLayout;
