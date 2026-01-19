import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/UI/use-toast';
import { userService } from '@/services/user.service';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError(t('auth.errors.emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('auth.errors.emailInvalid'));
      return;
    }

    setLoading(true);

    try {
      const response = await userService.forgotPassword(email);

      if (response.success) {
        setSubmitted(true);
        toast({
          title: t('auth.forgotPassword.successTitle'),
          description: t('auth.forgotPassword.successDescription'),
        });
      } else {
        // On affiche toujours un succès pour ne pas révéler si l'email existe
        setSubmitted(true);
      }
    } catch (err: any) {
      // Même en cas d'erreur, on affiche un succès pour des raisons de sécurité
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
                <CardTitle>{t('auth.forgotPassword.emailSentTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.forgotPassword.emailSentDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    {t('auth.forgotPassword.checkSpam')}
                  </AlertDescription>
                </Alert>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.forgotPassword.didntReceive')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }}
                  >
                    {t('auth.forgotPassword.tryAgain')}
                  </Button>
                </div>

                <div className="text-center pt-4">
                  <Link to="/auth" className="text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    {t('auth.forgotPassword.backToLogin')}
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
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t('auth.forgotPassword.title')}</CardTitle>
              <CardDescription>
                {t('auth.forgotPassword.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.forgotPassword.emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className={error ? 'border-destructive' : ''}
                    disabled={loading}
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('auth.forgotPassword.sending')}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {t('auth.forgotPassword.submit')}
                    </>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Link to="/auth" className="text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    {t('auth.forgotPassword.backToLogin')}
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

export default ForgotPassword;
