import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { Calendar } from '../components';
import { REGIONS, PRICING } from '../constants';
import { useSettings, useMenu, useOrder } from '../hooks';
import { submitBooking } from '../services/api';
import type { BookingFormData, BookingOrderData } from '../types';
import { Button, Input, Select, Textarea, Icon } from '../components/ui';
import {
  createHibachiEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICS,
} from '../utils';
import {
  validateEmail as validateEmailUtil,
  validatePhone as validatePhoneUtil,
} from '../utils/validation';
import './BookNow.css';

/**
 * Book Now page component
 * Full booking form with region selection and calendar
 * Note: This is reservation only, no payment processing
 */
const BookNow: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { settings } = useSettings();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guestCount: 10,
    region: '',
    message: '',
    couponCode: '',
    referralCode: '',
    referralSource: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});
  const [couponStatus, setCouponStatus] = useState<{
    valid: boolean;
    message: string;
    discount?: string;
  } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [referralStatus, setReferralStatus] = useState<{
    valid: boolean;
    message: string;
    discount?: number;
  } | null>(null);
  const [checkingReferral, setCheckingReferral] = useState(false);

  const { order, clearOrder } = useOrder();
  const { menu, getLocalizedText } = useMenu();

  const timeSlots = settings.timeSlots;
  const couponsEnabled = settings.featureToggles.coupons;
  const referralEnabled = settings.featureToggles.referralProgram;

  // Prefill from order context (menu → booking flow)
  useEffect(() => {
    if (order.guestCount > 0) {
      setFormData((prev) => ({ ...prev, guestCount: order.guestCount + order.kidsCount }));
    }
    if (order.packageId && menu) {
      const pkg = menu.packages.find((p) => p.id === order.packageId);
      const total = menu
        ? (() => {
            // Quick inline total for display
            let t = 0;
            if (pkg) {
              if (pkg.flatPrice != null) {
                t = pkg.flatPrice;
              } else {
                t += pkg.pricePerPerson * order.guestCount;
                const kidsRate = pkg.kidsPrice ?? menu.pricing.kidsPrice;
                t += kidsRate * order.kidsCount;
              }
            }
            return t;
          })()
        : 0;

      // Protein names
      const proteins = order.proteinSelections
        .map((id) => {
          const item = menu.items.find((i) => i.id === id);
          if (!item) return null;
          const label = getLocalizedText(item.name);
          return item.priceType === 'upgrade'
            ? `${label} (+$${item.price}/person)`
            : `${label} (included)`;
        })
        .filter(Boolean);

      // Addon names
      const addons = order.addons
        .map((a) => {
          const item = menu.items.find((i) => i.id === a.menuItemId);
          return item ? `${getLocalizedText(item.name)} x${a.quantity}` : null;
        })
        .filter(Boolean);

      const lines = [
        pkg
          ? `Package: ${getLocalizedText(pkg.name)} (${pkg.flatPrice != null ? `$${pkg.flatPrice}` : `$${pkg.pricePerPerson}/person`})`
          : '',
        `Guests: ${order.guestCount} adults${order.kidsCount > 0 ? ` + ${order.kidsCount} kids` : ''}`,
        pkg ? `Service: ${pkg.serviceType}, ${pkg.serviceDuration} min` : '',
        proteins.length ? `Proteins: ${proteins.join(', ')}` : '',
        addons.length ? `Add-ons: ${addons.join(', ')}` : '',
        total > 0 ? `Estimated Total: $${total.toLocaleString()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (lines) {
        setFormData((prev) => ({
          ...prev,
          message: prev.message ? `${prev.message}\n\n${lines}` : lines,
        }));
      }

      // Build structured order data for API
      if (pkg) {
        const orderData: BookingOrderData = {
          packageName: getLocalizedText(pkg.name),
          priceModel:
            pkg.flatPrice != null ? `$${pkg.flatPrice} flat` : `$${pkg.pricePerPerson}/person`,
          guestCount: order.guestCount,
          kidsCount: order.kidsCount,
          serviceType: pkg.serviceType,
          serviceDuration: pkg.serviceDuration,
          proteins: order.proteinSelections
            .map((id) => menu.items.find((i) => i.id === id))
            .filter(Boolean)
            .map((item) => getLocalizedText(item!.name)),
          addons: order.addons
            .map((a) => {
              const item = menu.items.find((i) => i.id === a.menuItemId);
              return item
                ? { name: getLocalizedText(item.name), quantity: a.quantity, unitPrice: item.price }
                : null;
            })
            .filter((a): a is NonNullable<typeof a> => a !== null),
          estimatedTotal: total,
        };
        setFormData((prev) => ({ ...prev, orderData }));
      }
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    return validateEmailUtil(email);
  };

  const validatePhone = (phone: string): boolean => {
    return validatePhoneUtil(phone);
  };

  // 验证优惠码
  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponStatus(null);
      return;
    }
    setCheckingCoupon(true);
    try {
      const response = await fetch(`/api/coupons?code=${encodeURIComponent(code.trim())}`);
      const result = await response.json();
      if (result.success && result.coupon) {
        const coupon = result.coupon;
        if (coupon.minGuests > 0 && formData.guestCount < coupon.minGuests) {
          setCouponStatus({
            valid: false,
            message:
              t('coupon.minGuests', { count: coupon.minGuests }) ||
              `Minimum ${coupon.minGuests} guests required`,
          });
        } else {
          const discount = coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`;
          setCouponStatus({
            valid: true,
            message: t('coupon.applied', { discount }) || `Coupon applied! Discount: ${discount}`,
            discount,
          });
        }
      } else {
        setCouponStatus({
          valid: false,
          message: result.error || t('coupon.invalid'),
        });
      }
    } catch {
      setCouponStatus({
        valid: false,
        message: t('coupon.checkFailed'),
      });
    }
    setCheckingCoupon(false);
  };

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralStatus(null);
      return;
    }
    setCheckingReferral(true);
    try {
      const response = await fetch(`/api/referral?code=${encodeURIComponent(code.trim())}`);
      const result = await response.json();
      if (result.success && result.referral) {
        setReferralStatus({
          valid: true,
          message: t('referral.codeApplied'),
          discount: result.referral.friendDiscount,
        });
      } else {
        setReferralStatus({
          valid: false,
          message: result.error || t('referral.codeInvalid'),
        });
      }
    } catch {
      setReferralStatus({
        valid: false,
        message: t('referral.checkFailed'),
      });
    }
    setCheckingReferral(false);
  };

  // Handle hash-based region selection
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && REGIONS.some((r) => r.id === hash)) {
      setSelectedRegion(hash);
      setFormData((prev) => ({ ...prev, region: hash }));

      // Scroll to the form
      setTimeout(() => {
        const formElement = document.getElementById('booking-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.hash]);

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegion(regionId);
    setFormData((prev) => ({ ...prev, region: regionId }));
  };

  const handleDateSelect = (date: string) => {
    setFormData((prev) => ({ ...prev, date }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'guestCount' ? parseInt(value, 10) || 0 : value,
    }));

    // Real-time validation
    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setValidationErrors((prev) => ({ ...prev, email: t('form.invalidEmail') as string }));
      } else {
        setValidationErrors((prev) => ({ ...prev, email: undefined }));
      }
    }

    if (name === 'phone') {
      if (value && !validatePhone(value)) {
        setValidationErrors((prev) => ({ ...prev, phone: t('form.invalidPhone') as string }));
      } else {
        setValidationErrors((prev) => ({ ...prev, phone: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation check
    const emailValid = validateEmail(formData.email);
    const phoneValid = validatePhone(formData.phone);

    if (!emailValid || !phoneValid) {
      setValidationErrors({
        email: !emailValid ? (t('form.invalidEmail') as string) : undefined,
        phone: !phoneValid ? (t('form.invalidPhone') as string) : undefined,
      });
      // Scroll to first error field
      setTimeout(() => {
        document
          .querySelector('.input-error')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await submitBooking(formData);

      if (result.success) {
        setSubmitStatus('success');
        clearOrder();
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || (t('form.error') as string));
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(t('form.error') as string);
    }

    setIsSubmitting(false);
  };

  if (submitStatus === 'success') {
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
      <div className="book-now">
        <SEO title={t('nav.bookNow')} />
        <div className="booking-success">
          <div className="success-content">
            <div className="success-icon">
              <Icon name="party" size={48} />
            </div>
            <h2>{t('form.success')}</h2>
            <p>{t('form.successMessage')}</p>

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
                        {formData.orderData.addons
                          .map((a) => `${a.name} x${a.quantity}`)
                          .join(', ')}
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
      </div>
    );
  }

  return (
    <div className="book-now">
      <SEO title={t('nav.bookNow')} description={t('bookNow.subtitle')} />

      <div className="book-container">
        {/* Header */}
        <div className="book-header">
          <h1>{t('bookNow.title')}</h1>
          <p>{t('bookNow.selectRegion')}</p>
        </div>
        {/* Region Selection */}
        <section className="region-selection">
          <div className="region-grid">
            {REGIONS.map((region) => (
              <div
                key={region.id}
                id={region.id}
                className={`region-card ${selectedRegion === region.id ? 'selected' : ''}`}
                onClick={() => handleRegionSelect(region.id)}
              >
                <h3>{t(`nav.${region.id}`, region.name)}</h3>
                <p>
                  {region.cities
                    .slice(0, 8)
                    .map((c) => c.name)
                    .join(', ')}
                  ...
                </p>
                <Button variant={selectedRegion === region.id ? 'primary' : 'outline'} size="sm">
                  {selectedRegion === region.id ? '✓' : t('form.selectOption')}
                </Button>
              </div>
            ))}
          </div>
        </section>
        {/* Booking Form */}
        {selectedRegion && (
          <section className="booking-form-section" id="booking-form">
            <h2>{t('bookNow.formTitle')}</h2>
            <p className="form-subtitle">
              {t('form.region')}:{' '}
              <strong>
                {t(
                  `nav.${selectedRegion}`,
                  REGIONS.find((r) => r.id === selectedRegion)?.name ?? ''
                )}
              </strong>
            </p>

            <div className="pricing-reminder">
              <span className="price">
                ${PRICING.PER_PERSON}/{t('pricing.perPerson')}
              </span>
              <span className="minimum">
                ${PRICING.MINIMUM_ORDER} {t('pricing.minimum')}
              </span>
            </div>

            <div className="booking-content">
              {/* Calendar */}
              <div className="calendar-sidebar">
                <h3>{t('form.date')} *</h3>
                <Calendar
                  selectedDate={formData.date}
                  onDateSelect={handleDateSelect}
                  region={selectedRegion}
                />
                {formData.date && (
                  <p className="selected-date">
                    ✓{' '}
                    {new Date(formData.date + 'T00:00:00').toLocaleDateString(i18n.language, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Form */}
              <form className="booking-form" onSubmit={handleSubmit}>
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
                    error={validationErrors.email}
                    required
                  />

                  <Input
                    label={t('form.phone')}
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={validationErrors.phone}
                    required
                  />
                </div>
                <Select
                  label={t('form.time')}
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  options={[
                    { value: '', label: t('form.selectOption') as string },
                    ...timeSlots.map((slot) => ({
                      value: slot.id,
                      label: `${t(`timeSlot.${slot.id}`, slot.label)} (${slot.startTime} - ${slot.endTime})`,
                    })),
                  ]}
                />
                <Input
                  label={t('form.guests')}
                  type="number"
                  name="guestCount"
                  value={formData.guestCount.toString()}
                  onChange={handleChange}
                  min={10}
                  hint={`${t('form.guestsHint')} ($${PRICING.MINIMUM_ORDER})`}
                  required
                />
                <Textarea
                  label={t('form.message')}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('form.messagePlaceholder') as string}
                  rows={3}
                />
                {/* 推荐来源 */}
                <Select
                  label={t('form.referralSource')}
                  name="referralSource"
                  value={formData.referralSource || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: t('form.selectOption') as string },
                    { value: 'google', label: t('form.referral.google') as string },
                    { value: 'instagram', label: 'Instagram' },
                    { value: 'facebook', label: 'Facebook' },
                    { value: 'tiktok', label: 'TikTok' },
                    { value: 'yelp', label: 'Yelp' },
                    { value: 'friend', label: t('form.referral.friend') as string },
                    { value: 'event', label: t('form.referral.event') as string },
                    { value: 'other', label: t('form.referral.other') as string },
                  ]}
                />
                {/* 优惠码 */}
                {couponsEnabled && (
                  <>
                    <div className="coupon-field">
                      <Input
                        label={t('form.couponCode')}
                        name="couponCode"
                        value={formData.couponCode || ''}
                        onChange={(e) => {
                          handleChange(e);
                          setCouponStatus(null);
                        }}
                        placeholder={t('form.couponPlaceholder') as string}
                      />
                      <button
                        type="button"
                        className="coupon-check-btn"
                        onClick={() => validateCoupon(formData.couponCode || '')}
                        disabled={checkingCoupon || !formData.couponCode?.trim()}
                      >
                        {checkingCoupon ? '...' : t('form.applyCoupon')}
                      </button>
                    </div>
                    {couponStatus && (
                      <div
                        className={`coupon-status ${couponStatus.valid ? 'valid' : 'invalid'}`}
                        role="status"
                      >
                        <span aria-label={couponStatus.valid ? 'Valid' : 'Invalid'}>
                          <Icon name={couponStatus.valid ? 'check' : 'close'} size={14} />
                        </span>{' '}
                        {couponStatus.message}
                      </div>
                    )}
                  </>
                )}
                {referralEnabled && (
                  <>
                    <div className="coupon-field">
                      <Input
                        label={t('form.referralCode')}
                        name="referralCode"
                        value={formData.referralCode || ''}
                        onChange={(e) => {
                          handleChange(e);
                          setReferralStatus(null);
                        }}
                        placeholder={t('form.referralPlaceholder') as string}
                      />
                      <button
                        type="button"
                        className="coupon-check-btn"
                        onClick={() => validateReferralCode(formData.referralCode || '')}
                        disabled={checkingReferral || !formData.referralCode?.trim()}
                      >
                        {checkingReferral ? '...' : t('form.applyReferral')}
                      </button>
                    </div>
                    {referralStatus && (
                      <div
                        className={`coupon-status ${referralStatus.valid ? 'valid' : 'invalid'}`}
                        role="status"
                      >
                        <span aria-label={referralStatus.valid ? 'Valid' : 'Invalid'}>
                          <Icon name={referralStatus.valid ? 'check' : 'close'} size={14} />
                        </span>{' '}
                        {referralStatus.message}
                      </div>
                    )}
                  </>
                )}
                {/* Hidden date field */}
                <input type="hidden" name="date" value={formData.date} />
                {!formData.date && <div className="form-hint">← {t('form.date')}</div>}
                {submitStatus === 'error' && (
                  <div className="form-error">{errorMessage || t('form.error')}</div>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  disabled={!formData.date || !!validationErrors.email || !!validationErrors.phone}
                  className="submit-btn"
                >
                  {isSubmitting ? t('form.submitting') : t('form.submitReservation')}
                </Button>{' '}
                <p className="no-payment-note">{t('form.noPaymentRequired')}</p>
              </form>
            </div>
          </section>
        )}{' '}
        {/* Contact Info */}
        <section className="booking-contact">
          <h3>{t('contact.title')}</h3>
          <p>
            {t('contact.phone')}: <strong>{settings.contactInfo.phone}</strong>
          </p>
          <p>
            {t('contact.email')}: <strong>{settings.contactInfo.email}</strong>
          </p>
        </section>
      </div>
    </div>
  );
};
export default BookNow;
