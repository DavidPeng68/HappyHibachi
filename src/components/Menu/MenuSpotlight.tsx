import React from 'react';
import type { MenuSpotlight as MenuSpotlightType, TranslatableText } from '../../types';
import './MenuSpotlight.css';

interface MenuSpotlightProps {
  spotlights: MenuSpotlightType[];
  getLocalizedText: (text: TranslatableText) => string;
}

const MenuSpotlight: React.FC<MenuSpotlightProps> = ({ spotlights, getLocalizedText }) => {
  const visible = spotlights.filter((s) => s.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  if (visible.length === 0) return null;

  return (
    <div className="menu-spotlight-section">
      {visible.map((spotlight) => (
        <div key={spotlight.id} className="spotlight-item">
          <div className="spotlight-image">
            {spotlight.imageUrl ? (
              <img
                src={spotlight.imageUrl}
                alt={getLocalizedText(spotlight.title)}
                loading="lazy"
              />
            ) : (
              <div className="spotlight-placeholder" />
            )}
          </div>
          <div className="spotlight-content">
            <h3 className="spotlight-title">{getLocalizedText(spotlight.title)}</h3>
            <p className="spotlight-subtitle">{getLocalizedText(spotlight.subtitle)}</p>
            {spotlight.videoUrl && (
              <div className="spotlight-video">
                <iframe
                  src={spotlight.videoUrl}
                  title={getLocalizedText(spotlight.title)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MenuSpotlight;
