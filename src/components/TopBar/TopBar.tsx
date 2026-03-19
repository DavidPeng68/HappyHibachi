import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks';
import { Icon } from '../ui';
import './TopBar.css';

const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { promoBanner, contactInfo } = settings;

  return (
    <div className="top-bar">
      <div className="top-bar-container">
        <div className="top-bar-left">
          {promoBanner.enabled && (
            <div className="top-bar-promo-scroll">
              <span className="top-bar-promo">
                {promoBanner.emoji} {promoBanner.text}
              </span>
              <span className="top-bar-promo-sep" aria-hidden="true">
                •
              </span>
              <span className="top-bar-promo top-bar-promo-urgency">
                {t('topBar.limitedSlots')}
              </span>
            </div>
          )}
        </div>
        <div className="top-bar-right">
          <a href={`tel:${contactInfo.phone}`} className="top-bar-link">
            <Icon name="phone" size={16} />
            <span>{contactInfo.phone}</span>
          </a>
          <a href={`sms:${contactInfo.phone}`} className="top-bar-link">
            <Icon name="sms" size={16} />
            <span>{t('topBar.textUs')}</span>
          </a>
          <a href={`mailto:${contactInfo.email}`} className="top-bar-link">
            <Icon name="email" size={16} />
            <span>{t('topBar.email')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
