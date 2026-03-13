import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useScrollReveal } from '../../hooks';
import { REGIONS } from '../../constants';
import { Button, Icon } from '../ui';
import type { IconName } from '../ui';
import './Booking.css';

/**
 * Booking section component
 * Tab-based region selection with city details
 */
const Booking: React.FC = () => {
  const { t } = useTranslation();
  const { goToCaliforniaBooking, goToTexasBooking, goToFloridaBooking } = useAppNavigation();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const [activeTab, setActiveTab] = useState(REGIONS[0].id);

  const handleBooking = (regionId: string) => {
    switch (regionId) {
      case 'california':
        goToCaliforniaBooking();
        break;
      case 'texas':
        goToTexasBooking();
        break;
      case 'florida':
        goToFloridaBooking();
        break;
    }
  };

  const getRegionName = (regionId: string): string => {
    const key = `booking.${regionId}` as const;
    return t(key);
  };

  const getRegionIconName = (regionId: string): IconName => {
    const icons: Record<string, IconName> = {
      california: 'palm-tree',
      texas: 'cowboy',
      florida: 'wave',
    };
    return icons[regionId] || 'map-pin';
  };

  const activeRegion = REGIONS.find((r) => r.id === activeTab) || REGIONS[0];

  return (
    <section className="booking" id="booking" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`booking-container ${isVisible ? 'visible' : ''}`}>
        <div className="booking-header">
          <h2>{t('booking.title')}</h2>
          <p>{t('booking.selectRegion')}</p>
        </div>

        {/* Tab Navigation */}
        <div className="region-tabs">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              className={`region-tab ${activeTab === region.id ? 'active' : ''}`}
              onClick={() => setActiveTab(region.id)}
              type="button"
            >
              <span className="tab-icon">
                <Icon name={getRegionIconName(region.id)} size={20} />
              </span>
              <span className="tab-name">{getRegionName(region.id)}</span>
            </button>
          ))}
        </div>

        {/* Active Region Content */}
        <div className="region-content">
          <div className="region-info">
            <div className="region-icon-large">
              <Icon name={getRegionIconName(activeRegion.id)} size={48} />
            </div>
            <h3>{getRegionName(activeRegion.id)}</h3>
            <p className="region-tagline">{t(`booking.${activeRegion.id}Tagline`)}</p>
          </div>

          <div className="cities-grid">
            <h4>{t('booking.servingAreas')}</h4>
            <div className="cities-list">
              {activeRegion.cities.map((city, index) => (
                <span key={index} className="city-tag">
                  {city}
                </span>
              ))}
            </div>
          </div>

          <div className="region-cta">
            <Button variant="primary" size="lg" onClick={() => handleBooking(activeRegion.id)}>
              <Icon name="party" size={16} /> {t('booking.bookIn')}
            </Button>
            <p className="booking-note">{t('booking.note')}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="quick-links">
          <span>{t('booking.quickBook')}</span>
          {REGIONS.map((region) => (
            <button
              key={region.id}
              className="quick-link"
              onClick={() => handleBooking(region.id)}
              type="button"
            >
              <Icon name={getRegionIconName(region.id)} size={16} /> {getRegionName(region.id)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Booking;
