import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { httpClient } from '@/services/httpClient';

const ConfirmEmailChange = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Aucun jeton de confirmation fourni.');
      return;
    }

    const confirmChange = async () => {
      try {
        const response = await httpClient.get<{ newEmail: string }>(
          `/email-verification/confirm-email-change/${token}`
        );

        if (response.success && response.data) {
          setStatus('success');
          setNewEmail(response.data.newEmail || '');
          setMessage('Votre adresse email a été mise à jour avec succès.');
        } else {
          setStatus('error');
          setMessage(response.error || 'Le jeton est invalide ou a expiré.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Impossible de confirmer le changement d\'email.');
      }
    };

    confirmChange();
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-12">
        <div className="max-w-md mx-auto">
          <Card>
            {status === 'loading' && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                  <CardTitle className="mt-4">Confirmation en cours...</CardTitle>
                </CardHeader>
              </>
            )}

            {status === 'success' && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Email mis à jour</CardTitle>
                  <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {newEmail && (
                    <Alert className="border-green-200 bg-green-50">
                      <AlertDescription className="text-green-800">
                        Votre nouvel email : <strong>{newEmail}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="text-center">
                    <Link to="/auth">
                      <Button>Se reconnecter</Button>
                    </Link>
                  </div>
                </CardContent>
              </>
            )}

            {status === 'error' && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle>Erreur</CardTitle>
                  <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Link to="/" className="text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à l'accueil
                  </Link>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConfirmEmailChange;
