import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/common';
import { Button, Input, Icon, type IconName } from '../components/ui';
import { useSettings } from '../hooks';
import './MyBooking.css';

interface BookingResult {
  id: string;
  name: string;
  date: string;
  time: string;
  guestCount: number;
  region: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

const MyBooking: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { contactInfo } = settings;

  const statusMap: Record<string, { label: string; cssClass: string; icon: IconName }> = {
    pending: { label: t('status.pending'), cssClass: 'status-badge--pending', icon: 'pending' },
    confirmed: { label: t('status.confirmed'), cssClass: 'status-badge--confirmed', icon: 'check' },
    completed: { label: t('status.completed'), cssClass: 'status-badge--completed', icon: 'party' },
    cancelled: {
      label: t('status.cancelled'),
      cssClass: 'status-badge--cancelled',
      icon: 'cancelled',
    },
  };
  const [searchType, setSearchType] = useState<'email' | 'phone'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingResult[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    setBookings(null);

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [searchType]: searchValue.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBookings(result.bookings);
        if (result.bookings.length === 0) {
          setError(t('myBooking.noResults'));
        }
      } else {
        setError(result.error || t('myBooking.error'));
      }
    } catch {
      setError(t('myBooking.error'));
    }

    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="my-booking-page">
      <SEO title={t('myBooking.title')} />

      <div className="my-booking-container">
        <div className="my-booking-header">
          <h1>
            <Icon name="clipboard" size={24} /> {t('myBooking.title')}
          </h1>
          <p>{t('myBooking.subtitle')}</p>
        </div>

        {/* 搜索表单 */}
        <div className="search-card">
          <div className="search-tabs">
            <button
              className={`tab ${searchType === 'email' ? 'active' : ''}`}
              onClick={() => setSearchType('email')}
            >
              <Icon name="email" size={14} /> {t('form.email')}
            </button>
            <button
              className={`tab ${searchType === 'phone' ? 'active' : ''}`}
              onClick={() => setSearchType('phone')}
            >
              <Icon name="mobile" size={14} /> {t('form.phone')}
            </button>
          </div>

          <form onSubmit={handleSearch} className="search-form">
            <Input
              type={searchType === 'email' ? 'email' : 'tel'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                searchType === 'email'
                  ? t('myBooking.emailPlaceholder')
                  : t('myBooking.phonePlaceholder')
              }
              required
            />
            <Button type="submit" variant="primary" loading={loading} fullWidth>
              {loading ? t('myBooking.searching') : t('myBooking.search')}
            </Button>
          </form>

          {error && <div className="search-error">{error}</div>}
        </div>

        {/* 搜索结果 */}
        {bookings && bookings.length > 0 && (
          <div className="results-section">
            <h2>
              {t('myBooking.results')} ({bookings.length})
            </h2>
            <div className="bookings-list">
              {bookings.map((booking) => {
                const status = statusMap[booking.status];
                const isPast = new Date(booking.date) < new Date();

                return (
                  <div key={booking.id} className={`booking-card ${isPast ? 'past' : ''}`}>
                    <div className={`booking-status ${status.cssClass}`}>
                      <Icon name={status.icon} size={14} /> {status.label}
                    </div>

                    <div className="booking-details">
                      <div className="booking-main">
                        <h3>{booking.name}</h3>
                        <p className="booking-date">{formatDate(booking.date)}</p>
                      </div>

                      <div className="booking-info">
                        <div className="info-item">
                          <span className="label">⏰ {t('form.time')}</span>
                          <span className="value">{booking.time || t('common.toBeConfirmed')}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">
                            <Icon name="users" size={14} /> {t('form.guests')}
                          </span>
                          <span className="value">
                            {booking.guestCount} {t('form.people')}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">
                            <Icon name="map-pin" size={14} /> {t('form.region')}
                          </span>
                          <span className="value">{booking.region.toUpperCase()}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">
                            <Icon name="tag" size={14} /> {t('myBooking.bookingId')}
                          </span>
                          <span className="value">#{booking.id}</span>
                        </div>
                      </div>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="booking-note">
                        <Icon name="lightbulb" size={14} /> {t('myBooking.pendingNote')}
                      </div>
                    )}

                    {booking.status === 'confirmed' && !isPast && (
                      <div className="booking-note confirmed">
                        <Icon name="party" size={14} /> {t('myBooking.confirmedNote')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 联系信息 */}
        <div className="contact-card">
          <h3>{t('myBooking.needHelp')}</h3>
          <p>{t('myBooking.contactUs')}</p>
          <div className="contact-links">
            <a href={`tel:${contactInfo.phone}`} className="contact-link phone">
              <Icon name="phone" size={14} /> {contactInfo.phone}
            </a>
            <a href={`mailto:${contactInfo.email}`} className="contact-link email">
              <Icon name="email" size={14} /> {contactInfo.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBooking;
