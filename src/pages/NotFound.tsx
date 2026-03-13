import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { ROUTES } from '../constants';
import './NotFound.css';

/**
 * 404 Not Found page
 */
const NotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="notfound-page">
      <SEO title={t('notFound.title')} />
      <div className="notfound-content">
        <h1>404</h1>
        <h2>{t('notFound.title')}</h2>
        <p>{t('notFound.description')}</p>
        <Link to={ROUTES.HOME} className="btn-primary">
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
