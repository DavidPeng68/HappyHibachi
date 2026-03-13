import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useSettings, useScrollReveal } from '../../hooks';
import { BUSINESS_HOURS } from '../../constants';
import { Button, Icon } from '../ui';
import './Contact.css';

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const { goToFreeEstimate, goToBookNow } = useAppNavigation();
  const { settings } = useSettings();
  const { contactInfo } = settings;
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      className={`contact-section ${isVisible ? 'visible' : ''}`}
      id="contact"
      ref={sectionRef}
    >
      <div className="contact-container">
        <div className="contact-header scroll-reveal">
          <h2>{t('contact.title')}</h2>
          <p>{t('contact.subtitle')}</p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <h3>
                <Icon name="phone" size={18} /> {t('contact.phone')}
              </h3>
              <p>{contactInfo.phone}</p>
            </div>

            <div className="contact-item">
              <h3>
                <Icon name="email" size={18} /> {t('contact.email')}
              </h3>
              <p>{contactInfo.email}</p>
            </div>

            <div className="contact-item">
              <h3>
                <Icon name="map-pin" size={18} /> {t('contact.address')}
              </h3>
              <p>
                {t('booking.california')}, {t('booking.texas')}, {t('booking.florida')}
              </p>
            </div>

            <div className="contact-item">
              <h3>
                <Icon name="clock" size={18} /> {t('contact.hours')}
              </h3>
              <p>
                {t('timeSlot.afternoon')}: {BUSINESS_HOURS.afternoon}
              </p>
              <p>
                {t('timeSlot.evening')}: {BUSINESS_HOURS.evening}
              </p>
              <p>
                {t('timeSlot.night')}: {BUSINESS_HOURS.night}
              </p>
            </div>
          </div>

          <div className="contact-cta">
            <h3>{t('booking.title')}</h3>
            <div className="cta-buttons">
              <Button variant="secondary" onClick={goToFreeEstimate}>
                {t('nav.freeEstimate')}
              </Button>
              <Button variant="primary" onClick={goToBookNow}>
                {t('nav.bookNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
