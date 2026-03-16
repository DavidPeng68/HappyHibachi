import React from 'react';
import Sparkline from './Sparkline';

interface InsightCardProps {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendColor?: string;
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
}

const trendArrows: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  flat: '\u2192',
};

const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  trend,
  trendColor,
  sparklineData,
  onClick,
  className,
}) => {
  const classes = ['insight-card', onClick ? 'cursor-pointer' : '', className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="insight-card-icon">
        <span>{icon}</span>
      </div>
      <div className="insight-card-body">
        <div className="insight-card-title">{title}</div>
        <div className="insight-card-value">{value}</div>
        {subtitle && <div className="insight-card-subtitle">{subtitle}</div>}
      </div>
      {sparklineData && sparklineData.length > 0 ? (
        <Sparkline data={sparklineData} />
      ) : trend ? (
        <div
          className={`insight-card-trend ${trend}`}
          style={trendColor ? { color: trendColor } : undefined}
        >
          {trendArrows[trend]}
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(InsightCard);
