import React, { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { FAQ_ITEMS } from '../constants';

const FAQ = lazy(() => import('../components/FAQ/FAQ'));

const FAQPage: React.FC = () => {
  const { t } = useTranslation();

  const faqItems = useMemo(
    () =>
      FAQ_ITEMS.map((item) => ({
        question: t(`faq.items.q${item.id}.question`),
        answer: t(`faq.items.q${item.id}.answer`),
      })),
    [t]
  );

  return (
    <>
      <SEO
        title={t('nav.faq')}
        description={t('faqPage.description')}
        keywords="hibachi catering FAQ, hibachi at home questions, hibachi party info"
        ogUrl="https://familyfriendshibachi.com/faq"
        faqItems={faqItems}
      />
      <Suspense
        fallback={
          <div className="section-loading">
            <div className="skeleton skeleton-title" />
          </div>
        }
      >
        <FAQ />
      </Suspense>
    </>
  );
};

export default FAQPage;
