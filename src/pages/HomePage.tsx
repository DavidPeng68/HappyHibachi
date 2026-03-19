import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { Hero, HowItWorks, MenuPricing } from '../components';
import { useSettings } from '../hooks';
import { FAQ_ITEMS } from '../constants';

// Lazy-load below-fold components for faster initial paint
const MenuSelection = lazy(() => import('../components/MenuSelection/MenuSelection'));
const ImageSlider = lazy(() => import('../components/ImageSlider/ImageSlider'));
const Gallery = lazy(() => import('../components/Gallery/Gallery'));
const Booking = lazy(() => import('../components/Booking/Booking'));
const CustomerReviews = lazy(() => import('../components/CustomerReviews/CustomerReviews'));
const FAQ = lazy(() => import('../components/FAQ/FAQ'));
const Contact = lazy(() => import('../components/Contact/Contact'));
const SpecialOffer = lazy(() => import('../components/SpecialOffer/SpecialOffer'));
const Newsletter = lazy(() => import('../components/Newsletter/Newsletter'));
const InstagramFeed = lazy(() => import('../components/InstagramFeed/InstagramFeed'));
const ReferralProgram = lazy(() => import('../components/ReferralProgram/ReferralProgram'));
const PhotoShare = lazy(() => import('../components/PhotoShare/PhotoShare'));
const ExitIntentPopup = lazy(() => import('../components/ExitIntentPopup'));

const LazySection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="section-loading">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
      </div>
    }
  >
    {children}
  </Suspense>
);

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const features = settings.featureToggles;

  const [reviewStats, setReviewStats] = useState<
    { averageRating: number; totalCount: number } | undefined
  >();

  useEffect(() => {
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.reviews?.length > 0) {
          const reviews = data.reviews as Array<{ rating: number }>;
          const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          setReviewStats({ averageRating: Math.round(avg * 10) / 10, totalCount: reviews.length });
        }
      })
      .catch(() => {});
  }, []);

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
        title={t('nav.home')}
        description={t('seo.homeDescription')}
        reviewStats={reviewStats}
        faqItems={faqItems}
      />
      <Hero />
      <HowItWorks />
      <MenuPricing />
      <LazySection>
        <MenuSelection />
      </LazySection>
      <LazySection>
        <ImageSlider />
      </LazySection>
      <LazySection>
        <Gallery />
      </LazySection>
      <LazySection>
        <CustomerReviews />
      </LazySection>
      {features.instagramFeed && (
        <LazySection>
          <InstagramFeed />
        </LazySection>
      )}
      <LazySection>
        <Booking />
      </LazySection>
      {features.referralProgram && (
        <LazySection>
          <ReferralProgram />
        </LazySection>
      )}
      {features.photoShare && (
        <LazySection>
          <PhotoShare />
        </LazySection>
      )}
      <LazySection>
        <FAQ />
      </LazySection>
      {features.newsletter && (
        <LazySection>
          <Newsletter />
        </LazySection>
      )}
      <LazySection>
        <Contact />
      </LazySection>
      {features.specialOffer && (
        <LazySection>
          <SpecialOffer />
        </LazySection>
      )}
      <Suspense fallback={null}>
        <ExitIntentPopup />
      </Suspense>
    </>
  );
};

export default HomePage;
