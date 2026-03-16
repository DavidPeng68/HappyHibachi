import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../components/admin';
import { isToday, formatDate } from '../../utils/adminHelpers';
import type { Booking } from '../../types/admin';

type BookingStatus = Booking['status'];

type TabFilter = 'all' | 'pending' | 'confirmed' | 'today';

export interface BookingCardViewProps {
  bookings: Booking[];
  onStatusChange?: (id: string, status: BookingStatus) => void;
  onNavigate?: (bookingId: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const BookingCardView: React.FC<BookingCardViewProps> = ({
  bookings,
  onStatusChange,
  onNavigate,
  showToast: _showToast,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: t('admin.cardView.all') },
    { key: 'pending', label: t('admin.tabs.pending') },
    { key: 'confirmed', label: t('admin.tabs.confirmed') },
    { key: 'today', label: t('admin.cardView.today') },
  ];

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return bookings.filter((b) => b.status === 'pending');
      case 'confirmed':
        return bookings.filter((b) => b.status === 'confirmed');
      case 'today':
        return bookings.filter((b) => isToday(b.date));
      default:
        return bookings;
    }
  }, [bookings, activeTab]);

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleSms = (phone: string) => {
    window.open(`sms:${phone}`);
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`);
  };

  const handleConfirm = (id: string) => {
    if (onStatusChange) {
      onStatusChange(id, 'confirmed');
    }
  };

  return (
    <div>
      {/* Status Tabs */}
      <div className="card-view-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`card-view-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p
          style={{
            color: 'var(--admin-text-muted)',
            fontSize: 14,
            textAlign: 'center',
            padding: 24,
          }}
        >
          {t('admin.cardView.noBookings')}
        </p>
      ) : (
        <div className="booking-cards">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="booking-card"
              onClick={() => onNavigate?.(b.id)}
              style={{ cursor: onNavigate ? 'pointer' : undefined }}
            >
              {/* Header */}
              <div className="booking-card-header">
                <span className="booking-card-name">{b.name}</span>
                <StatusBadge status={b.status} />
              </div>

              {/* Details */}
              <div className="booking-card-details">
                <div>
                  <div className="booking-card-detail-label">{t('admin.booking.date')}</div>
                  <div>{formatDate(b.date)}</div>
                </div>
                <div>
                  <div className="booking-card-detail-label">{t('admin.booking.time')}</div>
                  <div>{b.time}</div>
                </div>
                <div>
                  <div className="booking-card-detail-label">{t('admin.booking.guestCount')}</div>
                  <div>{t('admin.cardView.guests', { count: b.guestCount })}</div>
                </div>
                <div>
                  <div className="booking-card-detail-label">{t('admin.booking.region')}</div>
                  <div>{b.region}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="booking-card-actions">
                {b.status === 'pending' && onStatusChange && (
                  <button
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirm(b.id);
                    }}
                  >
                    {t('admin.cardView.confirm')}
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCall(b.phone);
                  }}
                >
                  {t('admin.manager.call')}
                </button>
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSms(b.phone);
                  }}
                >
                  {t('admin.manager.sms')}
                </button>
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmail(b.email);
                  }}
                >
                  {t('admin.manager.email')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingCardView;
