import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { ConfirmDialog, ImageLightbox } from '../../components/admin';
import { ImageUploader } from '../../components/ui';
import { GALLERY_PRESET, compressImage } from '../../utils/imageCompression';
import * as adminApi from '../../services/adminApi';
import type { GalleryImageApi } from '../../types';

function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const GalleryManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, settings, setSettings } = useAdmin();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const galleryImages = useMemo(
    () => [...(settings.galleryImages || [])].sort((a, b) => a.order - b.order),
    [settings.galleryImages]
  );

  // -------------------------------------------------------------------
  // Save helper
  // -------------------------------------------------------------------

  const saveGalleryImages = useCallback(
    async (updatedImages: GalleryImageApi[]) => {
      setSaving(true);
      try {
        const result = await adminApi.saveSettings(token, { galleryImages: updatedImages });
        if (result.success && result.settings) {
          setSettings(result.settings);
          showToast(t('admin.toast.settingsSaved'), 'success');
        } else {
          showToast(t('admin.toast.saveFailed'), 'error');
        }
      } catch {
        showToast(t('admin.toast.saveFailed'), 'error');
      } finally {
        setSaving(false);
      }
    },
    [token, setSettings, showToast, t]
  );

  // -------------------------------------------------------------------
  // Upload to R2
  // -------------------------------------------------------------------

  const uploadToR2 = useCallback(
    async (base64: string): Promise<{ key: string; url: string } | null> => {
      const blob = base64ToBlob(base64);
      const result = await adminApi.uploadGalleryImage(token, blob);
      if (result.success && result.key && result.url) {
        return { key: result.key, url: result.url };
      }
      return null;
    },
    [token]
  );

  const handleUploadMultiple = useCallback(
    async (images: string[]) => {
      setUploading(true);
      try {
        const currentImages = settings.galleryImages || [];
        const maxOrder =
          currentImages.length > 0 ? Math.max(...currentImages.map((img) => img.order)) : 0;

        const results = await Promise.all(images.map((base64) => uploadToR2(base64)));

        const newImages: GalleryImageApi[] = [];
        let failCount = 0;

        results.forEach((result, i) => {
          if (result) {
            newImages.push({
              id: `gallery_${Date.now()}_${i}`,
              url: result.url,
              r2Key: result.key,
              caption: '',
              order: maxOrder + i + 1,
            });
          } else {
            failCount++;
          }
        });

        if (failCount > 0) {
          showToast(t('admin.gallery.uploadFailed'), 'error');
        }

        if (newImages.length > 0) {
          await saveGalleryImages([...currentImages, ...newImages]);
        }
      } catch {
        showToast(t('admin.gallery.uploadFailed'), 'error');
      } finally {
        setUploading(false);
      }
    },
    [settings.galleryImages, uploadToR2, saveGalleryImages, showToast, t]
  );

  const handleUploadSingle = useCallback(
    (base64: string) => {
      handleUploadMultiple([base64]);
    },
    [handleUploadMultiple]
  );

  // -------------------------------------------------------------------
  // Caption editing
  // -------------------------------------------------------------------

  const handleCaptionChange = useCallback(
    (id: string, caption: string) => {
      setSettings((s) => ({
        ...s,
        galleryImages: s.galleryImages.map((img) => (img.id === id ? { ...img, caption } : img)),
      }));
    },
    [setSettings]
  );

  const handleCaptionBlur = useCallback(() => {
    saveGalleryImages(settings.galleryImages);
  }, [settings.galleryImages, saveGalleryImages]);

  // -------------------------------------------------------------------
  // Reorder
  // -------------------------------------------------------------------

  const handleMoveImage = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const sorted = [...galleryImages];
      const idx = sorted.findIndex((img) => img.id === id);
      if (idx < 0) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const tempOrder = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
      sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };

      saveGalleryImages(sorted);
    },
    [galleryImages, saveGalleryImages]
  );

  // -------------------------------------------------------------------
  // Delete single
  // -------------------------------------------------------------------

  const handleDeleteSingle = useCallback((id: string) => {
    setSingleDeleteId(id);
  }, []);

  const confirmDeleteSingle = useCallback(async () => {
    if (!singleDeleteId) return;
    setSaving(true);
    try {
      const imageToDelete = (settings.galleryImages || []).find((img) => img.id === singleDeleteId);
      if (imageToDelete?.r2Key) {
        await adminApi.deleteGalleryImages(token, [imageToDelete.r2Key]);
      }
      const updated = (settings.galleryImages || []).filter((img) => img.id !== singleDeleteId);
      await saveGalleryImages(updated);
      setSingleDeleteId(null);
    } catch {
      showToast(t('admin.toast.saveFailed'), 'error');
      setSaving(false);
    }
  }, [singleDeleteId, settings.galleryImages, token, saveGalleryImages, showToast, t]);

  // -------------------------------------------------------------------
  // Bulk select & delete
  // -------------------------------------------------------------------

  const toggleSelectImage = useCallback((id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedImageIds.size === galleryImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(galleryImages.map((img) => img.id)));
    }
  }, [selectedImageIds.size, galleryImages]);

  const handleBulkDelete = useCallback(() => {
    if (selectedImageIds.size === 0) return;
    setDeleteConfirmOpen(true);
  }, [selectedImageIds.size]);

  const confirmBulkDelete = useCallback(async () => {
    setSaving(true);
    try {
      const imagesToDelete = (settings.galleryImages || []).filter((img) =>
        selectedImageIds.has(img.id)
      );
      const r2Keys = imagesToDelete.map((img) => img.r2Key).filter(Boolean) as string[];
      if (r2Keys.length > 0) {
        await adminApi.deleteGalleryImages(token, r2Keys);
      }
      const updated = (settings.galleryImages || []).filter((img) => !selectedImageIds.has(img.id));
      await saveGalleryImages(updated);
      setSelectedImageIds(new Set());
      setDeleteConfirmOpen(false);
    } catch {
      showToast(t('admin.toast.saveFailed'), 'error');
      setSaving(false);
    }
  }, [settings.galleryImages, selectedImageIds, token, saveGalleryImages, showToast, t]);

  // -------------------------------------------------------------------
  // Replace image
  // -------------------------------------------------------------------

  const handleReplaceImage = useCallback(
    async (id: string, base64: string) => {
      setSaving(true);
      try {
        const oldImage = (settings.galleryImages || []).find((img) => img.id === id);

        const result = await uploadToR2(base64);
        if (!result) {
          showToast(t('admin.gallery.uploadFailed'), 'error');
          setSaving(false);
          return;
        }

        // Delete old R2 object if exists
        if (oldImage?.r2Key) {
          await adminApi.deleteGalleryImages(token, [oldImage.r2Key]);
        }

        const updated = (settings.galleryImages || []).map((img) =>
          img.id === id ? { ...img, url: result.url, r2Key: result.key } : img
        );
        await saveGalleryImages(updated);
      } catch {
        showToast(t('admin.toast.saveFailed'), 'error');
        setSaving(false);
      }
    },
    [settings.galleryImages, token, uploadToR2, saveGalleryImages, showToast, t]
  );

  // -------------------------------------------------------------------
  // Replace via file input (compress then upload to R2)
  // -------------------------------------------------------------------

  const handleReplaceFile = useCallback(
    async (id: string, file: File) => {
      setSaving(true);
      try {
        const compressed = await compressImage(file, GALLERY_PRESET);
        await handleReplaceImage(id, compressed.base64);
      } catch {
        showToast(t('admin.gallery.uploadFailed'), 'error');
        setSaving(false);
      }
    },
    [handleReplaceImage, showToast, t]
  );

  // -------------------------------------------------------------------
  // Lightbox
  // -------------------------------------------------------------------

  const handleLightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null || prev <= 0) return galleryImages.length - 1;
      return prev - 1;
    });
  }, [galleryImages.length]);

  const handleLightboxNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null || prev >= galleryImages.length - 1) return 0;
      return prev + 1;
    });
  }, [galleryImages.length]);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="settings-page">
      {/* Upload card */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.gallery.title')}</h2>
          <span className="badge">
            {t('admin.gallery.imageCount', { count: galleryImages.length })}
          </span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <ImageUploader
            preset={GALLERY_PRESET}
            onChange={handleUploadSingle}
            multiple
            onMultipleChange={handleUploadMultiple}
            label={t('admin.gallery.uploadLabel')}
          />
          {uploading && (
            <p style={{ marginTop: 8, color: 'var(--admin-primary)' }}>
              {t('admin.gallery.uploading')}
            </p>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {galleryImages.length > 0 && (
        <div className="card">
          <div
            className="card-header"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
          >
            <button className="admin-btn" onClick={handleSelectAll} type="button">
              {selectedImageIds.size === galleryImages.length
                ? t('admin.gallery.deselectAll')
                : t('admin.gallery.selectAll')}
            </button>
            {selectedImageIds.size > 0 && (
              <button
                className="admin-btn confirm-dialog-btn-danger"
                onClick={handleBulkDelete}
                type="button"
                disabled={saving}
              >
                {t('admin.gallery.deleteSelected', { count: selectedImageIds.size })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {galleryImages.length > 0 && (
        <div className="card">
          <div className="gallery-admin-grid">
            {galleryImages.map((image, idx) => (
              <div
                key={image.id}
                className={`gallery-admin-item${selectedImageIds.has(image.id) ? ' selected' : ''}`}
              >
                {/* Checkbox */}
                <label className="gallery-admin-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedImageIds.has(image.id)}
                    onChange={() => toggleSelectImage(image.id)}
                  />
                </label>

                {/* Image */}
                <div
                  className="gallery-admin-image"
                  onClick={() => setLightboxIndex(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLightboxIndex(idx);
                    }
                  }}
                  aria-label={t('admin.gallery.viewFullSize')}
                >
                  <img src={image.url} alt={image.caption || `Gallery ${idx + 1}`} />
                </div>

                {/* Caption */}
                <input
                  type="text"
                  className="input gallery-admin-caption"
                  value={image.caption}
                  onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                  onBlur={handleCaptionBlur}
                  placeholder={t('admin.gallery.captionPlaceholder')}
                />

                {/* Actions */}
                <div className="gallery-admin-actions">
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleMoveImage(image.id, 'up')}
                    disabled={idx === 0 || saving}
                    title={t('admin.gallery.moveUp')}
                    type="button"
                  >
                    &#9650;
                  </button>
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleMoveImage(image.id, 'down')}
                    disabled={idx === galleryImages.length - 1 || saving}
                    title={t('admin.gallery.moveDown')}
                    type="button"
                  >
                    &#9660;
                  </button>

                  {/* Replace */}
                  <label
                    className="btn-icon-sm gallery-replace-btn"
                    title={t('admin.gallery.replace')}
                  >
                    &#8635;
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleReplaceFile(image.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <button
                    className="btn-icon-sm"
                    onClick={() => handleDeleteSingle(image.id)}
                    disabled={saving}
                    title={t('admin.gallery.delete')}
                    type="button"
                    style={{ color: 'var(--admin-danger)' }}
                  >
                    &#128465;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && galleryImages[lightboxIndex] && (
        <ImageLightbox
          open
          src={galleryImages[lightboxIndex].url}
          alt={galleryImages[lightboxIndex].caption}
          onClose={() => setLightboxIndex(null)}
          onPrev={galleryImages.length > 1 ? handleLightboxPrev : undefined}
          onNext={galleryImages.length > 1 ? handleLightboxNext : undefined}
        />
      )}

      {/* Single delete confirm */}
      <ConfirmDialog
        open={singleDeleteId !== null}
        title={t('admin.gallery.confirmDeleteTitle')}
        message={t('admin.gallery.confirmDeleteMessage')}
        variant="danger"
        onConfirm={confirmDeleteSingle}
        onCancel={() => setSingleDeleteId(null)}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('admin.gallery.confirmBulkDeleteTitle')}
        message={t('admin.gallery.confirmBulkDeleteMessage', {
          count: selectedImageIds.size,
        })}
        variant="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default GalleryManagement;
