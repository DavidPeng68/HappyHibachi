/**
 * Unified error handling for admin API.
 */

export type AdminErrorCode = 'NETWORK' | 'TIMEOUT' | 'AUTH' | 'VALIDATION' | 'SERVER' | 'UNKNOWN';

export class AdminError extends Error {
  readonly code: AdminErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly context: Record<string, unknown>;

  constructor(
    message: string,
    code: AdminErrorCode,
    options: { retryable?: boolean; status?: number; context?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    this.context = options.context ?? {};
  }

  static network(message = 'Network error'): AdminError {
    return new AdminError(message, 'NETWORK', { retryable: true });
  }

  static timeout(message = 'Request timed out'): AdminError {
    return new AdminError(message, 'TIMEOUT', { retryable: true });
  }

  static auth(message = 'Authentication failed'): AdminError {
    return new AdminError(message, 'AUTH', { retryable: false, status: 401 });
  }

  static server(message: string, status: number): AdminError {
    return new AdminError(message, 'SERVER', { retryable: status >= 500, status });
  }

  static validation(message: string, context?: Record<string, unknown>): AdminError {
    return new AdminError(message, 'VALIDATION', { retryable: false, context });
  }
}
