import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';

const Gallery = lazy(() => import('../components/Gallery/Gallery'));
const ImageSlider = lazy(() => import('../components/ImageSlider/ImageSlider'));

const GalleryPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t('gallery.title')}
        description={t('galleryPage.description')}
        keywords="hibachi photos, hibachi party gallery, hibachi at home pictures"
        ogUrl="https://familyfriendshibachi.com/gallery"
      />
      <Suspense
        fallback={
          <div className="section-loading">
            <div className="skeleton skeleton-title" />
          </div>
        }
      >
        <ImageSlider />
        <Gallery />
      </Suspense>
    </>
  );
};

export default GalleryPage;
