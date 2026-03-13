import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { Icon } from '../components/ui';
import { useSettings } from '../hooks';
import './Legal.css';

const Terms: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { contactInfo } = settings;

  return (
    <div className="legal-page">
      <SEO title={t('terms.title')} />
      <div className="legal-container">
        <h1>{t('terms.title')}</h1>
        <p className="legal-updated">{t('terms.lastUpdated')}</p>

        <section>
          <h2>{t('terms.section1.title')}</h2>
          <p>{t('terms.section1.desc')}</p>
        </section>

        <section>
          <h2>{t('terms.section2.title')}</h2>
          <ul>
            <li>
              <strong>{t('terms.section2.minimum')}:</strong> {t('terms.section2.minimumDesc')}
            </li>
            <li>
              <strong>{t('terms.section2.confirmation')}:</strong>{' '}
              {t('terms.section2.confirmationDesc')}
            </li>
            <li>
              <strong>{t('terms.section2.deposit')}:</strong> {t('terms.section2.depositDesc')}
            </li>
            <li>
              <strong>{t('terms.section2.finalCount')}:</strong>{' '}
              {t('terms.section2.finalCountDesc')}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('terms.section3.title')}</h2>
          <ul>
            <li>
              <strong>{t('terms.section3.sevenDays')}:</strong> {t('terms.section3.sevenDaysDesc')}
            </li>
            <li>
              <strong>{t('terms.section3.threeSixDays')}:</strong>{' '}
              {t('terms.section3.threeSixDaysDesc')}
            </li>
            <li>
              <strong>{t('terms.section3.lessThanThree')}:</strong>{' '}
              {t('terms.section3.lessThanThreeDesc')}
            </li>
            <li>
              <strong>{t('terms.section3.weather')}:</strong> {t('terms.section3.weatherDesc')}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('terms.section4.title')}</h2>
          <p>{t('terms.section4.intro')}</p>
          <ul>
            <li>{t('terms.section4.item1')}</li>
            <li>{t('terms.section4.item2')}</li>
            <li>{t('terms.section4.item3')}</li>
            <li>{t('terms.section4.item4')}</li>
          </ul>
        </section>

        <section>
          <h2>{t('terms.section5.title')}</h2>
          <p>{t('terms.section5.desc')}</p>
        </section>

        <section>
          <h2>{t('terms.section6.title')}</h2>
          <p>{t('terms.section6.desc')}</p>
        </section>

        <section>
          <h2>{t('terms.section7.title')}</h2>
          <p>{t('terms.section7.intro')}</p>
          <ul>
            <li>{t('terms.section7.california')}</li>
            <li>{t('terms.section7.texas')}</li>
            <li>{t('terms.section7.florida')}</li>
          </ul>
          <p>{t('terms.section7.travelFee')}</p>
        </section>

        <section>
          <h2>{t('terms.section8.title')}</h2>
          <p>{t('terms.section8.desc')}</p>
        </section>

        <section>
          <h2>{t('terms.section9.title')}</h2>
          <p>{t('terms.section9.intro')}</p>
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

export default Terms;
