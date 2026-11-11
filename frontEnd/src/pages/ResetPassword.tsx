import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { userService } from '@/services/user.service';
import { useRTL } from '@/hooks/useRTL';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { detailsDesChamps, messageErreurServeur } from '@/utils/erreurServeur';
import { erreurMotDePasse } from '@/utils/motDePasse';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { direction } = useRTL();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [lienInvalide, setLienInvalide] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    // Règles communes du mot de passe (utils/motDePasse.ts)
    const problemeMdp = erreurMotDePasse(password, t);
    if (problemeMdp) newErrors.password = problemeMdp;

    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordMismatch');
    }

    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    if (hasErrors) {
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
    }
    return !hasErrors;
  };

  const validateField = (field: string) => {
    switch (field) {
      case 'password':
        if (!password) {
          setErrors((prev) => ({ ...prev, password: t('auth.errors.passwordRequired') }));
        } else if (password.length < 12) {
          setErrors((prev) => ({ ...prev, password: t('auth.errors.passwordMinLength', 'Minimum 12 caractères') }));
        } else if (!/[A-Z]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.passwordRules.uppercase', 'Doit contenir une majuscule') }));
        } else if (!/[a-z]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.passwordRules.lowercase', 'Doit contenir une minuscule') }));
        } else if (!/[0-9]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.passwordRules.digit', 'Doit contenir un chiffre') }));
        } else if (!/[^A-Za-z0-9]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.passwordRules.special', 'Doit contenir un caractère spécial') }));
        }
        break;
      case 'confirmPassword':
        if (!confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: t('auth.errors.confirmPasswordRequired') }));
        } else if (password !== confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: t('auth.errors.passwordMismatch') }));
        }
        break;
    }
  };

  /**
   * Erreur du serveur : lue par son code et le détail des champs, plus par des mots-clés (le serveur
   * écrivait « Invalid token » en anglais ; « Données invalides » s'affichait sans dire quoi faire,
   * audit V11 FRM-6). Lien plus valable : message clair et bouton pour en demander un autre.
   */
  const montrerErreur = (source: unknown) => {
    const code = (source as { code?: string } | null)?.code || '';
    if (code === 'INVALID_TOKEN' || detailsDesChamps(source).some((d) => d.field === 'token')) {
      setLienInvalide(true);
      setError(t('auth.resetPassword.lienInvalide', 'Ce lien n’est plus valable (il a déjà servi ou il est trop ancien). Demandez un nouveau lien.'));
    } else if (code.startsWith('PASSWORD_')) {
      setError(t('auth.resetPassword.regles', 'Le mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial.'));
    } else {
      setError(messageErreurServeur(source, t('auth.resetPassword.error', 'Une erreur est survenue. Veuillez réessayer.')));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLienInvalide(false);

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setError(t('auth.resetPassword.invalidToken'));
      return;
    }

    setLoading(true);

    try {
      const response = await userService.resetPassword(token, password);

      if (response.success) {
        setSuccess(true);
        toast({
          title: t('auth.resetPassword.successTitle'),
          description: t('auth.resetPassword.successDescription'),
        });

        redirectTimerRef.current = setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        montrerErreur(response);
      }
    } catch (err: unknown) {
      montrerErreur(err);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div dir={direction} className="min-h-screen bg-background">
        <Header />

        <main className="container py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>{t('auth.resetPassword.invalidTokenTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.resetPassword.invalidTokenDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button  asChild><Link to="/forgot-password">{t('auth.resetPassword.requestNewLink')}</Link></Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div dir={direction} className="min-h-screen bg-background">
        <Header />

        <main className="container py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('auth.resetPassword.successTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.resetPassword.successDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-primary/20 bg-primary/10">
                  <AlertDescription className="text-primary">
                    {t('auth.resetPassword.redirecting')}
                  </AlertDescription>
                </Alert>

                <div className="text-center">
                  <Button  asChild><Link to="/auth">
                      {t('auth.resetPassword.goToLogin')}
                    </Link></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <Header />

      <main className="container py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
              <CardDescription>
                {t('auth.resetPassword.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* noValidate : les messages du site, traduits, remplacent la bulle du navigateur */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                      {lienInvalide && (
                        <Button asChild variant="outline" size="sm" className="mt-3 block w-fit">
                          <Link to="/forgot-password">{t('auth.resetPassword.requestNewLink')}</Link>
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" required>{t('auth.resetPassword.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({ ...errors, password: undefined });
                      }}
                      onBlur={() => validateField('password')}
                      className={errors.password ? 'border-destructive pe-10' : 'pe-10'}
                      disabled={loading}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'reset-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={t('auth.togglePassword', 'Afficher/masquer le mot de passe')}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={password} />
                  {errors.password && (
                    <p id="reset-password-error" role="alert" className="text-sm text-destructive">{errors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('auth.resetPassword.passwordHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" required>{t('auth.resetPassword.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      onBlur={() => validateField('confirmPassword')}
                      className={errors.confirmPassword ? 'border-destructive pe-10' : 'pe-10'}
                      disabled={loading}
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={t('auth.togglePassword', 'Afficher/masquer le mot de passe')}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p id="reset-confirm-error" role="alert" className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Compte ouvert pour la personne (liste d'inscription importée) : elle accepte ici les conditions */}
                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.resetPassword.conditions', 'En choisissant votre mot de passe, vous acceptez les')}{' '}
                  <Link to="/a-propos#conditions" className="underline underline-offset-2">{t('auth.resetPassword.conditionsLien', 'conditions d’utilisation')}</Link>.
                </p>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {t('auth.resetPassword.resetting')}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 me-2" />
                      {t('auth.resetPassword.submit')}
                    </>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Link to="/auth" className="text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                    {t('auth.resetPassword.backToLogin')}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
