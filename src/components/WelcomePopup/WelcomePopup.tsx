import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal/Modal';
import { Button, Icon } from '../ui';
import './WelcomePopup.css';

const STORAGE_KEY = 'welcomePopupDismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_KEY = 'welcomeShown';

interface ValueProp {
  icon: 'check' | 'gift' | 'map-pin' | 'chef' | 'star';
  textKey: string;
}

const VALUE_PROPS: ValueProp[] = [
  { icon: 'check', textKey: 'welcome.prop1' },
  { icon: 'map-pin', textKey: 'welcome.prop2' },
  { icon: 'gift', textKey: 'welcome.prop3' },
  { icon: 'star', textKey: 'welcome.prop4' },
];

const WelcomePopup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return;

    // Small delay to avoid blocking initial render
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'welcome_popup_shown');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleEstimate = () => {
    handleClose();
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'welcome_popup_cta', { event_label: 'estimate' });
    }
    navigate('/free-estimate');
  };

  const handleMenu = () => {
    handleClose();
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'welcome_popup_cta', { event_label: 'menu' });
    }
    const menuSection = document.getElementById('menu-pricing');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/menu');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showCloseButton>
      <div className="welcome-popup">
        <div className="welcome-popup__header">
          <h3 className="welcome-popup__heading">{t('welcome.heading')}</h3>
          <p className="welcome-popup__brand">{t('welcome.brandLine')}</p>
          <span className="welcome-popup__badge">{t('welcome.limitedOffer')}</span>
        </div>

        <div className="welcome-popup__props">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.textKey} className="welcome-popup__prop">
              <Icon name={prop.icon} size={20} />
              <span>{t(prop.textKey)}</span>
            </div>
          ))}
        </div>

        <p className="welcome-popup__urgency">{t('welcome.urgency')}</p>

        <div className="welcome-popup__actions">
          <Button variant="primary" size="lg" onClick={handleEstimate} fullWidth>
            {t('welcome.ctaEstimate')}
          </Button>
          <Button variant="secondary" size="lg" onClick={handleMenu} fullWidth>
            {t('welcome.ctaMenu')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default WelcomePopup;
