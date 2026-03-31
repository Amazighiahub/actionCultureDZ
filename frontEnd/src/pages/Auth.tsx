import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Palette, Mail, Lock, UserPlus, LogIn, Upload, Calendar, Phone, MapPin, AlertCircle, X, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/hooks/useRTL';
import { useToast } from '@/components/ui/use-toast';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { mediaService } from '@/services/media.service';
import { httpClient } from '@/services/httpClient';
import { SECTEUR_TYPE_USER_MAP, SECTEUR_OPTIONS, AUTH_ERROR_MESSAGES } from '@/types/models/auth.types';
import { useWilayas } from '@/hooks/useGeographie';
import { getAssetUrl } from '@/helpers/assetUrl';
import { authLogger } from '@/utils/logger';
import LoginFormComponent from '@/pages/auth/LoginForm';
import RegisterFormComponent from '@/pages/auth/RegisterForm';

const Auth = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { direction } = useRTL();
  const { registerVisitor, registerProfessional, registerLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('connexion');
  
  // État pour les wilayas
  const { wilayas, loading: wilayasLoading, error: wilayasError } = useWilayas();
  
  // Rediriger si déjà connecté
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

            {/* Onglet Connexion */}
            <TabsContent value="connexion">
              <LoginFormComponent onSwitchToRegister={() => setActiveTab('inscription')} />
            </TabsContent>

            {/* Onglet Inscription */}
            <TabsContent value="inscription">
              <RegisterFormComponent onSwitchToLogin={() => setActiveTab("connexion")} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;