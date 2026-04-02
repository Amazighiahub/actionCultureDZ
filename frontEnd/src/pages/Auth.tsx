import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/hooks/useRTL';
import LoginFormComponent from '@/pages/auth/LoginForm';
import RegisterFormComponent from '@/pages/auth/RegisterForm';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { direction } = useRTL();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('connexion');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background" dir={direction}>
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
