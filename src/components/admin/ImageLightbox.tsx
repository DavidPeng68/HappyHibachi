import React, { useEffect, useCallback } from 'react';

interface ImageLightboxProps {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  open,
  src,
  alt = '',
  onClose,
  onPrev,
  onNext,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev?.();
          break;
        case 'ArrowRight':
          onNext?.();
          break;
      }
    },
    [onClose, onPrev, onNext]
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

  if (!open) return null;

  return (
    <div
      className="image-lightbox-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
    >
      <button className="image-lightbox-close" onClick={onClose} type="button" aria-label="Close">
        &times;
      </button>

      {onPrev && (
        <button
          className="image-lightbox-nav image-lightbox-prev"
          onClick={onPrev}
          type="button"
          aria-label="Previous image"
        >
          &#8249;
        </button>
      )}

      <img className="image-lightbox-img" src={src} alt={alt} />

      {onNext && (
        <button
          className="image-lightbox-nav image-lightbox-next"
          onClick={onNext}
          type="button"
          aria-label="Next image"
        >
          &#8250;
        </button>
      )}
    </div>
  );
};

export default ImageLightbox;
