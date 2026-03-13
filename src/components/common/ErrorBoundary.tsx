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
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
