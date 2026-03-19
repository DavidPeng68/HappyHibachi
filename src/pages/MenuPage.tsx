import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { MenuPricing } from '../components';

const MenuSelection = lazy(() => import('../components/MenuSelection/MenuSelection'));

const MenuPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t('nav.menu')}
        description={t('menuPage.description')}
        keywords="hibachi menu, hibachi catering menu, hibachi prices, hibachi proteins"
        ogUrl="https://familyfriendshibachi.com/menu"
      />
      <MenuPricing />
      <Suspense
        fallback={
          <div className="section-loading">
            <div className="skeleton skeleton-title" />
          </div>
        }
      >
        <MenuSelection />
      </Suspense>
    </>
  );
};

export default MenuPage;
