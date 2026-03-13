import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '../../hooks';
import { Button, Icon } from '../ui';
import './SpecialOffer.css';

const AUTO_HIDE_DELAY = 25000; // 25 seconds

/**
 * Special offer popup component
 * Shows a promotional message and auto-hides after a delay
 */
const SpecialOffer: React.FC = () => {
  const { t } = useTranslation();
  const { goToFreeEstimate } = useAppNavigation();
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  // Auto-hide after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="special-offer" role="complementary" aria-label="Special offer">
      <div className="offer-card">
        <button
          className="offer-close"
          onClick={handleClose}
          aria-label="Close offer"
          type="button"
        >
          <Icon name="close" size={20} />
        </button>
        <div className="offer-content">
          <span className="offer-badge">
            <Icon name="fire" size={16} /> {t('common.specialOffer')}
          </span>
          <h3>{t('offer.noTravel')}</h3>
          <h4>{t('offer.within50')}</h4>
          <ul className="offer-list">
            <li>
              <Icon name="check" size={14} /> {t('offer.noHidden')}
            </li>
            <li>
              <Icon name="check" size={14} /> {t('offer.exclusive')}
            </li>
            <li>
              <Icon name="check" size={14} /> {t('offer.freeSetup')}
            </li>
          </ul>
          <p className="offer-note">{t('offer.sunFri')}</p>
          <Button variant="primary" size="md" onClick={goToFreeEstimate} className="offer-cta">
            {t('nav.freeEstimate')}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default SpecialOffer;
