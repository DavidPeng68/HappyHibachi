import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../hooks';
import { Icon } from '../ui';
import './FloatingContact.css';

const FloatingContact: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { settings } = useSettings();
  const { phone, email } = settings.contactInfo;

  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Hide on admin routes
  const isAdmin = location.pathname.startsWith('/admin');

  // Delay appearance to avoid CLS
  useEffect(() => {
    if (isAdmin) return;
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [isAdmin]);

  // Collapse on scroll
  useEffect(() => {
    const handleScroll = () => {
      setCollapsed(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const trackClick = (label: string) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'floating_contact_click', { event_label: label });
    }
  };

  if (isAdmin || !visible) return null;

  return (
    <div className={`floating-contact ${collapsed ? 'floating-contact--collapsed' : ''}`}>
      <a
        href={`tel:${phone}`}
        className="floating-contact__btn"
        onClick={() => trackClick('phone')}
        aria-label={t('floatingContact.call')}
      >
        <Icon name="phone" size={20} />
        <span className="floating-contact__label">{t('floatingContact.call')}</span>
      </a>
      <a
        href={`sms:${phone}`}
        className="floating-contact__btn"
        onClick={() => trackClick('sms')}
        aria-label={t('floatingContact.text')}
      >
        <Icon name="sms" size={20} />
        <span className="floating-contact__label">{t('floatingContact.text')}</span>
      </a>
      <a
        href={`mailto:${email}`}
        className="floating-contact__btn"
        onClick={() => trackClick('email')}
        aria-label={t('floatingContact.email')}
      >
        <Icon name="email" size={20} />
        <span className="floating-contact__label">{t('floatingContact.email')}</span>
      </a>
    </div>
  );
};

export default FloatingContact;
