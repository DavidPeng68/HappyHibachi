import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Icon } from '../ui';
import { useScrollReveal } from '../../hooks';
import { validateEmail } from '../../utils/validation';
import './Newsletter.css';

/**
 * Newsletter subscription component
 * Email signup with validation and success state
 */
const Newsletter: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !validateEmail(email)) {
      setStatus('error');
      setMessage(t('newsletter.invalidEmail'));
      return;
    }

    setStatus('loading');

    try {
      const { submitNewsletter } = await import('../../services/api');
      const result = await submitNewsletter(email);
      if (result.success) {
        setStatus('success');
        setMessage(t('newsletter.success'));
        setEmail('');
      } else {
        setStatus('error');
        setMessage(result.error || t('newsletter.error'));
      }
    } catch {
      setStatus('error');
      setMessage(t('newsletter.error'));
    }
  };

  return (
    <section className="newsletter" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`newsletter-container ${isVisible ? 'visible' : ''}`}>
        <div className="newsletter-content">
          <div className="newsletter-icon">
            <Icon name="email" size={32} />
          </div>
          <h2>{t('newsletter.title')}</h2>
          <p>{t('newsletter.subtitle')}</p>
        </div>

        <form className="newsletter-form" onSubmit={handleSubmit}>
          {status !== 'success' ? (
            <>
              <div className="newsletter-input-group">
                <Input
                  type="email"
                  placeholder={t('newsletter.placeholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  disabled={status === 'loading'}
                />
                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    t('newsletter.subscribe')
                  )}
                </Button>
              </div>
              {status === 'error' && <p className="newsletter-error">{message}</p>}
              <p className="newsletter-privacy">{t('newsletter.privacy')}</p>
            </>
          ) : (
            <div className="newsletter-success">
              <span className="success-icon">✓</span>
              <p>{message}</p>
            </div>
          )}
        </form>

        <div className="newsletter-benefits">
          <div className="benefit">
            <span>
              <Icon name="gift" size={18} />
            </span>
            <span>{t('newsletter.benefit1')}</span>
          </div>
          <div className="benefit">
            <span>
              <Icon name="calendar" size={18} />
            </span>
            <span>{t('newsletter.benefit2')}</span>
          </div>
          <div className="benefit">
            <span>
              <Icon name="chef" size={18} />
            </span>
            <span>{t('newsletter.benefit3')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
