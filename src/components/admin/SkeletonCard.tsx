import React from 'react';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <div className="skeleton-pulse skeleton-title" />
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton-pulse skeleton-line" style={{ width: `${85 - i * 15}%` }} />
    ))}
  </div>
);

export default React.memo(SkeletonCard);
