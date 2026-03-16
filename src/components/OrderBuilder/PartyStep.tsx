import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { REGIONS, PRICING } from '../../constants';
import type { MenuPackage, TranslatableText } from '../../types';
import { MenuPackageCard } from '../Menu';
import { Select, Icon } from '../ui';

interface PartyStepProps {
  guestCount: number;
  kidsCount: number;
  onGuestCountChange: (count: number) => void;
  onKidsCountChange: (count: number) => void;
  packages: MenuPackage[];
  selectedPackageId: string | null;
  onSelectPackage: (id: string) => void;
  getLocalizedText: (text: TranslatableText) => string;
  selectedRegion: string;
  onRegionSelect: (region: string) => void;
  onSkipToBooking: () => void;
  regionHighlight?: boolean;
}

const PartyStep: React.FC<PartyStepProps> = ({
  guestCount,
  kidsCount,
  onGuestCountChange,
  onKidsCountChange,
  packages,
  selectedPackageId,
  onSelectPackage,
  getLocalizedText,
  selectedRegion,
  onRegionSelect,
  onSkipToBooking,
  regionHighlight,
}) => {
  const { t } = useTranslation();
  const totalGuests = guestCount + kidsCount;
  const minGuests = Math.ceil(PRICING.MINIMUM_ORDER / PRICING.PER_PERSON);
  const belowMinimum = totalGuests < minGuests;
  const [guestAdjustedMsg, setGuestAdjustedMsg] = useState('');

  // Clear message on unmount or after timeout
  useEffect(() => {
    if (!guestAdjustedMsg) return;
    const timer = setTimeout(() => setGuestAdjustedMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [guestAdjustedMsg]);

  // Real-time price estimate
  const selectedPkg = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );

  const estimate = useMemo(() => {
    if (!selectedPkg) return null;
    const adultCost = guestCount * selectedPkg.pricePerPerson;
    const kidsCost = kidsCount * (selectedPkg.kidsPrice ?? PRICING.KIDS_PRICE);
    const raw = adultCost + kidsCost;
    const total = Math.max(raw, PRICING.MINIMUM_ORDER);
    return { total, minimumApplied: raw < PRICING.MINIMUM_ORDER };
  }, [selectedPkg, guestCount, kidsCount]);

  const regionOptions = [
    { value: '', label: t('form.selectRegion') as string },
    ...REGIONS.map((r) => ({ value: r.id, label: t(`nav.${r.id}`) as string })),
  ];

  return (
    <div className="step-section">
      <h3 className="step-title">{t('order.step1.title')}</h3>

      {/* Region Dropdown */}
      <div className={`region-select-wrapper ${regionHighlight ? 'region-select-highlight' : ''}`}>
        <Select
          label={t('form.region') + ' *'}
          name="region"
          value={selectedRegion}
          onChange={(e) => onRegionSelect(e.target.value)}
          options={regionOptions}
          required
        />
        {regionHighlight && (
          <div className="region-hint">
            <Icon name="warning" size={14} />
            {t('order.regionRequired')}
          </div>
        )}
      </div>

      {/* Guest Count Steppers */}
      <div className="guest-steppers">
        <div className="guest-stepper">
          <label className="stepper-label" id="adults-label">
            {t('order.adults')}
          </label>
          <div
            className="stepper-controls"
            role="spinbutton"
            aria-labelledby="adults-label"
            aria-valuenow={guestCount}
            aria-valuemin={1}
            aria-valuemax={100}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                onGuestCountChange(guestCount + 1);
              }
              if (e.key === 'ArrowDown' && guestCount > 1) {
                e.preventDefault();
                onGuestCountChange(guestCount - 1);
              }
            }}
          >
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onGuestCountChange(guestCount - 1)}
              disabled={guestCount <= 1}
              aria-label={t('order.decreaseAdults')}
              tabIndex={-1}
            >
              −
            </button>
            <span className="stepper-value">{guestCount}</span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onGuestCountChange(guestCount + 1)}
              aria-label={t('order.increaseAdults')}
              tabIndex={-1}
            >
              +
            </button>
          </div>
        </div>
        <div className="guest-stepper">
          <label className="stepper-label" id="kids-label">
            {t('order.kids')}
          </label>
          <div
            className="stepper-controls"
            role="spinbutton"
            aria-labelledby="kids-label"
            aria-valuenow={kidsCount}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                onKidsCountChange(kidsCount + 1);
              }
              if (e.key === 'ArrowDown' && kidsCount > 0) {
                e.preventDefault();
                onKidsCountChange(kidsCount - 1);
              }
            }}
          >
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onKidsCountChange(kidsCount - 1)}
              disabled={kidsCount <= 0}
              aria-label={t('order.decreaseKids')}
              tabIndex={-1}
            >
              −
            </button>
            <span className="stepper-value">{kidsCount}</span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onKidsCountChange(kidsCount + 1)}
              aria-label={t('order.increaseKids')}
              tabIndex={-1}
            >
              +
            </button>
          </div>
        </div>
        <div className="guest-total">
          {t('order.totalGuests')}: <strong>{totalGuests}</strong> {t('menu.guests')}
        </div>
        {belowMinimum && (
          <div className="guest-minimum-warning">
            <Icon name="warning" size={14} />
            {t('order.minimumGuests', { count: minGuests })}
          </div>
        )}
        {estimate && (
          <div className="guest-estimate">
            <Icon name="money" size={16} />
            <strong>{t('order.estimatedPrice', { amount: estimate.total })}</strong>
            {estimate.minimumApplied && (
              <span className="guest-estimate-minimum">
                {t('order.minimumExplanation', { minimum: PRICING.MINIMUM_ORDER })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Package Selection */}
      <h4 className="step-subtitle">{t('order.choosePackage')}</h4>
      {guestAdjustedMsg && (
        <div className="guest-adjusted-msg">
          <Icon name="check" size={14} />
          {guestAdjustedMsg}
        </div>
      )}
      <div className="package-grid">
        {packages.map((pkg) => {
          const withinRange =
            totalGuests >= pkg.minGuests && (pkg.maxGuests == null || totalGuests <= pkg.maxGuests);

          const handleSelect = () => {
            if (withinRange) {
              onSelectPackage(pkg.id);
            } else {
              const target = totalGuests < pkg.minGuests ? pkg.minGuests : pkg.maxGuests!;
              onGuestCountChange(target);
              onSelectPackage(pkg.id);
              setGuestAdjustedMsg(t('order.guestAdjustedTo', { count: target }));
            }
          };

          return (
            <div
              key={pkg.id}
              className={`package-wrapper ${!withinRange ? 'package-disabled' : ''}`}
            >
              <MenuPackageCard
                pkg={pkg}
                isSelected={selectedPackageId === pkg.id}
                onSelect={handleSelect}
                getLocalizedText={getLocalizedText}
              />
              {!withinRange && (
                <div className="package-range-hint">
                  {pkg.maxGuests
                    ? t('order.guestRange', { min: pkg.minGuests, max: pkg.maxGuests })
                    : t('order.guestMin', { min: pkg.minGuests })}
                  <button type="button" className="package-adjust-btn" onClick={handleSelect}>
                    {t('order.adjustGuests')}
                  </button>
                </div>
              )}
              {pkg.serviceDuration > 0 && (
                <div className="package-service-info">
                  {pkg.serviceDuration} min · {pkg.serviceType}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skip Button */}
      {selectedRegion && (
        <button type="button" className="skip-menu-btn" onClick={onSkipToBooking}>
          <Icon name="chevron-right" size={16} />
          {t('order.skipMenu')}
        </button>
      )}
    </div>
  );
};

export default PartyStep;
