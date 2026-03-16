import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Coupon } from '../../types/admin';
import * as adminApi from '../../services/adminApi';
import { ConfirmDialog } from '../../components/admin';
import { useAdmin } from './AdminLayout';

// ---------------------------------------------------------------------------
// Types & defaults
// ---------------------------------------------------------------------------

interface CouponFormData {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minGuests: number;
  maxUses: number;
  validFrom: string;
  validUntil: string;
  enabled: boolean;
}

const EMPTY_COUPON_FORM: CouponFormData = {
  code: '',
  type: 'percentage',
  value: 0,
  minGuests: 0,
  maxUses: 0,
  validFrom: '',
  validUntil: '',
  enabled: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCouponStatus(coupon: Coupon): 'expired' | 'maxed' | 'active' | 'disabled' {
  const isExpired = new Date(coupon.validUntil + 'T23:59:59') < new Date();
  const isMaxed = coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses;
  if (isExpired) return 'expired';
  if (isMaxed) return 'maxed';
  if (!coupon.enabled) return 'disabled';
  return 'active';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CouponManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, bookings } = useAdmin();

  // Data state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState<CouponFormData>(EMPTY_COUPON_FORM);

  // Edit state
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CouponFormData>>({});

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch coupons on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.fetchCoupons(token).then((res) => {
      if (!cancelled) {
        if (res.success) {
          setCoupons(res.coupons);
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

  // Referral stats from bookings
  const referralStats = useMemo(() => {
    const stats: Record<string, number> = {};
    bookings.forEach((b) => {
      const source = b.referralSource || t('admin.coupon.directVisit');
      stats[source] = (stats[source] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [bookings, t]);

  // Coupon usage stats from bookings
  const couponUsageMap = useMemo(() => {
    const map: Record<string, { count: number; totalDiscount: number }> = {};
    bookings.forEach((b) => {
      if (b.couponCode) {
        const code = b.couponCode.toUpperCase();
        if (!map[code]) {
          map[code] = { count: 0, totalDiscount: 0 };
        }
        map[code].count++;
        const discountVal = parseFloat(b.couponDiscount || '0');
        if (!isNaN(discountVal)) {
          map[code].totalDiscount += discountVal;
        }
      }
    });
    return map;
  }, [bookings]);

  // Create coupon
  const handleCreateCoupon = useCallback(async () => {
    if (!newCoupon.code.trim()) {
      showToast(t('admin.toast.enterCouponCode'), 'error');
      return;
    }
    setSubmitting(true);
    const res = await adminApi.createCoupon(token, {
      code: newCoupon.code.toUpperCase(),
      type: newCoupon.type,
      value: newCoupon.value,
      minGuests: newCoupon.minGuests,
      maxUses: newCoupon.maxUses,
      validFrom: newCoupon.validFrom,
      validUntil: newCoupon.validUntil,
      enabled: newCoupon.enabled,
    });
    if (res.success && res.coupon) {
      setCoupons((prev) => [...prev, res.coupon!]);
      setNewCoupon(EMPTY_COUPON_FORM);
      setShowCouponForm(false);
      showToast(t('admin.toast.couponCreated'), 'success');
    } else {
      showToast((res as { error?: string }).error ?? t('admin.toast.createFailed'), 'error');
    }
    setSubmitting(false);
  }, [token, newCoupon, showToast, t]);

  // Toggle coupon enabled
  const toggleCoupon = useCallback(
    async (id: string, enabled: boolean) => {
      const res = await adminApi.updateCoupon(token, { id, enabled });
      if (res.success) {
        setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
        showToast(
          enabled ? t('admin.toast.couponEnabled') : t('admin.toast.couponDisabled'),
          'success'
        );
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.operationFailed'), 'error');
      }
    },
    [token, showToast, t]
  );

  // Delete coupon
  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(true);
      const res = await adminApi.deleteCoupon(token, id);
      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        showToast(t('admin.toast.couponDeleted'), 'success');
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.deleteFailed'), 'error');
      }
      setDeleting(false);
      setConfirmDeleteId(null);
    },
    [token, showToast, t]
  );

  // Edit coupon
  const startEditing = useCallback((coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setEditForm({
      value: coupon.value,
      minGuests: coupon.minGuests,
      maxUses: coupon.maxUses,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
    });
  }, []);

  const saveEdit = useCallback(
    async (id: string) => {
      setSubmitting(true);
      const res = await adminApi.updateCoupon(token, { id, ...editForm });
      if (res.success) {
        setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...editForm } : c)));
        setEditingCouponId(null);
        showToast(t('admin.toast.statusUpdated'), 'success');
      } else {
        showToast((res as { error?: string }).error ?? t('admin.toast.updateFailed'), 'error');
      }
      setSubmitting(false);
    },
    [token, editForm, showToast, t]
  );

  const cancelEdit = useCallback(() => {
    setEditingCouponId(null);
    setEditForm({});
  }, []);

  // Duplicate coupon
  const duplicateCoupon = useCallback((coupon: Coupon) => {
    setNewCoupon({
      code: '',
      type: coupon.type,
      value: coupon.value,
      minGuests: coupon.minGuests,
      maxUses: coupon.maxUses,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      enabled: true,
    });
    setShowCouponForm(true);
  }, []);

  if (loading) {
    return (
      <div className="empty-state">
        <p>{t('admin.coupon.loading')}</p>
      </div>
    );
  }

  return (
    <div className="coupons-page">
      {/* Coupon management */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.coupon.title')}</h2>
          <button
            className="btn-primary"
            onClick={() => {
              if (showCouponForm) {
                setNewCoupon(EMPTY_COUPON_FORM);
              }
              setShowCouponForm(!showCouponForm);
            }}
            type="button"
          >
            {showCouponForm ? t('admin.cancel') : t('admin.coupon.newCoupon')}
          </button>
        </div>

        {/* Create coupon form */}
        {showCouponForm && (
          <div className="coupon-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>{t('admin.coupon.code')} *</label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={t('admin.coupon.codePlaceholder')}
                  className="coupon-code-input"
                />
              </div>
              <div className="form-group">
                <label>{t('admin.coupon.discountType')}</label>
                <select
                  value={newCoupon.type}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      type: e.target.value as 'percentage' | 'fixed',
                    }))
                  }
                >
                  <option value="percentage">{t('admin.coupon.percentage')}</option>
                  <option value="fixed">{t('admin.coupon.fixedAmount')}</option>
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>{t('admin.coupon.discountValue')} *</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    value={newCoupon.value || 0}
                    onChange={(e) =>
                      setNewCoupon((prev) => ({
                        ...prev,
                        value: parseInt(e.target.value) || 0,
                      }))
                    }
                    min="0"
                  />
                  <span>{newCoupon.type === 'percentage' ? '%' : '$'}</span>
                </div>
              </div>
              <div className="form-group">
                <label>{t('admin.coupon.minGuests')}</label>
                <input
                  type="number"
                  value={newCoupon.minGuests || 0}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      minGuests: parseInt(e.target.value) || 0,
                    }))
                  }
                  min="0"
                  placeholder={t('admin.coupon.noLimit')}
                />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>{t('admin.coupon.maxUses')}</label>
                <input
                  type="number"
                  value={newCoupon.maxUses || 0}
                  onChange={(e) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      maxUses: parseInt(e.target.value) || 0,
                    }))
                  }
                  min="0"
                  placeholder={t('admin.coupon.noLimit')}
                />
              </div>
              <div className="form-group">
                <label>{t('admin.coupon.validity')}</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={newCoupon.validFrom}
                    onChange={(e) =>
                      setNewCoupon((prev) => ({ ...prev, validFrom: e.target.value }))
                    }
                  />
                  <span>{t('admin.coupon.to')}</span>
                  <input
                    type="date"
                    value={newCoupon.validUntil}
                    onChange={(e) =>
                      setNewCoupon((prev) => ({ ...prev, validUntil: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="review-checkbox-label">
                <input
                  type="checkbox"
                  checked={newCoupon.enabled}
                  onChange={(e) => setNewCoupon((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                {t('admin.coupon.enabledOnCreate')}
              </label>
            </div>
            <button
              className="btn-primary"
              onClick={handleCreateCoupon}
              disabled={submitting}
              type="button"
            >
              {submitting ? t('admin.coupon.creating') : t('admin.coupon.createButton')}
            </button>
          </div>
        )}

        {/* Coupon list */}
        {coupons.length === 0 ? (
          <div className="empty-state">
            <span role="img" aria-hidden="true">
              &#127903;
            </span>
            <p>{t('admin.coupon.noCoupons')}</p>
          </div>
        ) : (
          <div className="coupons-list">
            {coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              const isEditing = editingCouponId === coupon.id;
              const usage = couponUsageMap[coupon.code.toUpperCase()];

              return (
                <div
                  key={coupon.id}
                  className={`coupon-item ${status !== 'active' ? 'disabled' : ''}`}
                >
                  {isEditing ? (
                    /* Inline edit mode */
                    <div className="coupon-edit-form">
                      <div className="coupon-main">
                        <div className="coupon-code">{coupon.code}</div>
                        <div className="coupon-value">
                          {coupon.type === 'percentage' ? '%' : '$'}{' '}
                          {t('admin.coupon.discountType')}
                        </div>
                      </div>
                      <div className="form-row-2">
                        <div className="form-group">
                          <label>{t('admin.coupon.discountValue')}</label>
                          <div className="input-with-suffix">
                            <input
                              type="number"
                              value={editForm.value ?? coupon.value}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  value: parseInt(e.target.value) || 0,
                                }))
                              }
                              min="0"
                            />
                            <span>{coupon.type === 'percentage' ? '%' : '$'}</span>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>{t('admin.coupon.minGuests')}</label>
                          <input
                            type="number"
                            value={editForm.minGuests ?? coupon.minGuests}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                minGuests: parseInt(e.target.value) || 0,
                              }))
                            }
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="form-row-2">
                        <div className="form-group">
                          <label>{t('admin.coupon.maxUses')}</label>
                          <input
                            type="number"
                            value={editForm.maxUses ?? coupon.maxUses}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                maxUses: parseInt(e.target.value) || 0,
                              }))
                            }
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('admin.coupon.validity')}</label>
                          <div className="date-range">
                            <input
                              type="date"
                              value={editForm.validFrom ?? coupon.validFrom}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, validFrom: e.target.value }))
                              }
                            />
                            <span>{t('admin.coupon.to')}</span>
                            <input
                              type="date"
                              value={editForm.validUntil ?? coupon.validUntil}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, validUntil: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="review-edit-actions">
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => saveEdit(coupon.id)}
                          disabled={submitting}
                          type="button"
                        >
                          {submitting ? t('admin.coupon.saving') : t('admin.coupon.save')}
                        </button>
                        <button className="btn-sm" onClick={cancelEdit} type="button">
                          {t('admin.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="coupon-main">
                        <div className="coupon-code">{coupon.code}</div>
                        <div className="coupon-value">
                          {coupon.type === 'percentage'
                            ? `${coupon.value}% OFF`
                            : `$${coupon.value} OFF`}
                        </div>
                      </div>
                      <div className="coupon-details">
                        <span>
                          &#128101; {t('admin.coupon.min')} {coupon.minGuests || '\u221E'}{' '}
                          {t('admin.coupon.guests')}
                        </span>
                        <span>
                          &#127919; {t('admin.coupon.used')} {coupon.usedCount}/
                          {coupon.maxUses || '\u221E'}
                        </span>
                        <span>
                          &#128197; {coupon.validFrom} ~ {coupon.validUntil}
                        </span>
                      </div>

                      {/* Coupon usage stats */}
                      {usage && (
                        <div className="coupon-usage-stats">
                          <span>
                            &#128200; {usage.count} {t('admin.coupon.bookingsUsed')}
                          </span>
                          {usage.totalDiscount > 0 && (
                            <span>
                              &#128176; ${usage.totalDiscount.toFixed(2)}{' '}
                              {t('admin.coupon.totalDiscount')}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="coupon-status">
                        <span className={`status-badge ${status}`}>
                          {status === 'expired'
                            ? t('admin.coupon.expired')
                            : status === 'maxed'
                              ? t('admin.coupon.maxed')
                              : status === 'active'
                                ? t('admin.coupon.active')
                                : t('admin.coupon.disabled')}
                        </span>
                      </div>
                      <div className="coupon-actions">
                        <button
                          className="btn-sm"
                          onClick={() => startEditing(coupon)}
                          type="button"
                        >
                          {t('admin.coupon.edit')}
                        </button>
                        <button
                          className="btn-sm"
                          onClick={() => duplicateCoupon(coupon)}
                          type="button"
                        >
                          {t('admin.coupon.duplicate')}
                        </button>
                        <button
                          className={`btn-sm ${coupon.enabled ? '' : 'btn-sm-success'}`}
                          onClick={() => toggleCoupon(coupon.id, !coupon.enabled)}
                          disabled={status === 'expired' || status === 'maxed'}
                          type="button"
                        >
                          {coupon.enabled ? t('admin.coupon.disable') : t('admin.coupon.enable')}
                        </button>
                        <button
                          className="btn-sm coupon-btn-danger"
                          onClick={() => setConfirmDeleteId(coupon.id)}
                          type="button"
                        >
                          {t('admin.coupon.deleteButton')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Referral source stats */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.coupon.referralTitle')}</h2>
        </div>
        {referralStats.length === 0 ? (
          <div className="empty-state">
            <span role="img" aria-hidden="true">
              &#128202;
            </span>
            <p>{t('admin.coupon.noReferralData')}</p>
          </div>
        ) : (
          <div className="referral-stats">
            {referralStats.map(([source, count], index) => (
              <div key={source} className="referral-item">
                <span className="referral-rank">#{index + 1}</span>
                <span className="referral-source">{source}</span>
                <span className="referral-count">
                  {count} {t('admin.coupon.bookings')}
                </span>
                <div
                  className="referral-bar"
                  style={{
                    width: `${(count / referralStats[0][1]) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={t('admin.coupon.confirmDeleteTitle')}
        message={t('admin.coupon.confirmDeleteMessage')}
        confirmLabel={t('admin.coupon.deleteButton')}
        variant="danger"
        loading={deleting}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default CouponManagement;
