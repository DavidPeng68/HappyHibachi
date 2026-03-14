import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Review } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import { ConfirmDialog } from '../../components/admin';
import { useAdmin } from './AdminLayout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RatingFilter = 0 | 1 | 2 | 3 | 4 | 5;
type VisibilityFilter = 'all' | 'visible' | 'hidden';

interface ReviewFormData {
  name: string;
  location: string;
  rating: number;
  review: string;
  event: string;
}

const EMPTY_FORM: ReviewFormData = {
  name: '',
  location: '',
  rating: 5,
  review: '',
  event: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReviewManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast } = useAdmin();

  // Data state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(0);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');

  // Edit state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReviewFormData>(EMPTY_FORM);

  // Bulk select state
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch reviews on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.fetchReviews(token).then((res) => {
      if (!cancelled) {
        if (res.success) {
          setReviews(res.reviews);
        } else {
          showToast(t('admin.toast.operationFailed'), 'error');
        }
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, showToast, t]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    let result = reviews;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.review.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.event.toLowerCase().includes(q)
      );
    }

    if (ratingFilter > 0) {
      result = result.filter((r) => r.rating === ratingFilter);
    }

    if (visibilityFilter === 'visible') {
      result = result.filter((r) => r.visible);
    } else if (visibilityFilter === 'hidden') {
      result = result.filter((r) => !r.visible);
    }

    return result;
  }, [reviews, searchQuery, ratingFilter, visibilityFilter]);

  // Add new review
  const handleAddReview = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);

      setSubmitting(true);
      const res = await adminApi.addReview(token, {
        name: formData.get('name') as string,
        location: formData.get('location') as string,
        rating: parseInt(formData.get('rating') as string) || 5,
        review: formData.get('review') as string,
        event: formData.get('event') as string,
        visible: true,
      });

      if (res.success && res.review) {
        setReviews((prev) => [...prev, res.review!]);
        showToast(t('admin.toast.reviewAdded'), 'success');
        form.reset();
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.addFailed'), 'error');
      }
      setSubmitting(false);
    },
    [token, showToast, t]
  );

  // Toggle visibility
  const toggleVisibility = useCallback(
    async (id: string, visible: boolean) => {
      const res = await adminApi.updateReview(token, { id, visible });
      if (res.success) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, visible } : r)));
        showToast(
          visible ? t('admin.toast.reviewShown') : t('admin.toast.reviewHidden'),
          'success'
        );
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.operationFailed'), 'error');
      }
    },
    [token, showToast, t]
  );

  // Start editing
  const startEditing = useCallback((review: Review) => {
    setEditingReviewId(review.id);
    setEditForm({
      name: review.name,
      location: review.location,
      rating: review.rating,
      review: review.review,
      event: review.event,
    });
  }, []);

  // Save edit
  const saveEdit = useCallback(
    async (id: string) => {
      setSubmitting(true);
      const res = await adminApi.updateReview(token, { id, ...editForm });
      if (res.success) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...editForm } : r)));
        setEditingReviewId(null);
        showToast(t('admin.toast.statusUpdated'), 'success');
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.updateFailed'), 'error');
      }
      setSubmitting(false);
    },
    [token, editForm, showToast, t]
  );

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingReviewId(null);
    setEditForm(EMPTY_FORM);
  }, []);

  // Delete single review
  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(true);
      const res = await adminApi.deleteReview(token, id);
      if (res.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        setSelectedReviewIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast(t('admin.toast.reviewDeleted'), 'success');
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.deleteFailed'), 'error');
      }
      setDeleting(false);
      setConfirmDeleteId(null);
    },
    [token, showToast, t]
  );

  // Bulk toggle visibility
  const bulkToggleVisibility = useCallback(
    async (visible: boolean) => {
      const ids = Array.from(selectedReviewIds);
      let successCount = 0;
      for (const id of ids) {
        const res = await adminApi.updateReview(token, { id, visible });
        if (res.success) {
          successCount++;
        }
      }
      if (successCount > 0) {
        setReviews((prev) =>
          prev.map((r) => (selectedReviewIds.has(r.id) ? { ...r, visible } : r))
        );
        setSelectedReviewIds(new Set());
        showToast(
          visible ? t('admin.toast.reviewShown') : t('admin.toast.reviewHidden'),
          'success'
        );
      }
    },
    [selectedReviewIds, token, showToast, t]
  );

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    setDeleting(true);
    const ids = Array.from(selectedReviewIds);
    let successCount = 0;
    for (const id of ids) {
      const res = await adminApi.deleteReview(token, id);
      if (res.success) successCount++;
    }
    if (successCount > 0) {
      setReviews((prev) => prev.filter((r) => !selectedReviewIds.has(r.id)));
      setSelectedReviewIds(new Set());
      showToast(t('admin.toast.reviewDeleted'), 'success');
    }
    setDeleting(false);
    setConfirmBulkDelete(false);
  }, [selectedReviewIds, token, showToast, t]);

  // Checkbox toggle
  const toggleSelect = useCallback((id: string) => {
    setSelectedReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all filtered
  const toggleSelectAll = useCallback(() => {
    if (selectedReviewIds.size === filteredReviews.length && filteredReviews.length > 0) {
      setSelectedReviewIds(new Set());
    } else {
      setSelectedReviewIds(new Set(filteredReviews.map((r) => r.id)));
    }
  }, [filteredReviews, selectedReviewIds.size]);

  const renderStars = (rating: number) => '\u2B50'.repeat(rating);

  if (loading) {
    return (
      <div className="empty-state">
        <p>{t('admin.review.loading')}</p>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      {/* Add review form */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.review.addTitle')}</h2>
        </div>
        <form className="add-review-form" onSubmit={handleAddReview}>
          <div className="form-row-2">
            <div className="form-group">
              <label>{t('admin.review.customerName')} *</label>
              <input name="name" required placeholder={t('admin.review.namePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('admin.review.location')}</label>
              <input name="location" placeholder={t('admin.review.locationPlaceholder')} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>{t('admin.review.rating')} *</label>
              <select name="rating" defaultValue="5">
                <option value="5">{renderStars(5)} (5)</option>
                <option value="4">{renderStars(4)} (4)</option>
                <option value="3">{renderStars(3)} (3)</option>
                <option value="2">{renderStars(2)} (2)</option>
                <option value="1">{renderStars(1)} (1)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('admin.review.eventType')}</label>
              <input name="event" placeholder={t('admin.review.eventPlaceholder')} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('admin.review.content')} *</label>
            <textarea
              name="review"
              required
              rows={3}
              placeholder={t('admin.review.contentPlaceholder')}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('admin.review.adding') : t('admin.review.addButton')}
          </button>
        </form>
      </div>

      {/* Filters and search */}
      <div className="card">
        <div className="card-header">
          <h2>
            {t('admin.review.listTitle')} ({filteredReviews.length})
          </h2>
        </div>

        {/* Search + filter bar */}
        <div className="review-filters">
          <div className="review-search">
            <input
              type="text"
              placeholder={t('admin.review.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>
          <div className="review-filter-group">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value) as RatingFilter)}
              className="input"
            >
              <option value={0}>{t('admin.review.allRatings')}</option>
              <option value={5}>5 {renderStars(1)}</option>
              <option value={4}>4 {renderStars(1)}</option>
              <option value={3}>3 {renderStars(1)}</option>
              <option value={2}>2 {renderStars(1)}</option>
              <option value={1}>1 {renderStars(1)}</option>
            </select>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
              className="input"
            >
              <option value="all">{t('admin.review.allVisibility')}</option>
              <option value="visible">{t('admin.review.visibleOnly')}</option>
              <option value="hidden">{t('admin.review.hiddenOnly')}</option>
            </select>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedReviewIds.size > 0 && (
          <div className="review-bulk-actions">
            <span className="bulk-count">
              {t('admin.review.selectedCount', { count: selectedReviewIds.size })}
            </span>
            <button
              className="btn-sm btn-sm-success"
              onClick={() => bulkToggleVisibility(true)}
              type="button"
            >
              {t('admin.review.showSelected')}
            </button>
            <button className="btn-sm" onClick={() => bulkToggleVisibility(false)} type="button">
              {t('admin.review.hideSelected')}
            </button>
            <button
              className="btn-sm"
              onClick={() => setConfirmBulkDelete(true)}
              type="button"
              style={{ color: 'var(--admin-danger)' }}
            >
              {t('admin.review.deleteSelected')}
            </button>
          </div>
        )}

        {/* Review list */}
        {filteredReviews.length === 0 ? (
          <div className="empty-state">
            <span role="img" aria-hidden="true">
              {'\u2B50'}
            </span>
            <p>{t('admin.review.noReviews')}</p>
          </div>
        ) : (
          <div className="reviews-list">
            {/* Select all */}
            <div className="review-select-all">
              <label className="review-checkbox-label">
                <input
                  type="checkbox"
                  checked={
                    selectedReviewIds.size === filteredReviews.length && filteredReviews.length > 0
                  }
                  onChange={toggleSelectAll}
                />
                {t('admin.review.selectAll')}
              </label>
            </div>

            {filteredReviews.map((review) => {
              const isEditing = editingReviewId === review.id;

              return (
                <div key={review.id} className={`review-item ${!review.visible ? 'hidden' : ''}`}>
                  <div className="review-item-top">
                    <label className="review-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedReviewIds.has(review.id)}
                        onChange={() => toggleSelect(review.id)}
                      />
                    </label>

                    {isEditing ? (
                      /* Inline edit mode */
                      <div className="review-edit-form">
                        <div className="form-row-2">
                          <div className="form-group">
                            <label>{t('admin.review.customerName')}</label>
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <div className="form-group">
                            <label>{t('admin.review.location')}</label>
                            <input
                              value={editForm.location}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, location: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div className="form-row-2">
                          <div className="form-group">
                            <label>{t('admin.review.rating')}</label>
                            <select
                              value={editForm.rating}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  rating: parseInt(e.target.value),
                                }))
                              }
                            >
                              <option value={5}>5 {renderStars(1)}</option>
                              <option value={4}>4 {renderStars(1)}</option>
                              <option value={3}>3 {renderStars(1)}</option>
                              <option value={2}>2 {renderStars(1)}</option>
                              <option value={1}>1 {renderStars(1)}</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>{t('admin.review.eventType')}</label>
                            <input
                              value={editForm.event}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, event: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>{t('admin.review.content')}</label>
                          <textarea
                            value={editForm.review}
                            onChange={(e) => setEditForm((f) => ({ ...f, review: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div className="review-edit-actions">
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => saveEdit(review.id)}
                            disabled={submitting}
                            type="button"
                          >
                            {submitting ? t('admin.review.saving') : t('admin.review.save')}
                          </button>
                          <button className="btn-sm" onClick={cancelEdit} type="button">
                            {t('admin.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="review-content-wrapper">
                        <div className="review-header">
                          <div className="review-info">
                            <span className="review-name">{review.name}</span>
                            {review.location && (
                              <span className="review-location">{review.location}</span>
                            )}
                            {!review.visible && (
                              <span className="review-visibility-badge">
                                {t('admin.review.hiddenBadge')}
                              </span>
                            )}
                          </div>
                          <div className="review-rating">{renderStars(review.rating)}</div>
                        </div>
                        <p className="review-text">{review.review}</p>
                        <div className="review-footer">
                          {review.event && (
                            <span className="review-event">&#128204; {review.event}</span>
                          )}
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="review-actions">
                          <button
                            className="btn-sm"
                            onClick={() => startEditing(review)}
                            type="button"
                          >
                            {t('admin.review.edit')}
                          </button>
                          <button
                            className={`btn-sm ${review.visible ? '' : 'btn-sm-success'}`}
                            onClick={() => toggleVisibility(review.id, !review.visible)}
                            type="button"
                          >
                            {review.visible ? t('admin.review.hide') : t('admin.review.show')}
                          </button>
                          <button
                            className="btn-sm"
                            onClick={() => setConfirmDeleteId(review.id)}
                            type="button"
                            style={{ color: 'var(--admin-danger)' }}
                          >
                            {t('admin.review.delete')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={t('admin.review.confirmDeleteTitle')}
        message={t('admin.review.confirmDeleteMessage')}
        confirmLabel={t('admin.review.delete')}
        variant="danger"
        loading={deleting}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={confirmBulkDelete}
        title={t('admin.review.confirmBulkDeleteTitle')}
        message={t('admin.review.confirmBulkDeleteMessage', {
          count: selectedReviewIds.size,
        })}
        confirmLabel={t('admin.review.deleteSelected')}
        variant="danger"
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
};

export default ReviewManagement;
