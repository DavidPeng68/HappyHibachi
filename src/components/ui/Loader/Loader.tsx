import React from 'react';
import './Loader.css';

export interface LoaderProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'muted';
  fullScreen?: boolean;
  text?: string;
}

/**
 * Reusable Loader component
 */
export const Loader: React.FC<LoaderProps> = ({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  fullScreen = false,
  text,
}) => {
  const classes = [
    'ui-loader',
    `ui-loader--${variant}`,
    `ui-loader--${size}`,
    `ui-loader--${color}`,
  ].join(' ');

  const loader = (
    <div className={classes}>
      {variant === 'spinner' && <div className="ui-loader__spinner" />}
      {variant === 'dots' && (
        <div className="ui-loader__dots">
          <span />
          <span />
          <span />
        </div>
      )}
      {variant === 'pulse' && <div className="ui-loader__pulse" />}
      {variant === 'bars' && (
        <div className="ui-loader__bars">
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {text && <span className="ui-loader__text">{text}</span>}
    </div>
  );

  if (fullScreen) {
    return <div className="ui-loader-overlay">{loader}</div>;
  }

  return loader;
};

export default Loader;
