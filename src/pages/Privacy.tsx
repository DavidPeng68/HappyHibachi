import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { Icon } from '../components/ui';
import { useSettings } from '../hooks';
import './Legal.css';

const Privacy: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { contactInfo } = settings;

  return (
    <div className="legal-page">
      <SEO title={t('privacy.title')} />
      <div className="legal-container">
        <h1>{t('privacy.title')}</h1>
        <p className="legal-updated">{t('privacy.lastUpdated')}</p>

        <section>
          <h2>{t('privacy.section1.title')}</h2>
          <p>{t('privacy.section1.intro')}</p>
          <ul>
            <li>
              <strong>{t('privacy.section1.contact')}:</strong> {t('privacy.section1.contactDesc')}
            </li>
            <li>
              <strong>{t('privacy.section1.booking')}:</strong> {t('privacy.section1.bookingDesc')}
            </li>
            <li>
              <strong>{t('privacy.section1.payment')}:</strong> {t('privacy.section1.paymentDesc')}
            </li>
            <li>
              <strong>{t('privacy.section1.usage')}:</strong> {t('privacy.section1.usageDesc')}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section2.title')}</h2>
          <ul>
            <li>{t('privacy.section2.item1')}</li>
            <li>{t('privacy.section2.item2')}</li>
            <li>{t('privacy.section2.item3')}</li>
            <li>{t('privacy.section2.item4')}</li>
            <li>{t('privacy.section2.item5')}</li>
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section3.title')}</h2>
          <p>{t('privacy.section3.intro')}</p>
          <ul>
            <li>{t('privacy.section3.item1')}</li>
            <li>{t('privacy.section3.item2')}</li>
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section4.title')}</h2>
          <p>{t('privacy.section4.desc')}</p>
        </section>

        <section>
          <h2>{t('privacy.section5.title')}</h2>
          <p>{t('privacy.section5.intro')}</p>
          <ul>
            <li>{t('privacy.section5.item1')}</li>
            <li>{t('privacy.section5.item2')}</li>
            <li>{t('privacy.section5.item3')}</li>
            <li>{t('privacy.section5.item4')}</li>
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section6.title')}</h2>
          <p>{t('privacy.section6.desc')}</p>
        </section>

        <section>
          <h2>{t('privacy.section7.title')}</h2>
          <p>{t('privacy.section7.intro')}</p>
          <p>
            <Icon name="email" size={16} /> {t('contact.email')}:{' '}
            <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            <br />
            <Icon name="phone" size={16} /> {t('contact.phone')}:{' '}
            <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
