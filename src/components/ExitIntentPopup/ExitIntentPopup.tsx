import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Icon } from '../ui';
import { validateEmail } from '../../utils/validation';
import './ExitIntentPopup.css';

const STORAGE_KEY = 'exitIntentDismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ExitIntentPopup: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    // Don't show if recently dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return;

    // Desktop: mouse leaves viewport at top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setVisible(true);
      }
    };

    // Delay enabling to avoid accidental triggers on page load
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    setSubmitted(true);
    // Fire tracking
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        event_category: 'exit_intent',
        event_label: 'email_capture',
      });
    }
    setTimeout(dismiss, 3000);
  };

  if (!visible) return null;

  return (
    <div className="exit-popup-overlay" onClick={dismiss}>
      <div
        className="exit-popup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="exit-popup-close" onClick={dismiss} aria-label={t('common.close')}>
          <Icon name="close" size={20} />
        </button>

        {submitted ? (
          <div className="exit-popup-success">
            <span className="exit-popup-emoji">&#127881;</span>
            <h3>{t('exitIntent.successTitle')}</h3>
            <p>{t('exitIntent.successDesc')}</p>
          </div>
        ) : (
          <>
            <div className="exit-popup-header">
              <span className="exit-popup-emoji">&#128293;</span>
              <h3>{t('exitIntent.title')}</h3>
              <p>{t('exitIntent.subtitle')}</p>
            </div>
            <div className="exit-popup-offer">
              <span className="exit-popup-discount">$30 OFF</span>
              <span className="exit-popup-offer-text">{t('exitIntent.offerText')}</span>
            </div>
            <form className="exit-popup-form" onSubmit={handleSubmit}>
              <Input
                type="email"
                placeholder={t('exitIntent.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" fullWidth>
                {t('exitIntent.claimOffer')}
              </Button>
            </form>
            <p className="exit-popup-note">{t('exitIntent.noSpam')}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ExitIntentPopup;
