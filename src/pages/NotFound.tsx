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
    <div className="not-found">
      <SEO title={t('notFound.title')} />
      <div className="not-found-content">
        <div className="not-found-number">404</div>
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.description')}</p>
        <div className="not-found-actions">
          <Link to={ROUTES.HOME} className="btn-primary">
            {t('notFound.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
