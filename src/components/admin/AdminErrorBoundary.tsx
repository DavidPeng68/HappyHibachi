import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  retryLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Something went wrong';
      const message =
        this.props.fallbackMessage ||
        'An error occurred while loading this section. Please try again.';
      const retryText = this.props.retryLabel || 'Try again';

      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">&#9888;</div>
          <h3 className="error-boundary-title">{title}</h3>
          <p className="error-boundary-message">{message}</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="error-boundary-details">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
          <button className="admin-btn admin-btn-primary" onClick={this.handleRetry} type="button">
            {retryText}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const AdminErrorBoundaryWithI18n: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  return (
    <AdminErrorBoundary
      fallbackTitle={t('admin.error.title')}
      fallbackMessage={t('admin.error.description')}
      retryLabel={t('admin.error.retry')}
    >
      {children}
    </AdminErrorBoundary>
  );
};

export default AdminErrorBoundary;
