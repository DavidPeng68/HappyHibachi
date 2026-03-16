import React from 'react';
import { useCountAnimation } from '../../hooks/useCountAnimation';

interface AnimatedStatValueProps {
  value: number | string;
  color?: string;
  className?: string;
}

const AnimatedStatValue: React.FC<AnimatedStatValueProps> = ({ value, color, className }) => {
  const numericValue = typeof value === 'number' ? value : 0;
  const animated = useCountAnimation(numericValue);

  return (
    <div className={className || 'stat-value'} style={color ? { color } : undefined}>
      {typeof value === 'number' ? animated : value}
    </div>
  );
};

export default React.memo(AnimatedStatValue);
