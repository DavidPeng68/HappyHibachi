import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  className?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 24,
  color = 'var(--admin-primary)',
  fillOpacity = 0.1,
  strokeWidth = 1.5,
  className,
}) => {
  if (!data || data.length === 0) return null;

  if (data.length === 1) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
        <circle cx={width / 2} cy={height / 2} r={strokeWidth + 1} fill={color} />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = strokeWidth;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polylinePoints = points.join(' ');
  const firstX = points[0].split(',')[0];
  const lastX = points[points.length - 1].split(',')[0];
  const polygonPoints = `${firstX},${height - padding} ${polylinePoints} ${lastX},${height - padding}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <polygon points={polygonPoints} fill={color} opacity={fillOpacity} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default React.memo(Sparkline);
