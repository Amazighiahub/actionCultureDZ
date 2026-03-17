import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/auth.service';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

const VerifyEmailPage = () => {
  const { token } = useParams<{token: string;}>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('verifyemailpage.noToken'));
      return;
    }

    const handleVerification = async () => {
      try {
        const response = await authService.verifyEmail(token);

        if (response.success) {
          setStatus('success');
          setMessage(t('verifyemailpage.successRedirect'));

          redirectTimerRef.current = setTimeout(() => {
            navigate('/');
          }, 3000);

        } else {
          setStatus('error');
          setMessage(response.error || t('verifyemailpage.invalidToken'));
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.error || t('verifyemailpage.serverError'));
      }
    };

    handleVerification();

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [token, navigate, t]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 max-w-md w-full">
        {status === 'loading' &&
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium">{t('verifyemailpage.verifying')}</p>
          </div>
        }

        {status === 'success' &&
          <Alert variant="default" className="bg-green-100 border-green-400 text-green-800">
            <AlertTitle className="font-bold">{t('verifyemailpage.vrification_russie')}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        }

        {status === 'error' &&
          <Alert variant="destructive">
            <AlertTitle className="font-bold">{t('verifyemailpage.erreur_lors_vrification')}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
            <Button asChild className="mt-4">
              <Link to="/">{t('verifyemailpage.retour_page_daccueil')}</Link>
            </Button>
          </Alert>
        }
      </div>
    </div>
  );
};

export default VerifyEmailPage;
