import React from 'react';
import { useTheme } from '../../../hooks/useTheme';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
