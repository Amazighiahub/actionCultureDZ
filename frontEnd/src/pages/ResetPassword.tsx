import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/UI/use-toast';
import { userService } from '@/services/user.service';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.errors.passwordMinLength');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = t('auth.resetPassword.passwordRequirements');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        setTimeout(() => {
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
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
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
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>{t('auth.resetPassword.successTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.resetPassword.successDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
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
    <div className="min-h-screen bg-background">
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
                  <Alert variant="destructive">
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({ ...errors, password: undefined });
                      }}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
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
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('auth.resetPassword.resetting')}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
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
