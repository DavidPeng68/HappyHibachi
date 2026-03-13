import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks';

const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'ko', 'vi', 'ja', 'tl', 'hi'] as const;

interface ReviewStats {
  averageRating: number;
  totalCount: number;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  type?: 'website' | 'article' | 'local_business';
  noIndex?: boolean;
  reviewStats?: ReviewStats;
  faqItems?: FAQItem[];
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  ogUrl,
  type = 'website',
  noIndex = false,
  reviewStats,
  faqItems,
}) => {
  const { settings } = useSettings();
  const { i18n } = useTranslation();
  const { brandInfo, seoDefaults, contactInfo, socialLinks } = settings;

  const resolvedDescription = description || seoDefaults.description;
  const resolvedKeywords = keywords || seoDefaults.keywords;
  const fullTitle = title ? `${title} | ${brandInfo.name}` : seoDefaults.title;
  const baseUrl = brandInfo.url;

  const structuredData = useMemo(() => {
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: brandInfo.name,
      url: baseUrl,
      logo: `${baseUrl}${brandInfo.logoUrl}`,
      description: seoDefaults.description,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: `+1-${contactInfo.phone}`,
        contactType: 'customer service',
        email: contactInfo.email,
        areaServed: ['US'],
        availableLanguage: [
          'English',
          'Chinese',
          'Spanish',
          'Korean',
          'Vietnamese',
          'Japanese',
          'Tagalog',
          'Hindi',
        ],
      },
      sameAs: [socialLinks.instagram, socialLinks.facebook, socialLinks.tiktok],
    };

    const localBusinessSchema = {
      '@context': 'https://schema.org',
      '@type': 'FoodService',
      name: brandInfo.name,
      image: `${baseUrl}${brandInfo.logoUrl}`,
      '@id': baseUrl,
      url: baseUrl,
      telephone: `+1-${contactInfo.phone}`,
      email: contactInfo.email,
      priceRange: '$$',
      servesCuisine: 'Japanese, Hibachi',
      description: seoDefaults.description,
      areaServed: [
        { '@type': 'State', name: 'California' },
        { '@type': 'State', name: 'Texas' },
        { '@type': 'State', name: 'Florida' },
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Hibachi Catering Menu',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'At-Home Hibachi Experience',
              description: 'Professional hibachi chef comes to your location with all equipment',
            },
          },
        ],
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewStats ? String(reviewStats.averageRating) : '4.9',
        bestRating: '5',
        worstRating: '1',
        ratingCount: reviewStats ? String(reviewStats.totalCount) : '500',
      },
    };

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: brandInfo.name,
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const faqPageSchema =
      faqItems && faqItems.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }
        : null;

    const schemas: object[] = [organizationSchema, websiteSchema];
    if (type === 'local_business') {
      schemas.push(localBusinessSchema);
    }
    if (faqPageSchema) {
      schemas.push(faqPageSchema);
    }
    return schemas;
  }, [brandInfo, baseUrl, seoDefaults, contactInfo, socialLinks, type, reviewStats, faqItems]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="keywords" content={resolvedKeywords} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <link rel="canonical" href={ogUrl || baseUrl} />
      {SUPPORTED_LOCALES.map((locale) => (
        <link key={locale} rel="alternate" hrefLang={locale} href={`${baseUrl}?lang=${locale}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={baseUrl} />
      <html lang={i18n.language} />

      <meta
        property="og:type"
        content={type === 'local_business' ? 'business.business' : 'website'}
      />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:site_name" content={brandInfo.name} />
      <meta property="og:locale" content="en_US" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}

      <meta name="theme-color" content="#0a0a0f" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {structuredData.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
