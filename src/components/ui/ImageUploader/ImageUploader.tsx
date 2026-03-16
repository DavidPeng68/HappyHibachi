import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  compressImage,
  formatFileSize,
  type CompressionPreset,
  type CompressionResult,
} from '../../../utils/imageCompression';
import './ImageUploader.css';

interface ImageUploaderProps {
  value?: string;
  onChange: (base64: string) => void;
  onRemove?: () => void;
  preset: CompressionPreset;
  label?: string;
  accept?: string;
  aspectRatio?: number;
  className?: string;
  multiple?: boolean;
  onMultipleChange?: (images: string[]) => void;
  maxRawSizeMB?: number;
}

type UploadStatus = 'idle' | 'reading' | 'compressing' | 'done' | 'error';

const MAX_RAW_SIZE_MB = 10;

const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  onRemove,
  preset,
  label,
  accept = 'image/*',
  aspectRatio,
  className = '',
  multiple = false,
  onMultipleChange,
  maxRawSizeMB = MAX_RAW_SIZE_MB,
}) => {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState('');
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!file.type.startsWith('image/')) {
        return t('imageUploader.invalidType');
      }
      if (file.size > maxRawSizeMB * 1024 * 1024) {
        return t('imageUploader.maxSize', { size: maxRawSizeMB });
      }
      return null;
    },
    [maxRawSizeMB, t]
  );

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setStatus('error');
        return null;
      }

      setError('');
      setStatus('compressing');

      try {
        const result = await compressImage(file, preset);
        setCompressionInfo(result);
        setStatus('done');
        return result.base64;
      } catch {
        setError(t('imageUploader.processingFailed'));
        setStatus('error');
        return null;
      }
    },
    [validateFile, preset, t]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (fileArray.length === 0) return;

      setStatus('reading');

      if (multiple && onMultipleChange) {
        const results: string[] = [];
        for (const file of fileArray) {
          const base64 = await processFile(file);
          if (base64) results.push(base64);
        }
        if (results.length > 0) {
          onMultipleChange(results);
        }
      } else {
        const base64 = await processFile(fileArray[0]);
        if (base64) {
          onChange(base64);
        }
      }
    },
    [multiple, onMultipleChange, onChange, processFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
      }
      e.target.value = '';
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFiles(imageFiles);
      }
    },
    [handleFiles]
  );

  const handleRemove = useCallback(() => {
    setCompressionInfo(null);
    setStatus('idle');
    setError('');
    onRemove?.();
  }, [onRemove]);

  const openFileBrowser = () => fileInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const hasImage = !!(value && value.length > 0);
  const isProcessing = status === 'reading' || status === 'compressing';

  const previewAspect = aspectRatio
    ? aspectRatio >= 1.5
      ? 'wide'
      : aspectRatio <= 0.75
        ? 'tall'
        : 'square'
    : 'auto';

  return (
    <div className={`image-uploader ${className}`} onPaste={handlePaste} tabIndex={0}>
      {label && <label className="image-uploader__label">{label}</label>}

      {hasImage && !isProcessing ? (
        <div className={`image-uploader__preview image-uploader__preview--${previewAspect}`}>
          <img
            src={value}
            alt={t('imageUploader.preview')}
            style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}
          />
          <div className="image-uploader__preview-overlay">
            <button type="button" className="image-uploader__btn-replace" onClick={openFileBrowser}>
              {t('imageUploader.replace')}
            </button>
            {onRemove && (
              <button type="button" className="image-uploader__btn-remove" onClick={handleRemove}>
                {t('imageUploader.remove')}
              </button>
            )}
          </div>
          {compressionInfo && status === 'done' && (
            <div className="image-uploader__info">
              {formatFileSize(compressionInfo.originalSizeKB)} →{' '}
              {formatFileSize(compressionInfo.compressedSizeKB)}
              <span className="image-uploader__info-dim">
                {compressionInfo.width}×{compressionInfo.height}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          className={`image-uploader__dropzone ${dragActive ? 'image-uploader__dropzone--active' : ''} ${isProcessing ? 'image-uploader__dropzone--processing' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={!isProcessing ? openFileBrowser : undefined}
          role="button"
          tabIndex={0}
          aria-label={t('imageUploader.uploadImage')}
        >
          {isProcessing ? (
            <div className="image-uploader__processing">
              <div className="image-uploader__spinner" />
              <p>
                {status === 'reading' ? t('imageUploader.reading') : t('imageUploader.compressing')}
              </p>
            </div>
          ) : (
            <>
              <div className="image-uploader__icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="image-uploader__text">
                {!isTouch ? t('imageUploader.dropzone') : t('imageUploader.tapToSelect')}
              </p>
              <span className="image-uploader__hint">
                {multiple
                  ? t('imageUploader.multipleHint')
                  : t('imageUploader.maxSizeHint', { size: maxRawSizeMB })}
                {preset.cropToAspect
                  ? ` · Auto crop ${preset.cropToAspect === 1 ? '1:1' : Math.round(preset.cropToAspect * 9) + ':9'}`
                  : ''}
              </span>
            </>
          )}
        </div>
      )}

      {error && <div className="image-uploader__error">{error}</div>}

      <div className="image-uploader__actions">
        {!hasImage && !isProcessing && isTouch && (
          <button type="button" className="image-uploader__btn-camera" onClick={openCamera}>
            📷 {t('imageUploader.takePhoto')}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="image-uploader__input-hidden"
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="image-uploader__input-hidden"
        tabIndex={-1}
      />
    </div>
  );
};

export default ImageUploader;
