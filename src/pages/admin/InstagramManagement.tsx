import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { ConfirmDialog } from '../../components/admin';
import { ImageUploader } from '../../components/ui';
import { GALLERY_PRESET } from '../../utils/imageCompression';
import * as adminApi from '../../services/adminApi';
import type { InstagramSettings } from '../../types/admin';

const InstagramManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast } = useAdmin();

  const [instagramSettings, setInstagramSettings] = useState<InstagramSettings>({
    handle: '',
    posts: [],
    updatedAt: '',
  });
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [newPostLink, setNewPostLink] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------

  const fetchInstagramData = useCallback(async () => {
    setInstagramLoading(true);
    try {
      const result = await adminApi.fetchInstagram();
      if (result.success && result.settings) {
        setInstagramSettings(result.settings);
      }
    } catch {
      showToast(t('admin.toast.fetchFailed'), 'error');
    } finally {
      setInstagramLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    fetchInstagramData();
  }, [fetchInstagramData]);

  // -------------------------------------------------------------------
  // Handle save
  // -------------------------------------------------------------------

  const handleSaveHandle = useCallback(async () => {
    setInstagramLoading(true);
    try {
      const result = await adminApi.saveInstagramHandle(token, instagramSettings.handle);
      if (result.success && result.settings) {
        setInstagramSettings(result.settings);
        showToast(t('admin.toast.settingsSaved'), 'success');
      } else {
        showToast(t('admin.toast.saveFailed'), 'error');
      }
    } catch {
      showToast(t('admin.toast.saveFailed'), 'error');
    } finally {
      setInstagramLoading(false);
    }
  }, [token, instagramSettings.handle, showToast, t]);

  // -------------------------------------------------------------------
  // Add post
  // -------------------------------------------------------------------

  const handleAddPost = useCallback(async () => {
    if (!newPostImage || !newPostLink) {
      showToast(t('admin.toast.uploadImageAndLink'), 'error');
      return;
    }

    setInstagramLoading(true);
    try {
      const result = await adminApi.addInstagramPost(token, {
        image: newPostImage,
        link: newPostLink,
      });
      if (result.success && result.settings) {
        setInstagramSettings(result.settings);
        setNewPostImage(null);
        setNewPostLink('');
        showToast(t('admin.toast.postAdded'), 'success');
      } else {
        showToast(t('admin.toast.addFailed'), 'error');
      }
    } catch {
      showToast(t('admin.toast.addFailed'), 'error');
    } finally {
      setInstagramLoading(false);
    }
  }, [token, newPostImage, newPostLink, showToast, t]);

  // -------------------------------------------------------------------
  // Delete single
  // -------------------------------------------------------------------

  const handleDeleteSingle = useCallback((id: string) => {
    setSingleDeleteId(id);
  }, []);

  const confirmDeleteSingle = useCallback(async () => {
    if (!singleDeleteId) return;
    setInstagramLoading(true);
    try {
      const result = await adminApi.deleteInstagramPost(token, singleDeleteId);
      if (result.success && result.settings) {
        setInstagramSettings(result.settings);
        showToast(t('admin.toast.postDeleted'), 'success');
      } else {
        showToast(t('admin.toast.deleteFailed'), 'error');
      }
    } catch {
      showToast(t('admin.toast.deleteFailed'), 'error');
    } finally {
      setInstagramLoading(false);
      setSingleDeleteId(null);
    }
  }, [singleDeleteId, token, showToast, t]);

  // -------------------------------------------------------------------
  // Bulk delete
  // -------------------------------------------------------------------

  const toggleSelectPost = useCallback((id: string) => {
    setSelectedPostIds((prev) => {
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
    if (selectedPostIds.size === instagramSettings.posts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(instagramSettings.posts.map((p) => p.id)));
    }
  }, [selectedPostIds.size, instagramSettings.posts]);

  const handleBulkDelete = useCallback(() => {
    if (selectedPostIds.size === 0) return;
    setDeleteConfirmOpen(true);
  }, [selectedPostIds.size]);

  const confirmBulkDelete = useCallback(async () => {
    setInstagramLoading(true);
    try {
      // Delete selected posts one by one
      for (const id of selectedPostIds) {
        await adminApi.deleteInstagramPost(token, id);
      }
      // Refresh
      const result = await adminApi.fetchInstagram();
      if (result.success && result.settings) {
        setInstagramSettings(result.settings);
      }
      setSelectedPostIds(new Set());
      showToast(t('admin.toast.postDeleted'), 'success');
    } catch {
      showToast(t('admin.toast.deleteFailed'), 'error');
    } finally {
      setInstagramLoading(false);
      setDeleteConfirmOpen(false);
    }
  }, [selectedPostIds, token, showToast, t]);

  // -------------------------------------------------------------------
  // Reorder
  // -------------------------------------------------------------------

  const handleMovePost = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const posts = [...instagramSettings.posts];
      const idx = posts.findIndex((p) => p.id === id);
      if (idx < 0) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= posts.length) return;

      [posts[idx], posts[swapIdx]] = [posts[swapIdx], posts[idx]];

      setInstagramLoading(true);
      try {
        const result = await adminApi.reorderInstagramPosts(token, posts);
        if (result.success && result.settings) {
          setInstagramSettings(result.settings);
        } else {
          showToast(t('admin.toast.saveFailed'), 'error');
        }
      } catch {
        showToast(t('admin.toast.saveFailed'), 'error');
      } finally {
        setInstagramLoading(false);
      }
    },
    [instagramSettings.posts, token, showToast, t]
  );

  // -------------------------------------------------------------------
  // Edit caption
  // -------------------------------------------------------------------

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    setInstagramSettings((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === id ? { ...p, caption } : p)),
    }));
  }, []);

  const handleCaptionBlur = useCallback(
    async (id: string) => {
      const post = instagramSettings.posts.find((p) => p.id === id);
      if (!post) return;

      // Save via reorder (preserves all post data including caption)
      setInstagramLoading(true);
      try {
        const result = await adminApi.reorderInstagramPosts(token, instagramSettings.posts);
        if (result.success && result.settings) {
          setInstagramSettings(result.settings);
        }
      } catch {
        showToast(t('admin.toast.saveFailed'), 'error');
      } finally {
        setInstagramLoading(false);
      }
    },
    [instagramSettings.posts, token, showToast, t]
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  if (instagramLoading && instagramSettings.posts.length === 0) {
    return (
      <div className="settings-page">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            {t('common.loading')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Instagram handle */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.instagram.title')}</h2>
        </div>
        <div className="form-group">
          <label>{t('admin.instagram.handleLabel')}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input"
              value={instagramSettings.handle}
              onChange={(e) =>
                setInstagramSettings((prev) => ({ ...prev, handle: e.target.value }))
              }
              placeholder={t('admin.instagram.handlePlaceholder')}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleSaveHandle}
              disabled={instagramLoading}
              type="button"
            >
              {t('admin.instagram.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Add new post */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.instagram.addPost')}</h2>
        </div>
        <div
          style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <ImageUploader
            preset={GALLERY_PRESET}
            value={newPostImage || ''}
            onChange={(base64) => setNewPostImage(base64)}
            onRemove={() => setNewPostImage(null)}
            label={t('admin.instagram.postImage')}
          />
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('admin.instagram.postLink')}</label>
            <input
              type="url"
              className="input"
              value={newPostLink}
              onChange={(e) => setNewPostLink(e.target.value)}
              placeholder={t('admin.instagram.linkPlaceholder')}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleAddPost}
            disabled={instagramLoading || !newPostImage || !newPostLink}
            type="button"
            style={{ width: '100%' }}
          >
            {t('admin.instagram.addPostButton')}
          </button>
        </div>
      </div>

      {/* Post list */}
      {instagramSettings.posts.length > 0 && (
        <div className="card">
          <div
            className="card-header"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
          >
            <h2>{t('admin.instagram.posts')}</h2>
            <button className="admin-btn" onClick={handleSelectAll} type="button">
              {selectedPostIds.size === instagramSettings.posts.length
                ? t('admin.instagram.deselectAll')
                : t('admin.instagram.selectAll')}
            </button>
            {selectedPostIds.size > 0 && (
              <button
                className="admin-btn confirm-dialog-btn-danger"
                onClick={handleBulkDelete}
                type="button"
                disabled={instagramLoading}
              >
                {t('admin.instagram.deleteSelected', { count: selectedPostIds.size })}
              </button>
            )}
          </div>

          <div className="gallery-admin-grid">
            {instagramSettings.posts.map((post, idx) => (
              <div
                key={post.id}
                className={`gallery-admin-item${selectedPostIds.has(post.id) ? ' selected' : ''}`}
              >
                {/* Checkbox */}
                <label className="gallery-admin-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPostIds.has(post.id)}
                    onChange={() => toggleSelectPost(post.id)}
                  />
                </label>

                {/* Image */}
                <div className="gallery-admin-image">
                  <a href={post.link} target="_blank" rel="noopener noreferrer">
                    <img src={post.image} alt={post.caption || `Post ${idx + 1}`} />
                  </a>
                </div>

                {/* Caption */}
                <input
                  type="text"
                  className="input gallery-admin-caption"
                  value={post.caption || ''}
                  onChange={(e) => handleCaptionChange(post.id, e.target.value)}
                  onBlur={() => handleCaptionBlur(post.id)}
                  placeholder={t('admin.instagram.captionPlaceholder')}
                />

                {/* Link display */}
                <div
                  className="gallery-admin-link"
                  style={{
                    fontSize: '12px',
                    color: 'var(--admin-text-muted)',
                    padding: '0 8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <a href={post.link} target="_blank" rel="noopener noreferrer">
                    {post.link}
                  </a>
                </div>

                {/* Actions */}
                <div className="gallery-admin-actions">
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleMovePost(post.id, 'up')}
                    disabled={idx === 0 || instagramLoading}
                    title={t('admin.instagram.moveUp')}
                    type="button"
                  >
                    &#9650;
                  </button>
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleMovePost(post.id, 'down')}
                    disabled={idx === instagramSettings.posts.length - 1 || instagramLoading}
                    title={t('admin.instagram.moveDown')}
                    type="button"
                  >
                    &#9660;
                  </button>
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleDeleteSingle(post.id)}
                    disabled={instagramLoading}
                    title={t('admin.instagram.delete')}
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

      {/* Single delete confirm */}
      <ConfirmDialog
        open={singleDeleteId !== null}
        title={t('admin.instagram.confirmDeleteTitle')}
        message={t('admin.instagram.confirmDeleteMessage')}
        variant="danger"
        onConfirm={confirmDeleteSingle}
        onCancel={() => setSingleDeleteId(null)}
        loading={instagramLoading}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('admin.instagram.confirmBulkDeleteTitle')}
        message={t('admin.instagram.confirmBulkDeleteMessage', {
          count: selectedPostIds.size,
        })}
        variant="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={instagramLoading}
      />
    </div>
  );
};

export default InstagramManagement;
