/**
 * ErrorMessage - Composant d'affichage des erreurs avec option de retry
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useRTL } from '@/hooks/useRTL';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="p-6">
        <div className={`flex items-center space-x-2 text-destructive mb-2 ${rtlClasses.flexRow}`}>
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">{t('errors.loadingError')}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
            {t('common.retry')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorMessage;
