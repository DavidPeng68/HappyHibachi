import React, { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  open,
  onClose,
  title,
  children,
  width = 480,
}) => {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = 'slideover-panel-title';

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusableElements =
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus first focusable element in the panel
      requestAnimationFrame(() => {
        if (panelRef.current) {
          const focusableElements =
            panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else {
            panelRef.current.focus();
          }
        }
      });

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        // Restore focus to previously focused element
        previousFocusRef.current?.focus();
      };
    }
  }, [open, handleKeyDown]);

  return (
    <>
      <div
        className={`slideover-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        role="presentation"
      />
      <div
        ref={panelRef}
        className={`slideover-panel${open ? ' open' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="slideover-header">
          <h2 id={titleId} className="slideover-title">
            {title}
          </h2>
          <button
            className="slideover-close"
            onClick={onClose}
            aria-label={t('common.close')}
            type="button"
          >
            &times;
          </button>
        </div>
        <div className="slideover-body">{children}</div>
      </div>
    </>
  );
};

export default SlideOverPanel;
