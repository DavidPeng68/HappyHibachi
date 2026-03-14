import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
        return;
      }

      // Trap focus within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [loading, onCancel]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      cancelBtnRef.current?.focus();
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const confirmClassName = [
    'admin-btn',
    variant === 'danger'
      ? 'confirm-dialog-btn-danger'
      : variant === 'warning'
        ? 'confirm-dialog-btn-warning'
        : 'admin-btn-primary',
  ].join(' ');

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
      role="presentation"
    >
      <div
        className="modal confirm-dialog"
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <p id="confirm-dialog-message">{message}</p>
        <div className="modal-actions">
          <button
            className="admin-btn"
            onClick={onCancel}
            disabled={loading}
            ref={cancelBtnRef}
            type="button"
          >
            {cancelLabel ?? t('admin.cancel')}
          </button>
          <button
            className={confirmClassName}
            onClick={onConfirm}
            disabled={loading}
            ref={confirmBtnRef}
            type="button"
          >
            {loading ? (
              <span className="confirm-dialog-loading">
                <span className="confirm-dialog-spinner" />
                {confirmLabel ?? t('admin.confirm')}
              </span>
            ) : (
              (confirmLabel ?? t('admin.confirm'))
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
