import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '../../components';
import { PRICING } from '../../constants';
import { useSettings } from '../../hooks';
import { submitBooking } from '../../services/api';
import type { BookingFormData, BookingOrderData } from '../../types';
import { Button, Input, Select, Textarea, Icon } from '../ui';
import {
  validateEmail as validateEmailUtil,
  validatePhone as validatePhoneUtil,
} from '../../utils/validation';

interface BookingStepProps {
  region: string;
  guestCount: number;
  kidsCount: number;
  orderData?: BookingOrderData;
  orderMessage?: string;
  onSuccess: (formData: BookingFormData) => void;
  onBack?: () => void;
}

const STORAGE_KEY = 'happyhibachi_booking_form';

const BookingStep: React.FC<BookingStepProps> = ({
  region,
  guestCount,
  kidsCount,
  orderData,
  orderMessage,
  onSuccess,
  onBack,
}) => {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();

  const totalGuests = guestCount + kidsCount;

  // Restore saved form data from sessionStorage
  const getSavedFormData = (): Partial<BookingFormData> => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return {};
  };

  const savedData = getSavedFormData();

  const [formData, setFormData] = useState<BookingFormData>({
    name: savedData.name || '',
    email: savedData.email || '',
    phone: savedData.phone || '',
    date: savedData.date || '',
    time: savedData.time || '',
    guestCount: totalGuests,
    region,
    message: orderMessage || savedData.message || '',
    couponCode: savedData.couponCode || '',
    referralCode: savedData.referralCode || '',
    referralSource: savedData.referralSource || '',
    orderData,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
  const [showExtras, setShowExtras] = useState(false);

  const timeSlots = settings.timeSlots;
  const couponsEnabled = settings.featureToggles.coupons;
  const referralEnabled = settings.featureToggles.referralProgram;

  // Auto-save form data to sessionStorage
  useEffect(() => {
    const toSave = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      date: formData.date,
      time: formData.time,
      message: formData.message,
      couponCode: formData.couponCode,
      referralCode: formData.referralCode,
      referralSource: formData.referralSource,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [
    formData.name,
    formData.email,
    formData.phone,
    formData.date,
    formData.time,
    formData.message,
    formData.couponCode,
    formData.referralCode,
    formData.referralSource,
  ]);

  // Sync region/guest changes from parent
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      region,
      guestCount: totalGuests,
      orderData,
      message: orderMessage || prev.message,
    }));
  }, [region, totalGuests, orderData, orderMessage]);

  const validateEmail = (email: string): boolean => {
    return validateEmailUtil(email);
  };

  const validatePhone = (phone: string): boolean => {
    return validatePhoneUtil(phone);
  };

  // Track which fields have been touched (for showing valid indicators)
  const emailValid = formData.email.length > 0 && validateEmail(formData.email);
  const phoneValid = formData.phone.length > 0 && validatePhone(formData.phone);

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
            message: t('coupon.minGuests', { count: coupon.minGuests }),
          });
        } else {
          const discount = coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`;
          setCouponStatus({
            valid: true,
            message: t('coupon.applied', { discount }),
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

  const handleDateSelect = (date: string) => {
    setFormData((prev) => ({ ...prev, date }));
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

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
    },
    [t]
  );

  const isFormDisabled =
    !formData.name.trim() ||
    !formData.email.trim() ||
    !formData.phone.trim() ||
    !formData.date ||
    !formData.time ||
    !!validationErrors.email ||
    !!validationErrors.phone ||
    isSubmitting;

  // Compute reason why submit is disabled
  const disabledReason = useMemo((): string | null => {
    if (!formData.name.trim()) return t('form.nameRequired');
    if (!formData.email.trim()) return t('form.emailRequired');
    if (!formData.phone.trim()) return t('form.phoneRequired');
    if (!formData.date) return t('form.selectDate');
    if (!formData.time) return t('form.selectTime');
    if (validationErrors.email) return validationErrors.email;
    if (validationErrors.phone) return validationErrors.phone;
    return null;
  }, [
    formData.name,
    formData.email,
    formData.phone,
    formData.date,
    formData.time,
    validationErrors.email,
    validationErrors.phone,
    t,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const _emailValid = validateEmail(formData.email);
    const _phoneValid = validatePhone(formData.phone);

    if (!_emailValid || !_phoneValid) {
      setValidationErrors({
        email: !_emailValid ? (t('form.invalidEmail') as string) : undefined,
        phone: !_phoneValid ? (t('form.invalidPhone') as string) : undefined,
      });
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
        sessionStorage.removeItem(STORAGE_KEY);
        onSuccess(formData);
      } else {
        setErrorMessage(result.error || (t('form.error') as string));
      }
    } catch {
      setErrorMessage(t('form.error') as string);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="step-section booking-step">
      {onBack && (
        <button type="button" className="step-back-btn" onClick={onBack}>
          ← {t('order.back')}
        </button>
      )}
      <h3 className="step-title">{t('order.step.book')}</h3>

      <div className="booking-step-info">
        <div className="booking-step-tag">
          <Icon name="map-pin" size={14} /> {region.charAt(0).toUpperCase() + region.slice(1)}
        </div>
        <div className="booking-step-tag">
          <Icon name="users" size={14} /> {totalGuests} {t('menu.guests')}
        </div>
        {orderData && (
          <div className="booking-step-tag">
            <Icon name="chef" size={14} /> {orderData.packageName}
          </div>
        )}
      </div>

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
          <h4>{t('form.date')} *</h4>
          <Calendar selectedDate={formData.date} onDateSelect={handleDateSelect} region={region} />
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
            <div>
              <Input
                label={t('form.email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={validationErrors.email}
                required
              />
              {emailValid && !validationErrors.email && (
                <div className="field-valid-indicator">
                  <Icon name="check" size={12} /> {t('form.validEmail')}
                </div>
              )}
            </div>
            <div>
              <Input
                label={t('form.phone')}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={validationErrors.phone}
                required
              />
              {phoneValid && !validationErrors.phone && (
                <div className="field-valid-indicator">
                  <Icon name="check" size={12} /> {t('form.validPhone')}
                </div>
              )}
            </div>
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
                label: `${t(`timeSlot.${slot.id}`)} (${slot.startTime} - ${slot.endTime})`,
              })),
            ]}
          />
          <p className="time-hint">{t('form.timeHint')}</p>

          <Textarea
            label={t('form.message')}
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder={t('form.messagePlaceholder') as string}
            rows={3}
          />

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

          {/* Collapsible extras: coupon + referral */}
          {(couponsEnabled || referralEnabled) && (
            <div className="booking-extras">
              <button
                type="button"
                className="extras-toggle"
                onClick={() => setShowExtras(!showExtras)}
              >
                <span className={showExtras ? 'extras-chevron open' : 'extras-chevron'}>
                  <Icon name="chevron-down" size={16} />
                </span>
                {t('form.moreOptions')}
              </button>

              {showExtras && (
                <div className="extras-content">
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
                          <Icon name={couponStatus.valid ? 'check' : 'close'} size={14} />{' '}
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
                          <Icon name={referralStatus.valid ? 'check' : 'close'} size={14} />{' '}
                          {referralStatus.message}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <input type="hidden" name="date" value={formData.date} />

          {!formData.date && <div className="form-hint">← {t('form.selectDate')}</div>}

          {errorMessage && <div className="form-error">{errorMessage}</div>}

          <div className="booking-submit-wrapper">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isFormDisabled}
              className="submit-btn"
            >
              {isSubmitting ? t('form.submitting') : t('form.submitReservation')}
            </Button>

            {isFormDisabled && disabledReason && !isSubmitting && (
              <div className="submit-disabled-reason">{disabledReason}</div>
            )}

            <p className="no-payment-note">{t('form.noPaymentRequired')}</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingStep;
