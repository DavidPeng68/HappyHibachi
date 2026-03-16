import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Icon } from '../ui';
import { useScrollReveal, useSettings } from '../../hooks';
import { validateEmail } from '../../utils/validation';
import './PhotoShare.css';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PHOTO_REWARD = 25;

/**
 * Photo Share Activity component
 * Encourages users to share photos for rewards
 */
const PhotoShare: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const HASHTAG = settings.brandInfo.hashtag;
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files].slice(0, 5));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFiles.length === 0) return;
    if (!emailInput || !validateEmail(emailInput)) {
      setErrorMsg(t('photoShare.invalidEmail'));
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');

    try {
      const { submitPhotos } = await import('../../services/api');
      const formData = new FormData();
      formData.append('email', emailInput);
      if (instagramHandle) formData.append('instagramHandle', instagramHandle);
      uploadedFiles.forEach((file) => formData.append('photos', file));

      const result = await submitPhotos(formData);
      if (result.success) {
        setStatus('success');
      } else {
        setErrorMsg(result.error || t('photoShare.error'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(t('photoShare.error'));
      setStatus('error');
    }
  };

  return (
    <section className="photo-share" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`photo-share-container ${isVisible ? 'visible' : ''}`}>
        <div className="photo-share-content">
          <div className="photo-badge">
            <Icon name="camera" size={32} />
          </div>
          <h2>{t('photoShare.title')}</h2>
          <p>{t('photoShare.subtitle')}</p>
        </div>

        <div className="photo-share-grid">
          <div className="share-option">
            <div className="option-icon instagram">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <h3>{t('photoShare.option1Title')}</h3>
            <p>{t('photoShare.option1Desc')}</p>
          </div>

          <div className="share-option">
            <div className="option-icon upload">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3>{t('photoShare.option2Title')}</h3>
            <p>{t('photoShare.option2Desc')}</p>
          </div>
        </div>

        {status !== 'success' ? (
          <form className="upload-form" onSubmit={handleSubmit}>
            <div
              className={`upload-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadedFiles.length === 0 ? (
                <>
                  <div className="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p>{t('photoShare.dropzone')}</p>
                  <span>{t('photoShare.maxFiles')}</span>
                </>
              ) : (
                <div className="uploaded-preview">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="preview-item">
                      <img src={URL.createObjectURL(file)} alt={`Upload ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {uploadedFiles.length < 5 && (
                    <label className="add-more">
                      <span>+</span>
                      <input type="file" accept="image/*" multiple onChange={handleFileInput} />
                    </label>
                  )}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                style={{ display: uploadedFiles.length > 0 ? 'none' : 'block' }}
              />
            </div>

            <Input
              type="email"
              placeholder={t('photoShare.emailPlaceholder') as string}
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              required
            />
            <div className="form-row">
              <Input
                placeholder={t('photoShare.instagramPlaceholder')}
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={uploadedFiles.length === 0 || status === 'uploading'}
              >
                {status === 'uploading' ? (
                  <span className="loading-spinner"></span>
                ) : (
                  t('photoShare.submit')
                )}
              </Button>
            </div>
            {status === 'error' && errorMsg && (
              <p
                className="upload-error"
                style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}
              >
                {errorMsg}
              </p>
            )}
          </form>
        ) : (
          <div className="upload-success">
            <div className="success-icon">✓</div>
            <h3>{t('photoShare.successTitle')}</h3>
            <p>{t('photoShare.successDesc')}</p>
          </div>
        )}

        <div className="photo-share-note">
          <p>{t('photoShare.terms')}</p>
        </div>
      </div>
    </section>
  );
};

export default PhotoShare;
