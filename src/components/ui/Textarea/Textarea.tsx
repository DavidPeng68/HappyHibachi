import React, { forwardRef } from 'react';
import './Textarea.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

/**
 * Reusable Textarea component
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      fullWidth = true,
      resize = 'vertical',
      className = '',
      required,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;

    const wrapperClasses = [
      'ui-textarea-wrapper',
      fullWidth && 'ui-textarea-wrapper--full',
      error && 'ui-textarea-wrapper--error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={textareaId} className="ui-textarea__label">
            {label}
            {required && <span className="ui-textarea__required">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className="ui-textarea"
          required={required}
          rows={rows}
          style={{ resize }}
          aria-invalid={!!error}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        {error && (
          <span id={errorId} className="ui-textarea__error">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className="ui-textarea__hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
