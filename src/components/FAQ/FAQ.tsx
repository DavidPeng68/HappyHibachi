import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, useScrollReveal } from '../../hooks';
import { Icon } from '../ui';
import './FAQ.css';

interface FAQItem {
  id: number;
  questionKey: string;
  answerKey: string;
}

const FAQ_KEYS: FAQItem[] = [
  { id: 1, questionKey: 'faq.q1', answerKey: 'faq.a1' },
  { id: 2, questionKey: 'faq.q2', answerKey: 'faq.a2' },
  { id: 3, questionKey: 'faq.q3', answerKey: 'faq.a3' },
  { id: 4, questionKey: 'faq.q4', answerKey: 'faq.a4' },
  { id: 5, questionKey: 'faq.q5', answerKey: 'faq.a5' },
  { id: 6, questionKey: 'faq.q6', answerKey: 'faq.a6' },
  { id: 7, questionKey: 'faq.q7', answerKey: 'faq.a7' },
  { id: 8, questionKey: 'faq.q8', answerKey: 'faq.a8' },
  { id: 9, questionKey: 'faq.q9', answerKey: 'faq.a9' },
  { id: 10, questionKey: 'faq.q10', answerKey: 'faq.a10' },
];

/**
 * FAQ accordion component
 */
const FAQ: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { contactInfo } = settings;
  const [openItem, setOpenItem] = useState<number | null>(null);
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });
  const answerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const toggleItem = useCallback((id: number) => {
    setOpenItem((prev) => (prev === id ? null : id));
  }, []);

  // Precise max-height animation using scrollHeight
  const getAnswerStyle = (id: number): React.CSSProperties => {
    if (openItem !== id) return { maxHeight: 0 };
    const el = answerRefs.current[id];
    return { maxHeight: el ? el.scrollHeight + 32 : 500 };
  };

  return (
    <section className={`faq-section ${isVisible ? 'visible' : ''}`} id="faq" ref={sectionRef}>
      <div className="faq-container">
        <div className="faq-header scroll-reveal">
          <h2>{t('faq.title')}</h2>
          <p>{t('faq.subtitle')}</p>
        </div>

        <div className="faq-list">
          {FAQ_KEYS.map((item) => (
            <div key={item.id} className="faq-item">
              <button
                id={`faq-question-${item.id}`}
                className={`faq-question ${openItem === item.id ? 'active' : ''}`}
                onClick={() => toggleItem(item.id)}
                type="button"
                aria-expanded={openItem === item.id}
                aria-controls={`faq-answer-${item.id}`}
              >
                <span>{t(item.questionKey)}</span>
                <span
                  className={`faq-icon ${openItem === item.id ? 'rotated' : ''}`}
                  aria-hidden="true"
                >
                  <Icon name="chevron-down" />
                </span>
              </button>
              <div
                id={`faq-answer-${item.id}`}
                className={`faq-answer ${openItem === item.id ? 'open' : ''}`}
                role="region"
                aria-labelledby={`faq-question-${item.id}`}
                ref={(el) => {
                  answerRefs.current[item.id] = el;
                }}
                style={getAnswerStyle(item.id)}
              >
                <p>{t(item.answerKey)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="faq-cta">
          <h3>{t('contact.subtitle')}</h3>
          <p>{t('contact.title')}</p>
          <div className="faq-contact-info">
            <div className="contact-item">
              <span className="contact-label">{t('contact.phone')}:</span>
              <span className="contact-value">{contactInfo.phone}</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">{t('contact.email')}:</span>
              <span className="contact-value">{contactInfo.email}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
