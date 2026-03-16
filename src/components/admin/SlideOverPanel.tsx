import React, { useEffect, useCallback } from 'react';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  open,
  onClose,
  title,
  children,
  width = 480,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
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
        className={`slideover-panel${open ? ' open' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="slideover-header">
          <h2 className="slideover-title">{title}</h2>
          <button className="slideover-close" onClick={onClose} aria-label="Close" type="button">
            &times;
          </button>
        </div>
        <div className="slideover-body">{children}</div>
      </div>
    </>
  );
};

export default SlideOverPanel;
