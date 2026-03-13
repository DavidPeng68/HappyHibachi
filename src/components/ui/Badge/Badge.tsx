import React from 'react';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'error';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
  dot?: boolean;
  pulse?: boolean;
}

/**
 * Reusable Badge component
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  pill = false,
  dot = false,
  pulse = false,
  className = '',
  ...props
}) => {
  const classes = [
    'ui-badge',
    `ui-badge--${variant}`,
    `ui-badge--${size}`,
    pill && 'ui-badge--pill',
    dot && 'ui-badge--dot',
    pulse && 'ui-badge--pulse',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {dot && <span className="ui-badge__dot" />}
      {children}
    </span>
  );
};

export default Badge;
