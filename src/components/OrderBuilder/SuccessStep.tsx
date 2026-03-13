import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks';
import type { BookingFormData } from '../../types';
import { Button, Icon } from '../ui';
import {
  createHibachiEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICS,
} from '../../utils';

interface SuccessStepProps {
  formData: BookingFormData;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ formData }) => {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();

  const calendarEvent = createHibachiEvent(
    formData.date,
    formData.time,
    formData.guestCount,
    formData.region,
    formData.name,
    undefined,
    {
      brandName: settings.brandInfo.name,
      phone: settings.contactInfo.phone,
      email: settings.contactInfo.email,
    }
  );
  const googleCalUrl = generateGoogleCalendarUrl(calendarEvent);
  const outlookCalUrl = generateOutlookCalendarUrl(calendarEvent);

  return (
    <div className="booking-success">
      <div className="success-content">
        <div className="success-icon">
          <Icon name="party" size={48} />
        </div>
        <h2>{t('form.success')}</h2>
        <p>{t('form.successMessage')}</p>
        <p className="success-email-hint">
          <Icon name="email" size={14} /> {t('form.checkEmail')}
        </p>

        <div className="booking-summary">
          <h3>
            <Icon name="clipboard" size={18} /> {t('booking.summary')}
          </h3>
          <div className="summary-item">
            <span>
              <Icon name="calendar" size={14} /> {t('form.date')}:
            </span>
            <strong>
              {new Date(formData.date + 'T00:00:00').toLocaleDateString(i18n.language, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </strong>
          </div>
          <div className="summary-item">
            <span>
              <Icon name="clock" size={14} /> {t('form.time')}:
            </span>
            <strong>{formData.time || t('common.toBeConfirmed')}</strong>
          </div>
          <div className="summary-item">
            <span>
              <Icon name="users" size={14} /> {t('form.guests')}:
            </span>
            <strong>
              {formData.guestCount} {t('form.people')}
            </strong>
          </div>
          <div className="summary-item">
            <span>
              <Icon name="map-pin" size={14} /> {t('form.region')}:
            </span>
            <strong>{formData.region.toUpperCase()}</strong>
          </div>
          {formData.orderData && (
            <>
              <div className="summary-item">
                <span>
                  <Icon name="chef" size={14} /> {t('menu.package')}:
                </span>
                <strong>{formData.orderData.packageName}</strong>
              </div>
              {formData.orderData.proteins.length > 0 && (
                <div className="summary-item">
                  <span>
                    <Icon name="steak" size={14} /> {t('order.review.proteins')}:
                  </span>
                  <strong>{formData.orderData.proteins.join(', ')}</strong>
                </div>
              )}
              {formData.orderData.addons.length > 0 && (
                <div className="summary-item">
                  <span>
                    <Icon name="plus" size={14} /> {t('order.addons')}:
                  </span>
                  <strong>
                    {formData.orderData.addons.map((a) => `${a.name} x${a.quantity}`).join(', ')}
                  </strong>
                </div>
              )}
              <div className="summary-item">
                <span>
                  <Icon name="money" size={14} /> {t('order.review.estimatedTotal')}:
                </span>
                <strong>${formData.orderData.estimatedTotal.toLocaleString()}</strong>
              </div>
            </>
          )}
        </div>

        <div className="calendar-buttons">
          <h3>
            <Icon name="calendar" size={18} /> {t('booking.addToCalendar')}
          </h3>
          <div className="calendar-options">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-btn google"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm1-8h4v2h-6V7h2v5z" />
              </svg>
              {t('booking.googleCalendar')}
            </a>
            <a
              href={outlookCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-btn outlook"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm1-13h-2v6h6v-2h-4z" />
              </svg>
              {t('booking.outlook')}
            </a>
            <button onClick={() => downloadICS(calendarEvent)} className="calendar-btn apple">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              {t('booking.appleICal')}
            </button>
          </div>
        </div>

        <div className="contact-info">
          <p>{t('form.weWillContact')}</p>
          <p>
            <Icon name="phone" size={14} /> {t('contact.phone')}:{' '}
            <strong>{settings.contactInfo.phone}</strong>
          </p>
        </div>

        <Button variant="primary" onClick={() => (window.location.href = '/')}>
          {t('common.backToHome')}
        </Button>
      </div>
    </div>
  );
};

export default SuccessStep;
