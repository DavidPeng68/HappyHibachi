import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.name + ' ' + error.message;
  return (
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch dynamically imported module')
  );
}

const ChunkErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();

  const handleReload = () => window.location.reload();

  return (
    <div className="error-boundary">
      <div className="error-content">
        <h2>{t('common.errorTitle')}</h2>
        <p>{t('common.chunkLoadError')}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onRetry}>
            {t('common.retry')}
          </button>
          <button className="btn-primary" onClick={handleReload}>
            {t('common.reloadPage')}
          </button>
        </div>
      </div>
      <style>{`
        .error-boundary {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: var(--space-xl);
          text-align: center;
        }
        .error-content {
          background: var(--color-bg-card);
          padding: var(--space-2xl);
          border-radius: var(--radius-lg);
          max-width: 400px;
        }
        .error-content h2 {
          color: var(--color-primary);
          margin-bottom: var(--space-md);
        }
        .error-content p {
          color: var(--color-text-muted);
          margin-bottom: var(--space-lg);
        }
      `}</style>
    </div>
  );
};

const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="error-boundary">
      <div className="error-content">
        <h2>{t('common.errorTitle')}</h2>
        <p>{t('common.errorMessage')}</p>
        <button className="btn-primary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
      <style>{`
        .error-boundary {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: var(--space-xl);
          text-align: center;
        }
        .error-content {
          background: var(--color-bg-card);
          padding: var(--space-2xl);
          border-radius: var(--radius-lg);
          max-width: 400px;
        }
        .error-content h2 {
          color: var(--color-primary);
          margin-bottom: var(--space-md);
        }
        .error-content p {
          color: var(--color-text-muted);
          margin-bottom: var(--space-lg);
        }
      `}</style>
    </div>
  );
};

/**
 * Error Boundary component to catch JavaScript errors in child components
 * Displays a fallback UI instead of crashing the entire app
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      if (isChunkLoadError(this.state.error)) {
        return <ChunkErrorFallback onRetry={this.handleRetry} />;
      }
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
