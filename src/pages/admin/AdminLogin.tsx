import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminRole } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import '../AdminDashboard.css';

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
  const [error, setError] = useState('');

  // Registration state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim() || loading) return;

      setLoading(true);
      setError('');

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
          setError(result.error || t('admin.login.invalidPassword'));
        }
      } catch {
        setError(t('admin.login.loginFailed'));
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
        setError(t('admin.login.registerMissingFields'));
        return;
      }

      if (regPassword !== regConfirmPassword) {
        setError(t('admin.login.passwordMismatch'));
        return;
      }

      if (regPassword.length < 6) {
        setError(t('admin.login.passwordTooShort'));
        return;
      }

      setLoading(true);
      setError('');

      try {
        const result = await adminApi.register(
          regUsername.trim(),
          regPassword,
          regDisplayName.trim()
        );
        if (result.success) {
          setRegSuccess(true);
        } else {
          setError(result.error || t('admin.login.registerFailed'));
        }
      } catch {
        setError(t('admin.login.registerFailed'));
      } finally {
        setLoading(false);
      }
    },
    [regUsername, regPassword, regConfirmPassword, regDisplayName, loading, t]
  );

  const switchMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setRegSuccess(false);
  };

  // Registration success view
  if (regSuccess) {
    return (
      <div className="admin-login-page">
        <div className="login-container">
          <div className="login-brand">
            <span className="brand-icon" role="img" aria-label="logo">
              {'\u2705'}
            </span>
            <h1>{t('admin.login.registerSuccessTitle')}</h1>
            <p>{t('admin.login.registerSuccessMessage')}</p>
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

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="brand-icon" role="img" aria-label="logo">
            {'\uD83D\uDD25'}
          </span>
          <h1>{isRegisterMode ? t('admin.login.registerTitle') : t('admin.login.title')}</h1>
          <p>{isRegisterMode ? t('admin.login.registerSubtitle') : t('admin.login.subtitle')}</p>
        </div>

        {isRegisterMode ? (
          <form className="login-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="reg-displayname">{t('admin.login.displayName')}</label>
              <input
                id="reg-displayname"
                type="text"
                value={regDisplayName}
                onChange={(e) => setRegDisplayName(e.target.value)}
                placeholder={t('admin.login.displayNamePlaceholder')}
                disabled={loading}
                autoFocus
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
              <input
                id="reg-password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder={t('admin.login.passwordPlaceholder')}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">{t('admin.login.confirmPassword')}</label>
              <input
                id="reg-confirm"
                type="password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder={t('admin.login.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

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
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('admin.login.usernameOptionalPlaceholder')}
                autoComplete="username"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">{t('admin.login.password')}</label>
              <div style={{ position: 'relative' }}>
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
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? t('admin.login.hidePassword') : t('admin.login.showPassword')
                  }
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                    color: 'var(--admin-text-muted)',
                  }}
                >
                  {showPassword ? '\uD83D\uDE48' : '\uD83D\uDC41\uFE0F'}
                </button>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading || !password.trim()}>
              {loading ? t('admin.login.loggingIn') : t('admin.login.loginButton')}
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>
            <button
              type="button"
              onClick={switchMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--admin-primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px',
              }}
            >
              {isRegisterMode ? t('admin.login.backToLogin') : t('admin.login.registerLink')}
            </button>
          </p>
          <p>{t('admin.login.contactHelp')}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
