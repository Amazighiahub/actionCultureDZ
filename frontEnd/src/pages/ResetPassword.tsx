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

    if (!password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (password.length < 12) {
      newErrors.password = t('auth.errors.passwordMinLength', 'Minimum 12 caractères');
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = t('auth.errors.passwordNeedUppercase', 'Doit contenir une majuscule');
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = t('auth.errors.passwordNeedLowercase', 'Doit contenir une minuscule');
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = t('auth.errors.passwordNeedDigit', 'Doit contenir un chiffre');
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = t('auth.errors.passwordNeedSpecial', 'Doit contenir un caractère spécial');
    }

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
          setErrors((prev) => ({ ...prev, password: t('auth.errors.passwordNeedUppercase', 'Doit contenir une majuscule') }));
        } else if (!/[a-z]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.errors.passwordNeedLowercase', 'Doit contenir une minuscule') }));
        } else if (!/[0-9]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.errors.passwordNeedDigit', 'Doit contenir un chiffre') }));
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          setErrors((prev) => ({ ...prev, password: t('auth.errors.passwordNeedSpecial', 'Doit contenir un caractère spécial') }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

        // Rediriger vers la page de connexion après 3 secondes
        redirectTimerRef.current = setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        setError(response.error || t('auth.resetPassword.error'));
      }
    } catch (err: any) {
      setError(err.message || t('auth.resetPassword.error'));
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
                <Link to="/forgot-password">
                  <Button>{t('auth.resetPassword.requestNewLink')}</Button>
                </Link>
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
                  <Link to="/auth">
                    <Button>
                      {t('auth.resetPassword.goToLogin')}
                    </Button>
                  </Link>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.resetPassword.newPassword')}</Label>
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
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      disabled={loading}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'reset-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  <Label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPassword')}</Label>
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
                      className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                      disabled={loading}
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={t('auth.togglePassword', 'Afficher/masquer le mot de passe')}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p id="reset-confirm-error" role="alert" className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

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
                    <ArrowLeft className="h-4 w-4" />
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
