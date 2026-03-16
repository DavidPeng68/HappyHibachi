import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser, Booking, BookingStatus } from '../../types/admin';
import type { Column } from '../../components/admin/DataTable';
import {
  StatusBadge,
  ConfirmDialog,
  Pagination,
  DataTable,
  FilterBar,
  Tabs,
  SlideOverPanel,
} from '../../components/admin';
import type { FilterConfig } from '../../components/admin/FilterBar';
import * as adminApi from '../../services/adminApi';
import { useAdmin } from './AdminLayout';
import { useAdminNavigation } from '../../contexts/NavigationContext';
import { useBookingsPaginated } from '../../hooks/useBookings';
import { useToast } from '../../contexts/ToastContext';
import BookingDetailPanel from './BookingDetailPanel';

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

function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingManagement: React.FC = () => {
  const { t } = useTranslation();
  const {
    token,
    userId,
    displayName,
    isSuperAdmin,
    bookings: contextBookings,
    setBookings,
  } = useAdmin();
  const { showToast } = useToast();

  // Server-side paginated data
  const {
    data: bookings,
    total,
    page,
    pageSize,
    loading,
    setPage,
    setParams,
    refetch,
  } = useBookingsPaginated();

  // Local UI state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Navigation payload (drill-down from Analytics)
  const { navigationPayload, clearNavigationPayload } = useAdminNavigation();

  useEffect(() => {
    if (!navigationPayload) return;

    if (navigationPayload.status && STATUSES.includes(navigationPayload.status as BookingStatus)) {
      setActiveStatus(navigationPayload.status);
    }
    if (navigationPayload.region) {
      setFilterValues((prev) => ({ ...prev, region: navigationPayload.region }));
    }
    if (navigationPayload.search) {
      setFilterValues((prev) => ({ ...prev, search: navigationPayload.search }));
    }
    if (navigationPayload.dateFrom) {
      setFilterValues((prev) => ({ ...prev, dateFrom: navigationPayload.dateFrom }));
    }

    clearNavigationPayload();
  }, [navigationPayload, clearNavigationPayload]);

  // Confirm dialogs
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchStatusConfirm, setBatchStatusConfirm] = useState<{
    open: boolean;
    status: BookingStatus;
  }>({ open: false, status: 'pending' });
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Order managers (super_admin only)
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
  // Status tabs with counts (from context bookings for global counts)
  // -------------------------------------------------------------------------

  const statusTabs = useMemo(() => {
    const counts: Record<string, number> = { all: contextBookings.length };
    for (const s of STATUSES) {
      counts[s] = contextBookings.filter((b) => b.status === s).length;
    }
    return [
      { key: 'all', label: t('admin.tabs.all'), count: counts.all },
      ...STATUSES.map((s) => ({
        key: s,
        label: t(`admin.tabs.${s}`),
        count: counts[s],
      })),
    ];
  }, [contextBookings, t]);

  // -------------------------------------------------------------------------
  // Filter config for FilterBar
  // -------------------------------------------------------------------------

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        key: 'search',
        label: t('admin.booking.searchPlaceholder'),
        type: 'search' as const,
        placeholder: t('admin.booking.searchPlaceholder'),
      },
      {
        key: 'region',
        label: t('admin.booking.allRegions'),
        type: 'select' as const,
        options: REGIONS.map((r) => ({ value: r, label: r })),
      },
      {
        key: 'date',
        label: t('admin.booking.dateTime'),
        type: 'dateRange' as const,
      },
    ],
    [t]
  );

  // -------------------------------------------------------------------------
  // Column definitions for DataTable
  // -------------------------------------------------------------------------

  const columns = useMemo<Column<Booking>[]>(
    () => [
      {
        key: 'name',
        header: t('admin.booking.customer'),
        sortable: true,
        render: (b) => (
          <div>
            <div className="bm-td-name">{b.name}</div>
            <div className="bm-contact-email">{b.email}</div>
          </div>
        ),
      },
      {
        key: 'date',
        header: t('admin.booking.dateTime'),
        sortable: true,
        render: (b) => (
          <span>
            {formatDate(b.date)}
            {b.time && <span className="bm-time"> {b.time}</span>}
          </span>
        ),
      },
      {
        key: 'guestCount',
        header: t('admin.booking.guestCount'),
        sortable: true,
        width: '90px',
        render: (b) => <span>{b.guestCount}</span>,
      },
      {
        key: 'region',
        header: t('admin.booking.region'),
        render: (b) => <span>{b.region}</span>,
      },
      {
        key: 'type',
        header: t('admin.booking.type'),
        render: (b) => (
          <span className={`bm-type-badge bm-type-${b.formType}`}>
            {b.formType === 'booking' ? t('admin.booking.booking') : t('admin.booking.estimate')}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('admin.booking.status'),
        sortable: true,
        render: (b) => <StatusBadge status={b.status} />,
      },
      ...(isSuperAdmin
        ? [
            {
              key: 'assignedTo',
              header: t('admin.booking.assignedTo'),
              render: (b: Booking) =>
                b.assignedTo
                  ? orderManagers.find((m) => m.id === b.assignedTo)?.displayName || b.assignedTo
                  : t('admin.booking.unassigned'),
            },
          ]
        : []),
      {
        key: 'createdAt',
        header: t('admin.booking.submitted'),
        sortable: true,
        render: (b) => <span className="bm-td-submitted">{formatDateTime(b.createdAt)}</span>,
      },
    ],
    [t, isSuperAdmin, orderManagers]
  );

  // -------------------------------------------------------------------------
  // Sync filters to paginated query
  // -------------------------------------------------------------------------

  useEffect(() => {
    setParams({
      status: activeStatus === 'all' ? undefined : activeStatus,
      search: filterValues.search || undefined,
      region: filterValues.region || undefined,
      dateFrom: filterValues.dateFrom || undefined,
      dateTo: filterValues.dateTo || undefined,
      sort: sortField,
      dir: sortDir,
    });
  }, [activeStatus, filterValues, sortField, sortDir, setParams]);

  // -------------------------------------------------------------------------
  // Filter handlers
  // -------------------------------------------------------------------------

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleStatusChange = useCallback((key: string) => {
    setActiveStatus(key);
  }, []);

  const handleSort = useCallback((field: string, dir: 'asc' | 'desc') => {
    setSortField(field);
    setSortDir(dir);
  }, []);

  // -------------------------------------------------------------------------
  // Update handler (used by detail panel and inline)
  // -------------------------------------------------------------------------

  const handleUpdate = useCallback(
    async (data: Partial<Booking> & { id: string }) => {
      const res = await adminApi.updateBooking(token, data);
      if (res.success && res.booking) {
        // Sync context bookings so other pages (Dashboard, Calendar) see changes
        setBookings((prev) => prev.map((b) => (b.id === data.id ? { ...b, ...res.booking } : b)));
        // Update selected booking if it's the one being edited
        if (selectedBooking?.id === data.id) {
          setSelectedBooking((prev) => (prev ? { ...prev, ...data } : prev));
        }
        refetch();
        showToast(t('admin.toast.statusUpdated'), 'success');
      } else {
        showToast(t('admin.toast.updateFailed'), 'error');
      }
    },
    [token, setBookings, selectedBooking, refetch, showToast, t]
  );

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteLoading(true);
      const res = await adminApi.deleteBooking(token, id);
      setDeleteLoading(false);
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        if (selectedBooking?.id === id) {
          setSelectedBooking(null);
        }
        refetch();
        showToast(t('admin.toast.deleteSuccessful'), 'success');
      } else {
        showToast(t('admin.toast.deleteFailed'), 'error');
      }
    },
    [token, setBookings, selectedBooking, refetch, showToast, t]
  );

  // -------------------------------------------------------------------------
  // Batch operations — Promise.allSettled
  // -------------------------------------------------------------------------

  const handleBatchStatusUpdate = useCallback(
    async (status: BookingStatus) => {
      setStatusLoading(true);
      const ids = Array.from(selectedKeys);
      const results = await Promise.allSettled(
        ids.map((id) => adminApi.updateBooking(token, { id, status }))
      );
      let successCount = 0;
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.booking) {
          setBookings((prev) =>
            prev.map((b) => (b.id === ids[i] ? { ...b, ...result.value.booking } : b))
          );
          successCount++;
        }
      });
      setStatusLoading(false);
      setBatchStatusConfirm({ open: false, status: 'pending' });
      setSelectedKeys(new Set());
      refetch();
      if (successCount > 0) {
        showToast(t('admin.toast.statusUpdated') + ` (${successCount})`, 'success');
      } else {
        showToast(t('admin.toast.updateFailed'), 'error');
      }
    },
    [selectedKeys, token, setBookings, refetch, showToast, t]
  );

  const handleBatchDelete = useCallback(async () => {
    setDeleteLoading(true);
    const ids = Array.from(selectedKeys);
    const results = await Promise.allSettled(ids.map((id) => adminApi.deleteBooking(token, id)));
    let successCount = 0;
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.success) {
        setBookings((prev) => prev.filter((b) => b.id !== ids[i]));
        successCount++;
      }
    });
    setDeleteLoading(false);
    setBatchDeleteConfirm(false);
    setSelectedKeys(new Set());
    refetch();
    if (successCount > 0) {
      showToast(t('admin.toast.deleteSuccessful') + ` (${successCount})`, 'success');
    } else {
      showToast(t('admin.toast.deleteFailed'), 'error');
    }
  }, [selectedKeys, token, setBookings, refetch, showToast, t]);

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
    const selected = bookings.filter((b) => selectedKeys.has(b.id));
    exportBookingsCSV(selected);
  }, [bookings, selectedKeys, exportBookingsCSV]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="booking-management">
      {/* Status Tabs */}
      <Tabs tabs={statusTabs} activeKey={activeStatus} onChange={handleStatusChange} />

      {/* Filter Bar + Export */}
      <div className="bm-toolbar">
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => exportBookingsCSV(bookings)}
          type="button"
        >
          {t('admin.booking.export')}
        </button>
      </div>

      {/* Batch actions bar */}
      {selectedKeys.size > 0 && (
        <div className="bm-batch-bar">
          <span className="bm-batch-count">
            {t('admin.booking.selectedCount', { count: selectedKeys.size })}
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

      {/* Data Table */}
      <DataTable<Booking>
        columns={columns}
        data={bookings}
        loading={loading}
        rowKey={(b) => b.id}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(b) => setSelectedBooking(b)}
        activeRowKey={selectedBooking?.id}
        emptyIcon="&#128203;"
        emptyTitle={t('admin.booking.noBookings')}
        emptyDescription={t('admin.booking.noBookingsHint')}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Slide-over detail panel */}
      <SlideOverPanel
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking?.name || ''}
        width={560}
      >
        {selectedBooking && (
          <BookingDetailPanel
            booking={selectedBooking}
            onUpdate={handleUpdate}
            onDelete={isSuperAdmin ? handleDelete : undefined}
            onClose={() => setSelectedBooking(null)}
            isSuperAdmin={isSuperAdmin}
            orderManagers={orderManagers}
            showToast={showToast}
            token={token}
            userId={userId}
            displayName={displayName}
          />
        )}
      </SlideOverPanel>

      {/* Batch delete confirmation */}
      <ConfirmDialog
        open={batchDeleteConfirm}
        title={t('admin.booking.deleteSelected')}
        message={t('admin.booking.batchDeleteConfirmMessage', {
          count: selectedKeys.size,
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
          count: selectedKeys.size,
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
