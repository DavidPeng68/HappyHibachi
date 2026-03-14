import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AdminUser,
  Booking,
  BookingStatus,
  StatusFilter,
  SortField,
  SortDirection,
} from '../../types/admin';
import { StatusBadge, ConfirmDialog, Pagination, EmptyState } from '../../components/admin';
import * as adminApi from '../../services/adminApi';
import {
  createHibachiEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICS,
} from '../../utils/calendar';
import { useAdmin } from './AdminLayout';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;
const REGIONS = ['California', 'Texas', 'Florida'] as const;
const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

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

function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, bookings, setBookings, isSuperAdmin } = useAdmin();

  // --- Local state ---
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail view state
  const [adminNotes, setAdminNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<{
    date: string;
    time: string;
    guestCount: number;
    region: string;
  }>({ date: '', time: '', guestCount: 0, region: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Confirm dialogs
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchStatusConfirm, setBatchStatusConfirm] = useState<{
    open: boolean;
    status: BookingStatus;
  }>({ open: false, status: 'pending' });
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Order managers list (for assignment dropdown, super_admin only)
  const [orderManagers, setOrderManagers] = useState<Omit<AdminUser, 'passwordHash'>[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      adminApi.fetchUsers(token).then((res) => {
        if (res.success) {
          setOrderManagers(
            res.users.filter((u) => u.role === 'order_manager' && u.status === 'approved')
          );
        }
      });
    }
  }, [isSuperAdmin, token]);

  // -------------------------------------------------------------------------
  // Filtering, sorting, pagination
  // -------------------------------------------------------------------------

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Region filter
    if (regionFilter !== 'all') {
      result = result.filter((b) => b.region === regionFilter);
    }

    // Date range filter
    if (dateRange.from) {
      result = result.filter((b) => b.date >= dateRange.from);
    }
    if (dateRange.to) {
      result = result.filter((b) => b.date <= dateRange.to);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          b.phone.includes(q) ||
          b.region.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'guestCount':
          cmp = a.guestCount - b.guestCount;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [bookings, statusFilter, regionFilter, dateRange, searchQuery, sortField, sortDirection]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bookings.length };
    for (const s of STATUSES) {
      counts[s] = bookings.filter((b) => b.status === s).length;
    }
    return counts;
  }, [bookings]);

  // Pagination
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  // Reset page when filters change
  const resetPage = useCallback(() => setCurrentPage(1), []);

  // -------------------------------------------------------------------------
  // Column sorting
  // -------------------------------------------------------------------------

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      resetPage();
    },
    [sortField, resetPage]
  );

  const sortArrow = useCallback(
    (field: SortField) => {
      if (sortField !== field) return ' \u2195';
      return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
    },
    [sortField, sortDirection]
  );

  // -------------------------------------------------------------------------
  // Selection (batch)
  // -------------------------------------------------------------------------

  const allOnPageSelected =
    paginatedBookings.length > 0 && paginatedBookings.every((b) => selectedIds.has(b.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedBookings.forEach((b) => next.delete(b.id));
      } else {
        paginatedBookings.forEach((b) => next.add(b.id));
      }
      return next;
    });
  }, [allOnPageSelected, paginatedBookings]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Assignment (super_admin only)
  // -------------------------------------------------------------------------

  const handleAssign = useCallback(
    async (bookingId: string, assignedTo: string) => {
      const res = await adminApi.updateBooking(token, {
        id: bookingId,
        assignedTo: assignedTo || '',
      });
      if (res.success && res.booking) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, assignedTo: assignedTo || undefined } : b))
        );
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking((prev) =>
            prev ? { ...prev, assignedTo: assignedTo || undefined } : prev
          );
        }
        showToast(t('admin.toast.bookingAssigned'), 'success');
      } else {
        showToast(t('admin.toast.updateFailed'), 'error');
      }
    },
    [token, showToast, setBookings, selectedBooking, t]
  );

  // Status update
  // -------------------------------------------------------------------------

  const updateStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      setStatusLoading(true);
      const res = await adminApi.updateBooking(token, { id, status });
      setStatusLoading(false);
      if (res.success && res.booking) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...res.booking } : b)));
        if (selectedBooking?.id === id) {
          setSelectedBooking((prev) => (prev ? { ...prev, status } : prev));
        }
        showToast(t('admin.toast.statusUpdated'), 'success');
      } else {
        showToast(t('admin.toast.updateFailed'), 'error');
      }
    },
    [token, setBookings, selectedBooking, showToast, t]
  );

  // -------------------------------------------------------------------------
  // Batch status update
  // -------------------------------------------------------------------------

  const handleBatchStatusUpdate = useCallback(
    async (status: BookingStatus) => {
      setStatusLoading(true);
      const ids = Array.from(selectedIds);
      let successCount = 0;
      for (const id of ids) {
        const res = await adminApi.updateBooking(token, { id, status });
        if (res.success && res.booking) {
          setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...res.booking } : b)));
          successCount++;
        }
      }
      setStatusLoading(false);
      setBatchStatusConfirm({ open: false, status: 'pending' });
      setSelectedIds(new Set());
      if (successCount > 0) {
        showToast(t('admin.toast.statusUpdated') + ` (${successCount})`, 'success');
      } else {
        showToast(t('admin.toast.updateFailed'), 'error');
      }
    },
    [selectedIds, token, setBookings, showToast, t]
  );

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteLoading(true);
      const res = await adminApi.deleteBooking(token, id);
      setDeleteLoading(false);
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setDeleteConfirm({ open: false, id: '', name: '' });
        if (selectedBooking?.id === id) {
          setSelectedBooking(null);
        }
        showToast(t('admin.toast.deleteSuccessful'), 'success');
      } else {
        showToast(t('admin.toast.deleteFailed'), 'error');
      }
    },
    [token, setBookings, selectedBooking, showToast, t]
  );

  const handleBatchDelete = useCallback(async () => {
    setDeleteLoading(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      const res = await adminApi.deleteBooking(token, id);
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        successCount++;
      }
    }
    setDeleteLoading(false);
    setBatchDeleteConfirm(false);
    setSelectedIds(new Set());
    if (successCount > 0) {
      showToast(t('admin.toast.deleteSuccessful') + ` (${successCount})`, 'success');
    } else {
      showToast(t('admin.toast.deleteFailed'), 'error');
    }
  }, [selectedIds, token, setBookings, showToast, t]);

  // -------------------------------------------------------------------------
  // Select a booking for detail view
  // -------------------------------------------------------------------------

  const openDetail = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setAdminNotes(booking.adminNotes ?? '');
    setEditMode(false);
    setEditData({
      date: booking.date,
      time: booking.time,
      guestCount: booking.guestCount,
      region: booking.region,
    });
  }, []);

  // -------------------------------------------------------------------------
  // Admin notes — auto-save on blur
  // -------------------------------------------------------------------------

  const saveAdminNotes = useCallback(async () => {
    if (!selectedBooking) return;
    if (adminNotes === (selectedBooking.adminNotes ?? '')) return;
    setNotesSaving(true);
    const res = await adminApi.updateBooking(token, {
      id: selectedBooking.id,
      adminNotes,
    });
    setNotesSaving(false);
    if (res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBooking.id ? { ...b, adminNotes } : b))
      );
      setSelectedBooking((prev) => (prev ? { ...prev, adminNotes } : prev));
      showToast(t('admin.toast.statusUpdated'), 'success');
    } else {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
  }, [selectedBooking, adminNotes, token, setBookings, showToast, t]);

  // -------------------------------------------------------------------------
  // Edit booking
  // -------------------------------------------------------------------------

  const saveEdit = useCallback(async () => {
    if (!selectedBooking) return;
    setEditSaving(true);
    const res = await adminApi.updateBooking(token, {
      id: selectedBooking.id,
      date: editData.date,
      time: editData.time,
      guestCount: editData.guestCount,
      region: editData.region,
    });
    setEditSaving(false);
    if (res.success && res.booking) {
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...res.booking } : b))
      );
      setSelectedBooking((prev) => (prev ? { ...prev, ...editData } : prev));
      setEditMode(false);
      showToast(t('admin.toast.statusUpdated'), 'success');
    } else {
      showToast(t('admin.toast.updateFailed'), 'error');
    }
  }, [selectedBooking, editData, token, setBookings, showToast, t]);

  // -------------------------------------------------------------------------
  // CSV Export
  // -------------------------------------------------------------------------

  const exportBookingsCSV = useCallback(
    (rows: Booking[]) => {
      if (rows.length === 0) {
        showToast(t('admin.toast.noDataExport'), 'info');
        return;
      }
      const headers = [
        'Name',
        'Email',
        'Phone',
        'Date',
        'Time',
        'Guests',
        'Region',
        'Type',
        'Status',
        'Message',
        'Package',
        'Estimated Total',
        'Submitted',
      ];
      const csvRows = rows.map((b) =>
        [
          `"${b.name}"`,
          `"${b.email}"`,
          `"${b.phone}"`,
          b.date,
          b.time,
          b.guestCount,
          b.region,
          b.formType,
          b.status,
          `"${(b.message ?? '').replace(/"/g, '""')}"`,
          b.orderData?.packageName ?? '',
          b.orderData?.estimatedTotal ?? '',
          b.createdAt,
        ].join(',')
      );
      const csv = [headers.join(','), ...csvRows].join('\n');
      downloadCSV(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showToast(t('admin.toast.exported', { count: rows.length }), 'success');
    },
    [showToast, t]
  );

  const exportSelected = useCallback(() => {
    const selected = bookings.filter((b) => selectedIds.has(b.id));
    exportBookingsCSV(selected);
  }, [bookings, selectedIds, exportBookingsCSV]);

  // -------------------------------------------------------------------------
  // Mobile detection
  // -------------------------------------------------------------------------

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // =========================================================================
  // RENDER — Detail View
  // =========================================================================

  if (selectedBooking) {
    const b = selectedBooking;
    return (
      <div className="booking-management">
        {/* Back button */}
        <button
          className="admin-btn bm-back-btn"
          onClick={() => setSelectedBooking(null)}
          type="button"
        >
          &larr; {t('admin.booking.backToList')}
        </button>

        <div className="bm-detail-grid">
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

          {/* --- Order Details --- */}
          {b.orderData && (
            <div className="admin-card bm-card">
              <h3 className="bm-card-title">{t('admin.booking.orderDetails')}</h3>
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
                  {b.orderData.serviceType} ({b.orderData.serviceDuration}{' '}
                  {t('admin.booking.minutes')})
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

          {/* --- Admin Notes --- */}
          <div className="admin-card bm-card">
            <h3 className="bm-card-title">
              {t('admin.booking.adminNotes')}
              {notesSaving && (
                <span className="bm-saving-indicator">{t('admin.booking.saving')}</span>
              )}
            </h3>
            <textarea
              className="bm-notes-textarea"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              onBlur={saveAdminNotes}
              placeholder={t('admin.booking.adminNotesPlaceholder')}
              rows={4}
            />
          </div>

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
            <div className="bm-status-buttons">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`admin-btn bm-status-btn bm-status-${s} ${
                    b.status === s ? 'bm-status-active' : ''
                  }`}
                  onClick={() => updateStatus(b.id, s)}
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
                onChange={(e) => handleAssign(b.id, e.target.value)}
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
          {isSuperAdmin && (
            <div className="admin-card bm-card bm-danger-zone">
              <h3 className="bm-card-title">{t('admin.booking.dangerZone')}</h3>
              <p className="bm-danger-text">{t('admin.booking.deleteWarning')}</p>
              <button
                className="admin-btn bm-delete-btn"
                onClick={() => setDeleteConfirm({ open: true, id: b.id, name: b.name })}
                type="button"
              >
                {t('admin.booking.deleteBooking')}
              </button>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        <ConfirmDialog
          open={deleteConfirm.open}
          title={t('admin.booking.deleteBooking')}
          message={t('admin.booking.deleteConfirmMessage', {
            name: deleteConfirm.name,
          })}
          variant="danger"
          loading={deleteLoading}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm({ open: false, id: '', name: '' })}
        />
      </div>
    );
  }

  // =========================================================================
  // RENDER — List View
  // =========================================================================

  return (
    <div className="booking-management">
      {/* Toolbar */}
      <div className="bm-toolbar">
        <div className="bm-search-row">
          <input
            className="bm-search-input"
            type="text"
            placeholder={t('admin.booking.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
          />
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => exportBookingsCSV(filteredBookings)}
            type="button"
          >
            {t('admin.booking.export')}
          </button>
        </div>

        {/* Status filter */}
        <div className="bm-status-filters">
          {(['all', ...STATUSES] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`admin-btn bm-filter-btn ${statusFilter === s ? 'bm-filter-active' : ''}`}
              onClick={() => {
                setStatusFilter(s);
                resetPage();
              }}
              type="button"
            >
              {t(`admin.tabs.${s}`)} ({statusCounts[s] ?? 0})
            </button>
          ))}
        </div>

        {/* Region + Date filters */}
        <div className="bm-filter-row">
          <select
            className="bm-region-select"
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              resetPage();
            }}
          >
            <option value="all">{t('admin.booking.allRegions')}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="bm-date-range">
            <label className="bm-date-label">{t('admin.booking.from')}</label>
            <input
              type="date"
              className="bm-date-input"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange((d) => ({ ...d, from: e.target.value }));
                resetPage();
              }}
            />
            <label className="bm-date-label">{t('admin.booking.to')}</label>
            <input
              type="date"
              className="bm-date-input"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange((d) => ({ ...d, to: e.target.value }));
                resetPage();
              }}
            />
          </div>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="bm-batch-bar">
          <span className="bm-batch-count">
            {t('admin.booking.selectedCount', { count: selectedIds.size })}
          </span>
          <div className="bm-batch-actions">
            <select
              className="bm-batch-status-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  setBatchStatusConfirm({
                    open: true,
                    status: e.target.value as BookingStatus,
                  });
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>
                {t('admin.booking.updateStatus')}
              </option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`admin.tabs.${s}`)}
                </option>
              ))}
            </select>
            {isSuperAdmin && (
              <button
                className="admin-btn bm-delete-btn"
                onClick={() => setBatchDeleteConfirm(true)}
                type="button"
              >
                {t('admin.booking.deleteSelected')}
              </button>
            )}
            <button className="admin-btn" onClick={exportSelected} type="button">
              {t('admin.booking.exportSelected')}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title={t('admin.booking.noBookings')}
          description={t('admin.booking.noBookingsHint')}
        />
      ) : isMobile ? (
        /* --- Mobile card view --- */
        <div className="bm-card-list">
          {paginatedBookings.map((b) => (
            <div
              key={b.id}
              className={`admin-card bm-mobile-card ${isToday(b.date) ? 'row-highlight' : ''}`}
            >
              <div className="bm-mobile-card-header">
                <label className="bm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                  />
                </label>
                <StatusBadge status={b.status} />
              </div>
              <div className="bm-mobile-card-body">
                <h4 className="bm-mobile-name">{b.name}</h4>
                <p className="bm-mobile-contact">
                  {b.phone} &middot; {b.email}
                </p>
                <p className="bm-mobile-info">
                  {formatDate(b.date)} {b.time && `@ ${b.time}`} &middot; {b.guestCount}{' '}
                  {t('admin.booking.guests')} &middot; {b.region}
                </p>
                <p className="bm-mobile-meta">
                  {b.formType === 'booking'
                    ? t('admin.booking.booking')
                    : t('admin.booking.estimate')}{' '}
                  &middot; {formatDateTime(b.createdAt)}
                </p>
              </div>
              <button
                className="admin-btn admin-btn-primary bm-mobile-view-btn"
                onClick={() => openDetail(b)}
                type="button"
              >
                {t('admin.booking.view')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* --- Desktop table view --- */
        <div className="bm-table-wrapper">
          <table className="bm-table">
            <thead>
              <tr>
                <th className="bm-th-checkbox">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    title={t('admin.booking.selectAll')}
                  />
                </th>
                <th className="bm-th-sortable" onClick={() => handleSort('name')}>
                  {t('admin.booking.customer')}
                  {sortArrow('name')}
                </th>
                <th>{t('admin.booking.contact')}</th>
                <th className="bm-th-sortable" onClick={() => handleSort('date')}>
                  {t('admin.booking.dateTime')}
                  {sortArrow('date')}
                </th>
                <th className="bm-th-sortable" onClick={() => handleSort('guestCount')}>
                  {t('admin.booking.guestCount')}
                  {sortArrow('guestCount')}
                </th>
                <th>{t('admin.booking.package')}</th>
                <th>{t('admin.booking.region')}</th>
                <th>{t('admin.booking.type')}</th>
                <th className="bm-th-sortable" onClick={() => handleSort('status')}>
                  {t('admin.booking.status')}
                  {sortArrow('status')}
                </th>
                {isSuperAdmin && <th>{t('admin.booking.assignedTo')}</th>}
                <th className="bm-th-sortable" onClick={() => handleSort('createdAt')}>
                  {t('admin.booking.submitted')}
                  {sortArrow('createdAt')}
                </th>
                <th>{t('admin.booking.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((b) => (
                <tr key={b.id} className={isToday(b.date) ? 'row-highlight' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.id)}
                      onChange={() => toggleSelect(b.id)}
                    />
                  </td>
                  <td className="bm-td-name">{b.name}</td>
                  <td className="bm-td-contact">
                    <span>{b.phone}</span>
                    <span className="bm-contact-email">{b.email}</span>
                  </td>
                  <td>
                    {formatDate(b.date)}
                    {b.time && <span className="bm-time"> {b.time}</span>}
                  </td>
                  <td>{b.guestCount}</td>
                  <td>{b.orderData?.packageName ?? '—'}</td>
                  <td>{b.region}</td>
                  <td>
                    <span className={`bm-type-badge bm-type-${b.formType}`}>
                      {b.formType === 'booking'
                        ? t('admin.booking.booking')
                        : t('admin.booking.estimate')}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  {isSuperAdmin && (
                    <td>
                      {b.assignedTo
                        ? orderManagers.find((m) => m.id === b.assignedTo)?.displayName ||
                          b.assignedTo
                        : t('admin.booking.unassigned')}
                    </td>
                  )}
                  <td className="bm-td-submitted">{formatDateTime(b.createdAt)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-primary bm-view-btn"
                      onClick={() => openDetail(b)}
                      type="button"
                    >
                      {t('admin.booking.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredBookings.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {/* Batch delete confirmation */}
      <ConfirmDialog
        open={batchDeleteConfirm}
        title={t('admin.booking.deleteSelected')}
        message={t('admin.booking.batchDeleteConfirmMessage', {
          count: selectedIds.size,
        })}
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleteConfirm(false)}
      />

      {/* Batch status update confirmation */}
      <ConfirmDialog
        open={batchStatusConfirm.open}
        title={t('admin.booking.updateStatus')}
        message={t('admin.booking.batchStatusConfirmMessage', {
          count: selectedIds.size,
          status: t(`admin.tabs.${batchStatusConfirm.status}`),
        })}
        variant="warning"
        loading={statusLoading}
        onConfirm={() => handleBatchStatusUpdate(batchStatusConfirm.status)}
        onCancel={() => setBatchStatusConfirm({ open: false, status: 'pending' })}
      />
    </div>
  );
};

export default BookingManagement;
