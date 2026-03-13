import React, { forwardRef } from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

/**
 * Reusable Input component
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = 'left',
      fullWidth = true,
      className = '',
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    const wrapperClasses = [
      'ui-input-wrapper',
      fullWidth && 'ui-input-wrapper--full',
      error && 'ui-input-wrapper--error',
      icon && `ui-input-wrapper--icon-${iconPosition}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={inputId} className="ui-input__label">
            {label}
            {required && <span className="ui-input__required">*</span>}
          </label>
        )}
        <div className="ui-input__container">
          {icon && iconPosition === 'left' && <span className="ui-input__icon">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className="ui-input"
            required={required}
            aria-invalid={!!error}
            aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
            {...props}
          />
          {icon && iconPosition === 'right' && <span className="ui-input__icon">{icon}</span>}
        </div>
        {error && (
          <span id={errorId} className="ui-input__error">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className="ui-input__hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
