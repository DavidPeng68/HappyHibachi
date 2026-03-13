import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'image' | 'card' | 'avatar' | 'button';
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
}) => {
  const variantClass = `skeleton skeleton-${variant}`;
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return <div className={`${variantClass} ${className}`} style={style} />;
};

export default Skeleton;
