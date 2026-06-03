import React from 'react';
import Icon from '../ui/Icon/Icon';
import Sparkline from './Sparkline';

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendColor?: string;
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
}

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
      <div className="insight-card-icon">{icon}</div>
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
          {trend === 'up' && <Icon name="trending-up" size={16} />}
          {trend === 'down' && <Icon name="trending-down" size={16} />}
          {trend === 'flat' && <Icon name="chevron-right" size={16} />}
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(InsightCard);
