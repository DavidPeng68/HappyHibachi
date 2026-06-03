import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
      title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
    >
      <span
        className={`theme-toggle__icon ${theme === 'dark' ? 'theme-toggle__icon--sun' : 'theme-toggle__icon--moon'}`}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </span>
    </button>
  );
};

export default ThemeToggle;
