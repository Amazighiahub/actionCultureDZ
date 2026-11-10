import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSafeRedirectPath } from '@/utils/safeUrl';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/hooks/useRTL';
import LoginFormComponent from '@/pages/auth/LoginForm';
import RegisterFormComponent from '@/pages/auth/RegisterForm';

/** Onglet demandé par l'adresse : /auth?tab=inscription (ou « register ») ouvre l'inscription */
const ongletDepuisAdresse = (search: string) =>
  (['inscription', 'register'].includes(new URLSearchParams(search).get('tab') || '') ? 'inscription' : 'connexion');

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { direction } = useRTL();
  const { isAuthenticated } = useAuth();
  // Avant : toujours « Connexion », même après un clic sur « S'inscrire » (audit V11 UX-2)
  const [activeTab, setActiveTab] = useState(() => ongletDepuisAdresse(location.search));
  // Clic sur « S'inscrire » ou « Se connecter » alors que la page est déjà ouverte
  useEffect(() => { setActiveTab(ongletDepuisAdresse(location.search)); }, [location.search]);

  useEffect(() => {
    if (isAuthenticated) {
      const depuis = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
      const cible = getSafeRedirectPath(new URLSearchParams(location.search).get('redirect'))
        ?? getSafeRedirectPath(depuis?.pathname ? `${depuis.pathname}${depuis.search || ''}` : null);
      navigate(cible || '/', { replace: true });
    }
  }, [isAuthenticated, navigate, location.search, location.state]);

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      {/* Page de connexion : utile aux visiteurs, pas aux résultats de recherche */}
      <SEOHead title={t('auth.seoTitle', 'Connexion et inscription')} noindex />
      <Header />

      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
              {t('auth.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('auth.subtitle')}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connexion" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>{t('auth.login.tabTitle')}</span>
              </TabsTrigger>
              <TabsTrigger value="inscription" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>{t('auth.register.tabTitle')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connexion">
              <LoginFormComponent onSwitchToRegister={() => setActiveTab('inscription')} />
            </TabsContent>

            <TabsContent value="inscription">
              <RegisterFormComponent onSwitchToLogin={() => setActiveTab('connexion')} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
