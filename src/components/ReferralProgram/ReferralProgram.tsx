import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Icon } from '../ui';
import { useScrollReveal } from '../../hooks';
import { validateEmail } from '../../utils/validation';
import './ReferralProgram.css';

const REFERRAL_REWARD = 50;
const FRIEND_DISCOUNT = 30;

/**
 * Referral Program component
 * Allows users to refer friends and earn rewards
 */
const ReferralProgram: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !validateEmail(email)) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const { submitReferral } = await import('../../services/api');
      const result = await submitReferral(email);
      if (result.success && result.code) {
        setReferralCode(result.code);
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <section className="referral-program" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`referral-container ${isVisible ? 'visible' : ''}`}>
        <div className="referral-content">
          <div className="referral-badge">
            <Icon name="gift" size={32} />
          </div>
          <h2>{t('referral.title')}</h2>
          <p>{t('referral.subtitle')}</p>
        </div>

        <div className="referral-grid">
          <div className="referral-step">
            <div className="step-icon">1</div>
            <h3>{t('referral.step1Title')}</h3>
            <p>{t('referral.step1Desc')}</p>
          </div>

          <div className="referral-step">
            <div className="step-icon">2</div>
            <h3>{t('referral.step2Title')}</h3>
            <p>{t('referral.step2Desc')}</p>
          </div>

          <div className="referral-step">
            <div className="step-icon">3</div>
            <h3>{t('referral.step3Title')}</h3>
            <p>{t('referral.step3Desc')}</p>
          </div>
        </div>

        <div className="referral-rewards">
          <div className="reward-card you">
            <span className="reward-amount">${REFERRAL_REWARD}</span>
            <span className="reward-label">{t('referral.yourReward')}</span>
          </div>
          <div className="reward-separator">+</div>
          <div className="reward-card friend">
            <span className="reward-amount">${FRIEND_DISCOUNT}</span>
            <span className="reward-label">{t('referral.friendDiscount')}</span>
          </div>
        </div>

        <div className="referral-form-container">
          {status !== 'success' ? (
            <form className="referral-form" onSubmit={handleSubmit}>
              <h3>{t('referral.getCode')}</h3>
              <div className="form-row">
                <Input
                  type="email"
                  placeholder={t('referral.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                  error={status === 'error' ? t('referral.invalidEmail') : undefined}
                />
                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    t('referral.getCodeBtn')
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="referral-success">
              <div className="success-icon">✓</div>
              <h3>{t('referral.successTitle')}</h3>
              <p>{t('referral.successDesc')}</p>
              <div className="sample-code">
                <span>{referralCode}</span>
                <button
                  type="button"
                  className="copy-code-btn"
                  onClick={handleCopyCode}
                  aria-label={t('referral.copyCode')}
                >
                  {copied ? t('referral.copied') : t('referral.copyCode')}
                </button>
              </div>
              <div className="referral-share">
                <p className="referral-share-label">{t('referral.shareVia')}</p>
                <div className="referral-share-buttons">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(t('referral.shareMessage', { code: referralCode }))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-whatsapp"
                    aria-label="WhatsApp"
                  >
                    <Icon name="phone" size={16} />
                    WhatsApp
                  </a>
                  <a
                    href={`sms:?body=${encodeURIComponent(t('referral.shareMessage', { code: referralCode }))}`}
                    className="share-btn share-sms"
                    aria-label="SMS"
                  >
                    <Icon name="sms" size={16} />
                    SMS
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(t('referral.shareEmailSubject'))}&body=${encodeURIComponent(t('referral.shareMessage', { code: referralCode }))}`}
                    className="share-btn share-email"
                    aria-label="Email"
                  >
                    <Icon name="email" size={16} />
                    Email
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="referral-note">
          <p>{t('referral.terms')}</p>
        </div>
      </div>
    </section>
  );
};

export default ReferralProgram;
