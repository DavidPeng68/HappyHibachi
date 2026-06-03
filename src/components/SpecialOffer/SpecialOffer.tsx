import React, { useState, useEffect, useCallback } from 'react';
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
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [autoHideToken, setAutoHideToken] = useState(0);

  const handleClose = () => {
    setIsVisible(false);
  };

  const bumpAutoHide = useCallback(() => {
    if (!pinnedOpen) {
      setAutoHideToken((n) => n + 1);
    }
  }, [pinnedOpen]);

  useEffect(() => {
    if (pinnedOpen || !isVisible) return;
    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);
    return () => window.clearTimeout(timer);
  }, [autoHideToken, pinnedOpen, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className="special-offer"
      role="complementary"
      aria-label={t('common.specialOffer')}
      onMouseEnter={bumpAutoHide}
      onFocusCapture={bumpAutoHide}
      onTouchStart={bumpAutoHide}
    >
      <div className="offer-card">
        <button
          className="offer-close"
          onClick={handleClose}
          aria-label={t('common.close')}
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
          {!pinnedOpen && (
            <button type="button" className="offer-keep-open" onClick={() => setPinnedOpen(true)}>
              {t('offer.keepOpen')}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SpecialOffer;
