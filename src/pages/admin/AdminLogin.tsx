import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminRole } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import '../../styles/admin/index.css';

// ---------------------------------------------------------------------------
// SVG Icon Components
// ---------------------------------------------------------------------------

const FlameIcon = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22c-4.97 0-7-3.58-7-7 0-4 3-7.5 4-9 .5 2.5 2 4.5 3.5 5.5C11 10 11 8 10.5 6c2.5 2 5.5 5.5 5.5 9 0 3.42-2.03 7-7 7z" />
    <path
      d="M12 22c-1.66 0-3-1.5-3-3.5 0-2 1.5-3.5 2-4.5.5 1 1 2 2 2.5-.5-1-.5-2-.5-3 1.5 1 3 3 3 5 0 1.94-1.34 3.5-3 3.5z"
      fill="currentColor"
      fillOpacity="0.15"
    />
  </svg>
);

const EyeIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShieldOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 2.76 1.28 5.49 3.39 7.41" />
    <line x1="9" y1="9" x2="15" y2="15" />
    <line x1="15" y1="9" x2="9" y2="15" />
  </svg>
);

const HelpIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ---------------------------------------------------------------------------
// Password Strength Helper
// ---------------------------------------------------------------------------

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(pwd: string): { level: StrengthLevel; key: string } {
  if (!pwd) return { level: 0, key: '' };
  if (pwd.length < 8) return { level: 1, key: 'weak' };
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  if (!hasUpper || !hasLower || !hasDigit) return { level: 2, key: 'fair' };
  if (pwd.length >= 12 || /[^A-Za-z0-9]/.test(pwd)) return { level: 4, key: 'strong' };
  return { level: 3, key: 'good' };
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

type ErrorType = 'auth' | 'status' | 'rate' | 'network';

interface LoginError {
  message: string;
  type: ErrorType;
}

function classifyError(errorStr: string): LoginError {
  const lower = errorStr.toLowerCase();
  if (lower.includes('pending'))
    return { message: 'admin.login.errorAccountPending', type: 'status' };
  if (lower.includes('rejected'))
    return { message: 'admin.login.errorAccountRejected', type: 'status' };
  if (lower.includes('disabled'))
    return { message: 'admin.login.errorAccountDisabled', type: 'status' };
  if (lower.includes('too many') || lower.includes('rate'))
    return { message: 'admin.login.errorRateLimited', type: 'rate' };
  if (lower.includes('invalid'))
    return { message: 'admin.login.errorInvalidCredentials', type: 'auth' };
  return { message: '', type: 'auth' };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoginResult {
  token: string;
  role: AdminRole;
  userId: string;
  displayName: string;
}

interface AdminLoginProps {
  onLogin: (result: LoginResult) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  // Registration state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Refs
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Focus management on mode switch
  useEffect(() => {
    requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });
  }, [isRegisterMode]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim() || loading) return;

      setLoading(true);
      setError(null);

      try {
        const result = await adminApi.login(password, username.trim() || undefined);
        if (result.success && result.token) {
          onLogin({
            token: result.token,
            role: result.role || 'super_admin',
            userId: result.userId || '__env__',
            displayName: result.displayName || 'Admin',
          });
        } else {
          const apiError = result.error || '';
          const classified = classifyError(apiError);
          setError({
            message: classified.message || apiError || t('admin.login.invalidPassword'),
            type: classified.type,
          });
        }
      } catch {
        setError({ message: t('admin.login.errorNetwork'), type: 'network' });
      } finally {
        setLoading(false);
      }
    },
    [username, password, loading, onLogin, t]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      if (!regUsername.trim() || !regPassword.trim() || !regDisplayName.trim()) {
        setError({ message: t('admin.login.registerMissingFields'), type: 'auth' });
        return;
      }

      if (regPassword !== regConfirmPassword) {
        setError({ message: t('admin.login.passwordMismatch'), type: 'auth' });
        return;
      }

      if (regPassword.length < 6) {
        setError({ message: t('admin.login.passwordTooShort'), type: 'auth' });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await adminApi.register(
          regUsername.trim(),
          regPassword,
          regDisplayName.trim()
        );
        if (result.success) {
          setRegSuccess(true);
        } else {
          const apiError = result.error || '';
          const classified = classifyError(apiError);
          setError({
            message: classified.message || apiError || t('admin.login.registerFailed'),
            type: classified.type,
          });
        }
      } catch {
        setError({ message: t('admin.login.errorNetwork'), type: 'network' });
      } finally {
        setLoading(false);
      }
    },
    [regUsername, regPassword, regConfirmPassword, regDisplayName, loading, t]
  );

  const switchMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError(null);
    setRegSuccess(false);
  };

  // ---------------------------------------------------------------------------
  // Error display helper
  // ---------------------------------------------------------------------------

  const renderError = () => {
    if (!error) return null;
    return (
      <div
        className={`form-error${error.type === 'status' ? ' form-error--warning' : error.type === 'rate' ? ' form-error--info' : ''}`}
      >
        {error.type === 'status' ? (
          error.message.includes('Pending') || error.message.includes('pending') ? (
            <ClockIcon />
          ) : (
            <ShieldOffIcon />
          )
        ) : error.type === 'rate' ? (
          <ClockIcon />
        ) : (
          <AlertTriangleIcon />
        )}
        <span>{error.message.startsWith('admin.') ? t(error.message) : error.message}</span>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Registration success view
  // ---------------------------------------------------------------------------

  if (regSuccess) {
    return (
      <div className="admin-login-page">
        <div className="login-container">
          <div className="login-brand">
            <div className="register-success-icon">
              <CheckCircleIcon />
            </div>
            <h1>{t('admin.login.registerSuccessTitle')}</h1>
            <p>{t('admin.login.registerSuccessMessage')}</p>
            <p style={{ marginTop: 8 }}>{t('admin.login.registerSuccessBackSoon')}</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setIsRegisterMode(false);
              setRegSuccess(false);
              setRegUsername('');
              setRegPassword('');
              setRegConfirmPassword('');
              setRegDisplayName('');
            }}
          >
            {t('admin.login.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="brand-icon">
            <FlameIcon />
          </div>
          <h1>{isRegisterMode ? t('admin.login.registerTitle') : t('admin.login.title')}</h1>
          <p>{isRegisterMode ? t('admin.login.registerSubtitle') : t('admin.login.subtitle')}</p>
        </div>

        <div key={isRegisterMode ? 'register' : 'login'} className="login-form-area">
          {isRegisterMode ? (
            <form className="login-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="reg-displayname">{t('admin.login.displayName')}</label>
                <input
                  id="reg-displayname"
                  ref={firstFieldRef}
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder={t('admin.login.displayNamePlaceholder')}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-username">{t('admin.login.username')}</label>
                <input
                  id="reg-username"
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder={t('admin.login.usernamePlaceholder')}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">{t('admin.login.password')}</label>
                <div className="password-input-wrapper">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={t('admin.login.passwordPlaceholder')}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowRegPassword((s) => !s)}
                    aria-label={
                      showRegPassword
                        ? t('admin.login.hidePassword')
                        : t('admin.login.showPassword')
                    }
                  >
                    {showRegPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {regPassword &&
                (() => {
                  const strength = getPasswordStrength(regPassword);
                  const levels = ['weak', 'fair', 'good', 'strong'];
                  return (
                    <div className="password-strength">
                      <div className="password-strength-bar">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`password-strength-segment${i <= strength.level ? ` active-${levels[Math.min(strength.level, 4) - 1]}` : ''}`}
                          />
                        ))}
                      </div>
                      <div className="password-strength-label">
                        <span className={`password-strength-text text-${strength.key}`}>
                          {t(`admin.login.passwordStrength.${strength.key}`)}
                        </span>
                        <span>{t('admin.login.passwordStrength.requirements')}</span>
                      </div>
                    </div>
                  );
                })()}

              <div className="form-group">
                <label htmlFor="reg-confirm">{t('admin.login.confirmPassword')}</label>
                <div className="password-input-wrapper">
                  <input
                    id="reg-confirm"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder={t('admin.login.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>

              {renderError()}

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  loading || !regUsername.trim() || !regPassword.trim() || !regDisplayName.trim()
                }
              >
                {loading ? t('admin.login.registering') : t('admin.login.registerButton')}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="admin-username">{t('admin.login.username')}</label>
                <input
                  id="admin-username"
                  ref={firstFieldRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('admin.login.usernameOptionalPlaceholder')}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="admin-password">{t('admin.login.password')}</label>
                <div className="password-input-wrapper">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('admin.login.passwordPlaceholder')}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? t('admin.login.hidePassword') : t('admin.login.showPassword')
                    }
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {renderError()}

              <button type="submit" className="btn-primary" disabled={loading || !password.trim()}>
                {loading ? t('admin.login.loggingIn') : t('admin.login.loginButton')}
              </button>
            </form>
          )}
        </div>

        <div className="login-footer">
          <p>
            <button type="button" className="login-mode-switch" onClick={switchMode}>
              {isRegisterMode ? t('admin.login.backToLogin') : t('admin.login.registerLink')}
            </button>
          </p>
          <p>
            <span className="login-help-link">
              <HelpIcon />
              {t('admin.login.needHelp')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
