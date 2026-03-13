import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useMenu, useOrder } from '../../hooks';
import { REGIONS } from '../../constants';
import StepProgressBar from './StepProgressBar';
import PartyStep from './PartyStep';
import CustomizeStep from './CustomizeStep';
import ReviewStep from './ReviewStep';
import BookingStep from './BookingStep';
import SuccessStep from './SuccessStep';
import { OrderSummary } from '../Menu';
import type { BookingFormData, BookingOrderData } from '../../types';
import './OrderBuilder.css';

const OrderBuilder: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { menu, loading, error, getLocalizedText } = useMenu();
  const {
    order,
    setGuestCount,
    setKidsCount,
    selectPackage,
    toggleProtein,
    addAddon,
    removeAddon,
    getTotal,
    clearOrder,
  } = useOrder();

  const [selectedRegion, setSelectedRegion] = useState('');
  const [skippedMenu, setSkippedMenu] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success'>('idle');
  const [successFormData, setSuccessFormData] = useState<BookingFormData | null>(null);

  const step2Ref = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  // Handle hash-based region preselection
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && REGIONS.some((r) => r.id === hash)) {
      setSelectedRegion(hash);
    }
  }, [location.hash]);

  // Determine flow state
  const hasPackage = order.packageId !== null;
  const hasRegion = selectedRegion !== '';
  const readyForBooking = hasRegion && (hasPackage || skippedMenu);

  // Dynamic step labels
  const stepLabels = useMemo(() => {
    if (skippedMenu) {
      return [t('order.step1.label'), t('order.step.bookLabel')];
    }
    return [
      t('order.step1.label'),
      t('order.step2.label'),
      t('order.step3.label'),
      t('order.step.bookLabel'),
    ];
  }, [t, skippedMenu]);

  // Determine current step number
  const currentStep = useMemo(() => {
    if (skippedMenu) {
      return readyForBooking ? 2 : 1;
    }
    if (!hasPackage) return 1;
    if (order.proteinSelections.length === 0 && order.addons.length === 0) return 2;
    if (!readyForBooking) return 3;
    return 4;
  }, [
    hasPackage,
    skippedMenu,
    readyForBooking,
    order.proteinSelections.length,
    order.addons.length,
  ]);

  // Get visible packages
  const visiblePackages = useMemo(() => {
    if (!menu) return [];
    return menu.packages.filter((p) => p.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [menu]);

  const selectedPkg = menu?.packages.find((p) => p.id === order.packageId) ?? null;
  const total = getTotal(menu);

  // Auto-scroll to step 2 when package is selected
  const prevPackageId = useRef(order.packageId);
  useEffect(() => {
    if (order.packageId && !prevPackageId.current) {
      step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevPackageId.current = order.packageId;
  }, [order.packageId]);

  const handleSelectPackage = (pkgId: string) => {
    setSkippedMenu(false);
    selectPackage(pkgId);
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
  };

  const step1Ref = useRef<HTMLDivElement>(null);

  const handleSkipToBooking = () => {
    setSkippedMenu(true);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditParty = useCallback(() => {
    step1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleEditCustomize = useCallback(() => {
    step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleBookingSuccess = (formData: BookingFormData) => {
    setSuccessFormData(formData);
    setSubmitStatus('success');
    clearOrder();
  };

  // Build orderData and message for BookingStep
  const orderData = useMemo((): BookingOrderData | undefined => {
    if (!selectedPkg || !menu || skippedMenu) return undefined;
    return {
      packageName: getLocalizedText(selectedPkg.name),
      priceModel:
        selectedPkg.flatPrice != null
          ? `$${selectedPkg.flatPrice} flat`
          : `$${selectedPkg.pricePerPerson}/person`,
      guestCount: order.guestCount,
      kidsCount: order.kidsCount,
      serviceType: selectedPkg.serviceType,
      serviceDuration: selectedPkg.serviceDuration,
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
  }, [selectedPkg, menu, skippedMenu, order, total, getLocalizedText]);

  const orderMessage = useMemo((): string => {
    if (!selectedPkg || !menu || skippedMenu) return '';
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
    const addons = order.addons
      .map((a) => {
        const item = menu.items.find((i) => i.id === a.menuItemId);
        return item ? `${getLocalizedText(item.name)} x${a.quantity}` : null;
      })
      .filter(Boolean);
    return [
      `Package: ${getLocalizedText(selectedPkg.name)} (${selectedPkg.flatPrice != null ? `$${selectedPkg.flatPrice}` : `$${selectedPkg.pricePerPerson}/person`})`,
      `Guests: ${order.guestCount} adults${order.kidsCount > 0 ? ` + ${order.kidsCount} kids` : ''}`,
      `Service: ${selectedPkg.serviceType}, ${selectedPkg.serviceDuration} min`,
      proteins.length ? `Proteins: ${proteins.join(', ')}` : '',
      addons.length ? `Add-ons: ${addons.join(', ')}` : '',
      total > 0 ? `Estimated Total: $${total.toLocaleString()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [selectedPkg, menu, skippedMenu, order, total, getLocalizedText]);

  // Success state
  if (submitStatus === 'success' && successFormData) {
    return (
      <div className="order-builder">
        <SuccessStep formData={successFormData} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-builder">
        <div className="order-builder__loading">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text short" />
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="order-builder">
        <div className="order-builder__error">{t('menu.loadError')}</div>
      </div>
    );
  }

  return (
    <div className="order-builder">
      <div className="order-builder__header">
        <h2 className="order-builder__title">{t('order.title')}</h2>
        <StepProgressBar steps={stepLabels} currentStep={currentStep} />
      </div>

      <div className="order-builder__layout">
        <div className="order-builder__main">
          {/* Step 1: Party Size + Region + Package */}
          <div ref={step1Ref}>
            <PartyStep
              guestCount={order.guestCount}
              kidsCount={order.kidsCount}
              onGuestCountChange={setGuestCount}
              onKidsCountChange={setKidsCount}
              packages={visiblePackages}
              selectedPackageId={order.packageId}
              onSelectPackage={handleSelectPackage}
              getLocalizedText={getLocalizedText}
              selectedRegion={selectedRegion}
              onRegionSelect={handleRegionSelect}
              onSkipToBooking={handleSkipToBooking}
            />
          </div>

          {/* Step 2: Customize (visible after package selection, not when skipped) */}
          {selectedPkg && !skippedMenu && (
            <div ref={step2Ref}>
              <CustomizeStep
                pkg={selectedPkg}
                categories={menu.categories}
                items={menu.items}
                proteinSelections={order.proteinSelections}
                addons={order.addons}
                onToggleProtein={toggleProtein}
                onAddAddon={addAddon}
                onRemoveAddon={removeAddon}
                getLocalizedText={getLocalizedText}
              />
            </div>
          )}

          {/* Step 3: Review (visible after package selection, not when skipped) */}
          {selectedPkg && !skippedMenu && (
            <ReviewStep
              pkg={selectedPkg}
              menu={menu}
              guestCount={order.guestCount}
              kidsCount={order.kidsCount}
              proteinSelections={order.proteinSelections}
              addons={order.addons
                .map((a) => {
                  const item = menu.items.find((i) => i.id === a.menuItemId);
                  return item
                    ? {
                        name: getLocalizedText(item.name),
                        quantity: a.quantity,
                        unitPrice: item.price,
                      }
                    : null;
                })
                .filter((a): a is NonNullable<typeof a> => a !== null)}
              total={total}
              getLocalizedText={getLocalizedText}
              onEditParty={handleEditParty}
              onEditCustomize={handleEditCustomize}
            />
          )}

          {/* Booking Step (visible when ready) */}
          {readyForBooking && (
            <div ref={bookingRef}>
              <BookingStep
                region={selectedRegion}
                guestCount={order.guestCount}
                kidsCount={order.kidsCount}
                orderData={orderData}
                orderMessage={orderMessage}
                onSuccess={handleBookingSuccess}
              />
            </div>
          )}
        </div>

        {/* Sidebar: OrderSummary (only when package selected) */}
        {selectedPkg && !skippedMenu && (
          <OrderSummary
            menu={menu}
            getLocalizedText={getLocalizedText}
            onGoToBooking={() => {
              if (!hasRegion) {
                step1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else {
                bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default OrderBuilder;
