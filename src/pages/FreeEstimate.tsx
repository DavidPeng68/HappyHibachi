import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '../components/common';
import { Button, Input, Select, Textarea, Card, DatePicker } from '../components/ui';
import { REGIONS } from '../constants';
import { useSettings } from '../hooks';
import { submitEstimate } from '../services/api';
import { validateEmail, validatePhone, validateGuestCount } from '../utils/validation';
import {
  createHibachiEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICS,
} from '../utils/calendar';
import type { EstimateFormData } from '../types';
import './FreeEstimate.css';

const FreeEstimate: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { contactInfo } = settings;
  const [searchParams] = useSearchParams();

  // Pre-fill from query params (sent from Hero quick-quote)
  const prefillGuests = parseInt(searchParams.get('guests') || '', 10);
  const prefillDate = searchParams.get('date') || '';
  const prefillRegion = searchParams.get('region') || '';

  const [formData, setFormData] = useState<EstimateFormData>({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    guestCount: prefillGuests > 0 ? prefillGuests : 10,
    preferredDate: prefillDate,
    region: prefillRegion,
    additionalInfo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    phone?: string;
    guestCount?: string;
  }>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'guestCount' ? parseInt(value, 10) || 0 : value,
    }));

    if (name === 'email' && validationErrors.email) {
      setValidationErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (name === 'phone' && validationErrors.phone) {
      setValidationErrors((prev) => ({ ...prev, phone: undefined }));
    }
    if (name === 'guestCount' && validationErrors.guestCount) {
      setValidationErrors((prev) => ({ ...prev, guestCount: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email' && value && !validateEmail(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        email: t('form.invalidEmail'),
      }));
    }
    if (name === 'phone' && value && !validatePhone(value)) {
      setValidationErrors((prev) => ({
        ...prev,
        phone: t('form.invalidPhone'),
      }));
    }
    if (name === 'guestCount') {
      const count = parseInt(value, 10);
      if (!validateGuestCount(count)) {
        setValidationErrors((prev) => ({
          ...prev,
          guestCount: t('form.minGuests'),
        }));
      }
    }
  };

  const isFormValid = (): boolean => {
    return (
      formData.name.trim() !== '' &&
      validateEmail(formData.email) &&
      validatePhone(formData.phone) &&
      formData.eventType !== '' &&
      validateGuestCount(formData.guestCount) &&
      formData.preferredDate !== '' &&
      formData.region !== '' &&
      !validationErrors.email &&
      !validationErrors.phone &&
      !validationErrors.guestCount
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: typeof validationErrors = {};
    if (!validateEmail(formData.email)) {
      errors.email = t('form.invalidEmail');
    }
    if (!validatePhone(formData.phone)) {
      errors.phone = t('form.invalidPhone');
    }
    if (!validateGuestCount(formData.guestCount)) {
      errors.guestCount = t('form.minGuests');
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await submitEstimate(formData);

      if (result.success) {
        setSubmitStatus('success');
        // Fire conversion tracking events
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', {
            event_category: 'engagement',
            event_label: 'free_estimate',
            value: formData.guestCount,
          });
        }
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', {
            content_name: 'free_estimate',
            content_category: formData.eventType,
          });
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || t('form.error'));
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage(t('form.error'));
    }

    setIsSubmitting(false);
  };

  const eventTypeOptions = [
    { value: 'birthday', label: t('form.eventTypes.birthday') },
    { value: 'anniversary', label: t('form.eventTypes.anniversary') },
    { value: 'graduation', label: t('form.eventTypes.graduation') },
    { value: 'corporate', label: t('form.eventTypes.corporate') },
    { value: 'holiday', label: t('form.eventTypes.holiday') },
    { value: 'other', label: t('form.eventTypes.other') },
  ];

  const regionOptions = REGIONS.map((region) => ({
    value: region.id,
    label: t(`nav.${region.id}`, region.name),
  }));

  if (submitStatus === 'success') {
    const calendarEvent = createHibachiEvent(
      formData.preferredDate,
      undefined,
      formData.guestCount,
      formData.region,
      formData.name
    );
    const googleCalUrl = generateGoogleCalendarUrl(calendarEvent);
    const outlookCalUrl = generateOutlookCalendarUrl(calendarEvent);

    return (
      <div className="free-estimate">
        <SEO title={t('nav.freeEstimate')} />
        <div className="estimate-container">
          <Card variant="elevated" padding="lg" className="success-card">
            <div className="success-content">
              <span className="success-icon">✅</span>
              <h2>{t('form.success')}</h2>
              <p>{t('form.successMessage')}</p>
              <p className="contact-highlight">{contactInfo.phone}</p>

              <div className="calendar-buttons">
                <h3>{t('booking.addToCalendar')}</h3>
                <div className="calendar-options">
                  <a
                    href={googleCalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="calendar-btn google"
                  >
                    {t('booking.googleCalendar')}
                  </a>
                  <a
                    href={outlookCalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="calendar-btn outlook"
                  >
                    {t('booking.outlook')}
                  </a>
                  <button onClick={() => downloadICS(calendarEvent)} className="calendar-btn apple">
                    {t('booking.appleICal')}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="free-estimate">
      <SEO title={t('nav.freeEstimate')} description={t('estimate.subtitle')} />

      <div className="estimate-container">
        <div className="estimate-header">
          <h1>{t('estimate.title')}</h1>
          <p>{t('estimate.subtitle')}</p>
        </div>

        <Card variant="elevated" padding="lg" className="estimate-form-card">
          <form className="estimate-form" onSubmit={handleSubmit}>
            <Input
              label={t('form.name')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('form.namePlaceholder') as string}
              required
            />

            <div className="form-row">
              <Input
                label={t('form.email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t('form.emailPlaceholder') as string}
                error={validationErrors.email}
                required
              />

              <Input
                label={t('form.phone')}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t('form.phonePlaceholder') as string}
                error={validationErrors.phone}
                required
              />
            </div>

            <div className="form-row">
              <Select
                label={t('form.eventType')}
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                options={eventTypeOptions}
                placeholder={t('form.selectOption')}
                required
              />

              <Input
                label={t('form.guests')}
                type="number"
                name="guestCount"
                value={formData.guestCount.toString()}
                onChange={handleChange}
                onBlur={handleBlur}
                min={10}
                error={validationErrors.guestCount}
                hint={t('form.guestsHint') as string}
                required
              />
            </div>

            <div className="form-row">
              <DatePicker
                label={t('form.date')}
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                required
              />

              <Select
                label={t('form.region')}
                name="region"
                value={formData.region}
                onChange={handleChange}
                options={regionOptions}
                placeholder={t('form.selectOption')}
                required
              />
            </div>

            <Textarea
              label={t('form.message')}
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              placeholder={t('form.messagePlaceholder') as string}
              rows={4}
            />

            {submitStatus === 'error' && (
              <div className="form-status error">
                <p>{errorMessage || t('form.error')}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!isFormValid() || isSubmitting}
            >
              {isSubmitting ? t('form.submitting') : t('form.submit')}
            </Button>
          </form>
        </Card>

        <div className="estimate-contact">
          <p>
            {t('contact.phone')}: <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>
          </p>
          <p>
            {t('contact.email')}: <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FreeEstimate;
