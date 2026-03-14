import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as adminApi from '../../services/adminApi';
import '../AdminDashboard.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim() || loading) return;

      setLoading(true);
      setError('');

      try {
        const result = await adminApi.login(password);
        if (result.success && result.token) {
          onLogin(result.token);
        } else {
          setError(result.error || t('admin.login.invalidPassword'));
        }
      } catch {
        setError(t('admin.login.loginFailed'));
      } finally {
        setLoading(false);
      }
    },
    [password, loading, onLogin, t]
  );

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="brand-icon" role="img" aria-label="logo">
            🔥
          </span>
          <h1>{t('admin.login.title')}</h1>
          <p>{t('admin.login.subtitle')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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
                autoFocus
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
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading || !password.trim()}>
            {loading ? t('admin.login.loggingIn') : t('admin.login.loginButton')}
          </button>
        </form>

        <div className="login-footer">
          <p>{t('admin.login.contactHelp')}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
