/**
 * ErrorBoundary - Capture les erreurs React et affiche un fallback
 *
 * Deux usages :
 *  1. Global (main.tsx) — wrappé avec `level="global"`, utilise un fallback
 *     HTML pur (aucune dépendance shadcn/i18n) pour résister à tout crash.
 *  2. Section (pages) — fallback shadcn + i18n classique.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { withTranslation, type WithTranslation } from 'react-i18next';

const IS_DEV = import.meta.env.DEV;

interface OwnProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** "global" = fallback HTML pur (main.tsx), "section" = fallback shadcn */
  level?: 'global' | 'section';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

type Props = OwnProps & WithTranslation;

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  /**
   * Fallback global — HTML/CSS pur, zéro dépendance React.
   * Résiste même si shadcn, i18n ou le theme provider sont cassés.
   */
  private renderGlobalFallback() {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fafafa',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111' }}>
            Une erreur est survenue
          </h1>

          <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            L&apos;application a rencontré un problème inattendu.
            Veuillez recharger la page pour continuer.
          </p>

          {IS_DEV && this.state.error && (
            <pre
              style={{
                textAlign: 'left',
                background: '#1f2937',
                color: '#f87171',
                padding: '1rem',
                borderRadius: 8,
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 200,
                marginBottom: '1.5rem',
              }}
            >
              {this.state.error.message}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  /**
   * Fallback section — shadcn + i18n, pour les boundaries autour de pages/sections.
   */
  private renderSectionFallback() {
    const { t } = this.props;

    return (
      <Card className="border-destructive/20 bg-destructive/5 m-4">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {t('shared.errorBoundary.title', 'Une erreur est survenue')}
          </h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || t('shared.errorBoundary.unexpected', 'Erreur inattendue')}
          </p>

          {IS_DEV && this.state.errorInfo && (
            <pre className="text-left bg-gray-900 text-red-400 p-4 rounded-lg text-xs overflow-auto max-h-48 mb-4">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.errorInfo.componentStack}
            </pre>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('shared.errorBoundary.retry', 'Réessayer')}
            </Button>
            <Button onClick={this.handleReload} variant="destructive">
              {t('shared.errorBoundary.reload', 'Recharger la page')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.props.level === 'global'
        ? this.renderGlobalFallback()
        : this.renderSectionFallback();
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
