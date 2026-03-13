/**
 * ErrorBoundary - Capture les erreurs React et affiche un fallback
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { withTranslation, type WithTranslation } from 'react-i18next';

interface OwnProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

type Props = OwnProps & WithTranslation;

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/20 bg-destructive/5 m-4">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {this.props.t('shared.errorBoundary.title', 'Une erreur est survenue')}
            </h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || this.props.t('shared.errorBoundary.unexpected', 'Erreur inattendue')}
            </p>
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {this.props.t('shared.errorBoundary.retry', 'Réessayer')}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);