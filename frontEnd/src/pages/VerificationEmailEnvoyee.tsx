import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from 'lucide-react';
import { useTranslation } from "react-i18next";

const VerificationEmailEnvoyee = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const state = location.state as { email?: string; message?: string; isProfessional?: boolean } | null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">
            {t('auth.emailVerificationSent', 'Email de vérification envoyé')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {state?.message || t('auth.emailVerificationMessage', 'Un email de vérification a été envoyé à votre adresse.')}
          </p>

          {state?.email && (
            <p className="font-medium text-sm">
              {state.email}
            </p>
          )}

          {state?.isProfessional && (
            <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-left text-sm text-blue-800">
              <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p>{t('auth.professionalValidationNote', 'Après vérification de votre email, votre compte sera soumis à validation par un administrateur.')}</p>
            </div>
          )}

          <div className="pt-4">
            <Link to="/auth">
              <Button variant="outline" className="w-full">
                {t('auth.backToLogin', 'Retour à la connexion')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationEmailEnvoyee;
