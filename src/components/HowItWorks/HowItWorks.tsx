import React from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '../../hooks';
import { Icon } from '../ui';
import type { IconName } from '../ui';
import './HowItWorks.css';

interface Step {
  number: number;
  icon: IconName;
  titleKey: string;
}

interface TrustBadge {
  icon: IconName;
  labelKey: string;
}

const TRUST_BADGES: TrustBadge[] = [
  { icon: 'check', labelKey: 'howItWorks.trustBar.insured' },
  { icon: 'clipboard', labelKey: 'howItWorks.trustBar.licensed' },
  { icon: 'star-filled', labelKey: 'howItWorks.trustBar.fiveStarRated' },
  { icon: 'users', labelKey: 'howItWorks.trustBar.eventsServed' },
];

const STEPS: Step[] = [
  { number: 1, icon: 'calendar', titleKey: 'howItWorks.step1.title' },
  { number: 2, icon: 'chef', titleKey: 'howItWorks.step2.title' },
  { number: 3, icon: 'party', titleKey: 'howItWorks.step3.title' },
  { number: 4, icon: 'sparkle', titleKey: 'howItWorks.step4.title' },
];

/**
 * How It Works section component
 * With scroll reveal animations
 */
const HowItWorks: React.FC = () => {
  const { t } = useTranslation();
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollReveal({ threshold: 0.2 });
  const { ref: trustRef, isVisible: trustVisible } = useScrollReveal({ threshold: 0.3 });

  return (
    <section className="how-it-works" id="how-it-works">
      {/* Section Header */}
      <div ref={headerRef} className={`section-header reveal ${headerVisible ? 'visible' : ''}`}>
        <h2 className="fire-text">{t('howItWorks.title')}</h2>
        <p className="section-subtitle">{t('howItWorks.subtitle')}</p>
      </div>

      {/* Steps */}
      <div
        ref={stepsRef}
        className={`steps-container stagger-children ${stepsVisible ? 'visible' : ''}`}
      >
        {STEPS.map((step, index) => (
          <div
            key={step.number}
            className={`step hover-lift reveal ${stepsVisible ? 'visible' : ''}`}
            style={{ transitionDelay: `${index * 0.15}s` }}
          >
            <div className="step-number">
              <span className="step-icon">
                <Icon name={step.icon} size={32} />
              </span>
            </div>
            <div className="step-content">
              <h3>{t(step.titleKey)}</h3>
              <p>{t(`howItWorks.step${step.number}.description`)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust Bar */}
      <div ref={trustRef} className={`trust-bar reveal ${trustVisible ? 'visible' : ''}`}>
        {TRUST_BADGES.map((badge) => (
          <div key={badge.labelKey} className="trust-badge">
            <Icon name={badge.icon} size={20} />
            <span>{t(badge.labelKey)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
