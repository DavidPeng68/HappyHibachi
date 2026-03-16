import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  height?: number;
  mobileHeight?: number;
  children: React.ReactElement;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  height = 300,
  mobileHeight = 220,
  children,
}) => {
  const { isMobile } = useBreakpoint();
  const chartHeight = isMobile ? mobileHeight : height;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="chart-card-action">{action}</div>}
      </div>
      <div className="chart-card-body" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCard;
