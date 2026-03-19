import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';

const Contact = lazy(() => import('../components/Contact/Contact'));

const ContactPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t('contact.title')}
        description={t('contactPage.description')}
        keywords="hibachi catering contact, book hibachi at home, hibachi phone number"
        ogUrl="https://familyfriendshibachi.com/contact"
      />
      <Suspense
        fallback={
          <div className="section-loading">
            <div className="skeleton skeleton-title" />
          </div>
        }
      >
        <Contact />
      </Suspense>
    </>
  );
};

export default ContactPage;
