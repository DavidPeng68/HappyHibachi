import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser, Booking, BookingStatus } from '../../../types/admin';
import { StatusBadge, ConfirmDialog } from '../../../components/admin';
import {
  createHibachiEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICS,
} from '../../../utils/calendar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGIONS = ['California', 'Texas', 'Florida'] as const;
const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BookingDetailInfoProps {
  booking: Booking;
  onUpdate: (data: Partial<Booking> & { id: string }) => Promise<void>;
  onDelete?: (id: string) => void;
  isSuperAdmin: boolean;
  orderManagers: Omit<AdminUser, 'passwordHash'>[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingDetailInfo: React.FC<BookingDetailInfoProps> = ({
  booking: b,
  onUpdate,
  onDelete,
  isSuperAdmin,
  orderManagers,
  showToast,
}) => {
  const { t } = useTranslation();

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    date: b.date,
    time: b.time,
    guestCount: b.guestCount,
    region: b.region,
  });
  const [editSaving, setEditSaving] = useState(false);

  // Status
  const [statusLoading, setStatusLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<BookingStatus | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- Save edit ---
  const saveEdit = useCallback(async () => {
    setEditSaving(true);
    try {
      await onUpdate({
        id: b.id,
        date: editData.date,
        time: editData.time,
        guestCount: editData.guestCount,
        region: editData.region,
      });
      setEditMode(false);
    } finally {
      setEditSaving(false);
    }
  }, [b.id, editData, onUpdate]);

  // --- Update status ---
  const updateStatus = useCallback(
    async (status: BookingStatus) => {
      setStatusLoading(true);
      try {
        await onUpdate({ id: b.id, status });
      } finally {
        setStatusLoading(false);
      }
    },
    [b.id, onUpdate]
  );

  // --- Assign ---
  const handleAssign = useCallback(
    async (assignedTo: string) => {
      await onUpdate({ id: b.id, assignedTo: assignedTo || '' });
    },
    [b.id, onUpdate]
  );

  // --- Delete ---
  const handleDelete = useCallback(() => {
    if (!onDelete) return;
    setDeleteLoading(true);
    onDelete(b.id);
  }, [b.id, onDelete]);

  return (
    <>
      {/* --- Customer Info --- */}
      <div className="admin-card bm-card">
        <h3 className="bm-card-title">{t('admin.booking.contactInfo')}</h3>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.name')}</span>
          <span className="bm-value">{b.name}</span>
        </div>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.phone')}</span>
          <span className="bm-value">
            {b.phone}
            <button
              className="bm-copy-btn"
              onClick={() =>
                copyToClipboard(b.phone).then(() =>
                  showToast(t('admin.toast.clipboardCopied'), 'success')
                )
              }
              type="button"
              title={t('admin.booking.copyPhone')}
            >
              {t('admin.booking.copy')}
            </button>
          </span>
        </div>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.email')}</span>
          <span className="bm-value">
            {b.email}
            <button
              className="bm-copy-btn"
              onClick={() =>
                copyToClipboard(b.email).then(() =>
                  showToast(t('admin.toast.clipboardCopied'), 'success')
                )
              }
              type="button"
              title={t('admin.booking.copyEmail')}
            >
              {t('admin.booking.copy')}
            </button>
          </span>
        </div>
        <div className="bm-quick-actions">
          <a href={`tel:${b.phone}`} className="admin-btn bm-action-btn">
            {t('admin.booking.callCustomer')}
          </a>
          <a href={`sms:${b.phone}`} className="admin-btn bm-action-btn">
            {t('admin.booking.smsCustomer')}
          </a>
          <a href={`mailto:${b.email}`} className="admin-btn bm-action-btn">
            {t('admin.booking.emailCustomer')}
          </a>
        </div>
      </div>

      {/* --- Booking Details --- */}
      <div className="admin-card bm-card">
        <h3 className="bm-card-title">{t('admin.booking.eventDetails')}</h3>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.date')}</span>
          <span className="bm-value">{formatDate(b.date)}</span>
        </div>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.time')}</span>
          <span className="bm-value">{b.time || t('admin.booking.notSpecified')}</span>
        </div>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.guestCount')}</span>
          <span className="bm-value">
            {b.guestCount} {t('admin.booking.guests')}
          </span>
        </div>
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.region')}</span>
          <span className="bm-value">{b.region}</span>
        </div>
        {b.eventType && (
          <div className="bm-detail-row">
            <span className="bm-label">{t('admin.booking.eventType')}</span>
            <span className="bm-value">{b.eventType}</span>
          </div>
        )}
        <div className="bm-detail-row">
          <span className="bm-label">{t('admin.booking.submitted')}</span>
          <span className="bm-value">{formatDateTime(b.createdAt)}</span>
        </div>
        {b.message && (
          <div className="bm-detail-row bm-notes-block">
            <span className="bm-label">{t('admin.booking.additionalNotes')}</span>
            <p className="bm-customer-notes">{b.message}</p>
          </div>
        )}
        <div className="bm-quick-actions" style={{ marginTop: '1rem' }}>
          <a
            href={generateGoogleCalendarUrl(
              createHibachiEvent(b.date, b.time, b.guestCount, b.region, b.name)
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-primary bm-action-btn"
          >
            {t('admin.booking.addToGoogleCalendar')}
          </a>
          <a
            href={generateOutlookCalendarUrl(
              createHibachiEvent(b.date, b.time, b.guestCount, b.region, b.name)
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn bm-action-btn"
            style={{ background: '#0078d4', color: 'white' }}
          >
            {t('admin.booking.addToOutlook')}
          </a>
          <button
            className="admin-btn bm-action-btn"
            onClick={() =>
              downloadICS(createHibachiEvent(b.date, b.time, b.guestCount, b.region, b.name))
            }
            type="button"
          >
            {t('admin.booking.downloadICal')}
          </button>
        </div>
      </div>

      {/* --- Discount Info --- */}
      <div className="admin-card bm-card">
        <h3 className="bm-card-title">{t('admin.booking.discountInfo')}</h3>
        {b.couponCode ? (
          <div className="bm-detail-row">
            <span className="bm-label">{t('admin.booking.couponApplied')}</span>
            <span className="bm-value">
              {b.couponCode} &rarr; {b.couponDiscount}
            </span>
          </div>
        ) : null}
        {b.referralCode ? (
          <div className="bm-detail-row">
            <span className="bm-label">{t('admin.booking.referralApplied')}</span>
            <span className="bm-value">
              {b.referralCode} &rarr; {b.referralDiscount}
            </span>
          </div>
        ) : null}
        {!b.couponCode && !b.referralCode && (
          <div className="bm-detail-row">
            <span className="bm-value">{t('admin.booking.noDiscount')}</span>
          </div>
        )}
      </div>

      {/* --- Order Details --- */}
      {b.orderData && (
        <div className="admin-card bm-card">
          <h3 className="bm-card-title">{t('admin.booking.orderDetails')}</h3>
          <p className="bm-subtitle">{t('admin.booking.orderSnapshot')}</p>
          <div className="bm-detail-row">
            <span className="bm-label">{t('admin.booking.package')}</span>
            <span className="bm-value">{b.orderData.packageName}</span>
          </div>
          <div className="bm-detail-row">
            <span className="bm-label">{t('admin.booking.guestsAndKids')}</span>
            <span className="bm-value">
              {b.orderData.guestCount} {t('admin.booking.guests')} / {b.orderData.kidsCount}{' '}
              {t('admin.booking.kids')}
            </span>
          </div>
          <div className="bm-detail-row">
            <span className="bm-label">{t('admin.booking.serviceType')}</span>
            <span className="bm-value">
              {b.orderData.serviceType} ({b.orderData.serviceDuration} {t('admin.booking.minutes')})
            </span>
          </div>
          {b.orderData.proteins.length > 0 && (
            <div className="bm-detail-row">
              <span className="bm-label">{t('admin.booking.proteins')}</span>
              <span className="bm-value">{b.orderData.proteins.join(', ')}</span>
            </div>
          )}
          {b.orderData.addons.length > 0 && (
            <div className="bm-detail-row">
              <span className="bm-label">{t('admin.booking.addons')}</span>
              <div className="bm-addon-list">
                {b.orderData.addons.map((addon, i) => (
                  <span key={i} className="bm-addon-item">
                    {addon.name} x{addon.quantity} ($
                    {addon.unitPrice.toFixed(2)})
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="bm-detail-row bm-total-row">
            <span className="bm-label">{t('admin.booking.estimatedTotal')}</span>
            <span className="bm-value bm-total">${b.orderData.estimatedTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* --- Edit Booking --- */}
      <div className="admin-card bm-card">
        <div className="bm-card-header">
          <h3 className="bm-card-title">{t('admin.booking.editBooking')}</h3>
          {!editMode && (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => setEditMode(true)}
              type="button"
            >
              {t('admin.booking.edit')}
            </button>
          )}
        </div>
        {editMode && (
          <div className="bm-edit-form">
            <div className="bm-edit-field">
              <label>{t('admin.booking.date')}</label>
              <input
                type="date"
                value={editData.date}
                onChange={(e) => setEditData((d) => ({ ...d, date: e.target.value }))}
              />
            </div>
            <div className="bm-edit-field">
              <label>{t('admin.booking.time')}</label>
              <input
                type="time"
                value={editData.time}
                onChange={(e) => setEditData((d) => ({ ...d, time: e.target.value }))}
              />
            </div>
            <div className="bm-edit-field">
              <label>{t('admin.booking.guestCount')}</label>
              <input
                type="number"
                min={1}
                value={editData.guestCount}
                onChange={(e) =>
                  setEditData((d) => ({
                    ...d,
                    guestCount: parseInt(e.target.value, 10) || 1,
                  }))
                }
              />
            </div>
            <div className="bm-edit-field">
              <label>{t('admin.booking.region')}</label>
              <select
                value={editData.region}
                onChange={(e) => setEditData((d) => ({ ...d, region: e.target.value }))}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="bm-edit-actions">
              <button
                className="admin-btn"
                onClick={() => {
                  setEditMode(false);
                  setEditData({
                    date: b.date,
                    time: b.time,
                    guestCount: b.guestCount,
                    region: b.region,
                  });
                }}
                type="button"
              >
                {t('admin.cancel')}
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={saveEdit}
                disabled={editSaving}
                type="button"
              >
                {editSaving ? t('admin.booking.saving') : t('admin.booking.save')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Status Management --- */}
      <div className="admin-card bm-card">
        <h3 className="bm-card-title">{t('admin.booking.updateStatus')}</h3>
        <div className="bm-detail-row" style={{ marginBottom: '0.75rem' }}>
          <span className="bm-label">{t('admin.booking.status')}</span>
          <StatusBadge status={b.status} />
        </div>
        <div className="bm-status-buttons">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`admin-btn bm-status-btn bm-status-${s} ${
                b.status === s ? 'bm-status-active' : ''
              }`}
              onClick={() => setConfirmStatus(s)}
              disabled={b.status === s || statusLoading}
              type="button"
            >
              {t(`admin.tabs.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* --- Assignment (super_admin only) --- */}
      {isSuperAdmin && (
        <div className="admin-card bm-card">
          <h3 className="bm-card-title">{t('admin.booking.assignTo')}</h3>
          <select
            className="admin-select"
            value={b.assignedTo || ''}
            onChange={(e) => handleAssign(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">{t('admin.booking.unassigned')}</option>
            {orderManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.username})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- Danger Zone (super_admin only) --- */}
      {isSuperAdmin && onDelete && (
        <div className="admin-card bm-card bm-danger-zone">
          <h3 className="bm-card-title">{t('admin.booking.dangerZone')}</h3>
          <p className="bm-danger-text">{t('admin.booking.deleteWarning')}</p>
          <button
            className="admin-btn bm-delete-btn"
            onClick={() => setDeleteConfirm(true)}
            type="button"
          >
            {t('admin.booking.deleteBooking')}
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteConfirm}
        title={t('admin.booking.deleteBooking')}
        message={t('admin.booking.deleteConfirmMessage', { name: b.name })}
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />

      {/* Status change confirmation */}
      <ConfirmDialog
        open={confirmStatus !== null}
        title={t('admin.booking.updateStatus')}
        message={t('admin.booking.confirmStatusChange', {
          status: confirmStatus ? t(`admin.tabs.${confirmStatus}`) : '',
        })}
        variant="warning"
        loading={statusLoading}
        onConfirm={() => {
          if (confirmStatus) {
            updateStatus(confirmStatus);
            setConfirmStatus(null);
          }
        }}
        onCancel={() => setConfirmStatus(null)}
      />
    </>
  );
};

export default BookingDetailInfo;
