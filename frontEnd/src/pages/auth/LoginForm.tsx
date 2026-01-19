/**
 * LoginForm - Formulaire de connexion
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Checkbox } from '@/components/UI/checkbox';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/UI/use-toast';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { login, loginLoading } = useAuth();

  // État du formulaire
  const [formData, setFormData] = useState({
    email: '',
    mot_de_passe: '',
    remember: false
  });

  // Erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('auth.errors.emailRequired', 'L\'email est requis');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid', 'Email invalide');
    }

    if (!formData.mot_de_passe) {
      newErrors.password = t('auth.errors.passwordRequired', 'Le mot de passe est requis');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const success = await login({
        email: formData.email,
        password: formData.mot_de_passe
      });

      if (success) {
        toast({
          title: t('auth.success.loginTitle', 'Connexion réussie'),
          description: t('auth.success.loginDescription', 'Bienvenue !')
        });
        // Redirection gérée par le composant parent
        window.location.reload();
      } else {
        toast({
          title: t('auth.errors.loginError', 'Erreur de connexion'),
          description: t('auth.errors.invalidCredentials', 'Email ou mot de passe incorrect'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: t('auth.errors.loginError', 'Erreur'),
        description: t('auth.errors.serverError', 'Erreur serveur'),
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">
          {t('auth.login.welcome', 'Bon retour !')}
        </CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.fields.email', 'Email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrors({ ...errors, email: '' });
                }}
                className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
                disabled={loginLoading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.fields.password', 'Mot de passe')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.mot_de_passe}
                onChange={(e) => {
                  setFormData({ ...formData, mot_de_passe: e.target.value });
                  setErrors({ ...errors, password: '' });
                }}
                className={`pl-9 ${errors.password ? 'border-destructive' : ''}`}
                disabled={loginLoading}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.remember}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, remember: !!checked })
                }
              />
              <Label htmlFor="remember" className="text-sm cursor-pointer">
                {t('auth.login.remember', 'Se souvenir de moi')}
              </Label>
            </div>
            <Button variant="link" size="sm" className="px-0" type="button">
              {t('auth.login.forgotPassword', 'Mot de passe oublié ?')}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* Bouton de connexion */}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('auth.login.loading', 'Connexion...')}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                {t('auth.login.submit', 'Se connecter')}
              </>
            )}
          </Button>

          {/* Lien vers inscription */}
          <p className="text-sm text-center text-muted-foreground">
            {t('auth.login.noAccount', 'Pas encore de compte ?')}{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              type="button"
              onClick={onSwitchToRegister}
            >
              {t('auth.login.createAccount', 'Créer un compte')}
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;
