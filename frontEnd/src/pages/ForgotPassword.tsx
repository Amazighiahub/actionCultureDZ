import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { userService } from '@/services/user.service';
import { useRTL } from '@/hooks/useRTL';
import SEOHead from '@/components/SEOHead';
import AntiRobot, { estRefusAntiRobot, useAntiRobot } from '@/components/shared/AntiRobot';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { emailValide } from '@/utils/validationChamps';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { direction } = useRTL();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const antiRobot = useAntiRobot();

  const validateEmailField = () => {
    if (!email?.trim()) {
      setError(t('auth.errors.emailRequired', 'L\'email est requis'));
    } else if (!emailValide(email)) {
      setError(t('auth.errors.emailInvalid', 'Format d\'email invalide'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email?.trim()) {
      setError(t('auth.errors.emailRequired', 'L\'email est requis'));
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    if (!emailValide(email)) {
      setError(t('auth.errors.emailInvalid', 'Format d\'email invalide'));
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    // Vérification anti-robots pas encore terminée : message sous la case (bouton plus grisé sans raison)
    if (!antiRobot.pretAEnvoyer()) return;

    setLoading(true);

    // « E-mail envoyé » seulement si le serveur le confirme. Il répond déjà de la même façon que l'adresse
    // existe ou non : aucune raison de maquiller une erreur en succès. Avant, une panne (500, 502) ou une
    // coupure affichait « Email envoyé ! » et la personne attendait un e-mail qui ne viendrait pas
    // (audit V11 FRM-3).
    const nonParti = t('auth.forgotPassword.nonParti', 'Le service ne répond pas pour le moment. Votre demande n’est pas partie : réessayez dans quelques minutes.');
    const montrerErreur = (source: unknown) => {
      const statut = (source as { status?: number } | null)?.status ?? 0;
      if (estRefusAntiRobot(source)) setError(messageErreurServeur(source, t('antiRobot.refuse', 'La vérification anti-robots a échoué : recommencez-la.')));
      // Serveur en panne : dire clairement que la demande n'est pas partie
      else if (statut >= 500) setError(nonParti);
      else setError(messageErreurServeur(source, nonParti));
    };
    try {
      const response = await userService.forgotPassword(email, antiRobot.lireJeton());

      if (response.success) {
        setSubmitted(true);
        toast({
          title: t('auth.forgotPassword.successTitle'),
          description: t('auth.forgotPassword.successDescription'),
        });
      } else {
        montrerErreur(response);
      }
    } catch (err: unknown) {
      montrerErreur(err);
    } finally {
      setLoading(false);
      // Un jeton ne sert qu'une fois
      antiRobot.reinitialiser();
    }
  };

  if (submitted) {
    return (
      <div dir={direction} className="min-h-screen bg-background">
        <Header />
        <SEOHead title={t('auth.forgotPassword.title', 'Mot de passe oublié')} noindex />

        <main className="container py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('auth.forgotPassword.emailSentTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.forgotPassword.emailSentDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-accent/20 bg-accent/10">
                  <AlertDescription className="text-accent-foreground">
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
                    <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
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
    <div dir={direction} className="min-h-screen bg-background">
      <Header />
      <SEOHead title={t('auth.forgotPassword.title', 'Mot de passe oublié')} noindex />

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
              {/* noValidate : le message du site, traduit et sous le champ, remplace la bulle du navigateur */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email" required>{t('auth.forgotPassword.emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    maxLength={255}
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    onBlur={() => validateEmailField()}
                    className={error ? 'border-destructive' : ''}
                    disabled={loading}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'forgot-email-error' : undefined}
                  />
                  {error && (
                    <p id="forgot-email-error" role="alert" className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <AntiRobot ref={antiRobot.ref} action="mot_de_passe" onJeton={antiRobot.setJeton} attente={antiRobot.attente} />

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {t('auth.forgotPassword.sending')}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 me-2" />
                      {t('auth.forgotPassword.submit')}
                    </>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Link to="/auth" className="text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
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
