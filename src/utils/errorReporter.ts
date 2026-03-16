/**
 * Frontend error reporting utility.
 * Logs critical errors to console in structured format.
 * Can be extended to send to external services (Sentry, Datadog, etc.)
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorReport {
  message: string;
  severity: ErrorSeverity;
  context?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent: string;
}

export function reportError(
  message: string,
  severity: ErrorSeverity = 'medium',
  context?: string,
  metadata?: Record<string, unknown>
): void {
  const report: ErrorReport = {
    message,
    severity,
    context,
    metadata,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  if (severity === 'critical' || severity === 'high') {
    console.error('[Error Report]', report);
  } else {
    console.warn('[Error Report]', report);
  }
}

export function reportApiError(endpoint: string, error: string, statusCode?: number): void {
  reportError(`API error: ${error}`, statusCode && statusCode >= 500 ? 'high' : 'medium', 'api', {
    endpoint,
    statusCode,
  });
}
