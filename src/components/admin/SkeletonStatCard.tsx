import React from 'react';

const SkeletonStatCard: React.FC = () => (
  <div className="skeleton-stat-card">
    <div className="skeleton-pulse skeleton-stat-icon" />
    <div className="skeleton-stat-info">
      <div className="skeleton-pulse skeleton-stat-value" />
      <div className="skeleton-pulse skeleton-stat-label" />
    </div>
  </div>
);

export default React.memo(SkeletonStatCard);
