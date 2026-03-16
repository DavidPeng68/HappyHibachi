import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser, Booking, BookingStatus } from '../../../types/admin';
import { Tabs, SlideOverPanel } from '../../../components/admin';
import * as adminApi from '../../../services/adminApi';
import { useAdmin } from '../AdminLayout';
import { useAdminNavigation } from '../../../contexts/NavigationContext';
import { useBookingsPaginated } from '../../../hooks/useBookings';
import { useToast } from '../../../contexts/ToastContext';
import BookingDetailPanel from './BookingDetailPanel';
import BookingFilterBar from './BookingFilterBar';
import BookingDataTable from './BookingDataTable';
import BookingBatchActions from './BookingBatchActions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  // Status tabs with counts
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

  // Sync filters to paginated query
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

  // Filter handlers
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

  // Update handler
  const handleUpdate = useCallback(
    async (data: Partial<Booking> & { id: string }) => {
      const res = await adminApi.updateBooking(token, data);
      if (res.success && res.booking) {
        setBookings((prev) => prev.map((b) => (b.id === data.id ? { ...b, ...res.booking } : b)));
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

  // Delete handler
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

  // Batch operations
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
        showToast(t('admin.toast.statusUpdatedCount', { count: successCount }), 'success');
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
      showToast(t('admin.toast.deleteSuccessfulCount', { count: successCount }), 'success');
    } else {
      showToast(t('admin.toast.deleteFailed'), 'error');
    }
  }, [selectedKeys, token, setBookings, refetch, showToast, t]);

  // CSV Export
  const exportBookingsCSV = useCallback(
    (rows: Booking[]) => {
      if (rows.length === 0) {
        showToast(t('admin.toast.noDataExport'), 'info');
        return;
      }
      const headers = [
        t('admin.booking.csvHeaders.name'),
        t('admin.booking.csvHeaders.email'),
        t('admin.booking.csvHeaders.phone'),
        t('admin.booking.csvHeaders.date'),
        t('admin.booking.csvHeaders.time'),
        t('admin.booking.csvHeaders.guests'),
        t('admin.booking.csvHeaders.region'),
        t('admin.booking.csvHeaders.type'),
        t('admin.booking.csvHeaders.status'),
        t('admin.booking.csvHeaders.message'),
        t('admin.booking.csvHeaders.package'),
        t('admin.booking.csvHeaders.estimatedTotal'),
        t('admin.booking.csvHeaders.submitted'),
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
      <Tabs tabs={statusTabs} activeKey={activeStatus} onChange={handleStatusChange} />

      <BookingFilterBar
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onExportAll={() => exportBookingsCSV(bookings)}
      />

      <BookingBatchActions
        selectedCount={selectedKeys.size}
        isSuperAdmin={isSuperAdmin}
        batchStatusConfirm={batchStatusConfirm}
        statusLoading={statusLoading}
        onBatchStatusOpen={(status) => setBatchStatusConfirm({ open: true, status })}
        onBatchStatusConfirm={() => handleBatchStatusUpdate(batchStatusConfirm.status)}
        onBatchStatusCancel={() => setBatchStatusConfirm({ open: false, status: 'pending' })}
        batchDeleteConfirm={batchDeleteConfirm}
        deleteLoading={deleteLoading}
        onBatchDeleteOpen={() => setBatchDeleteConfirm(true)}
        onBatchDeleteConfirm={handleBatchDelete}
        onBatchDeleteCancel={() => setBatchDeleteConfirm(false)}
        onExportSelected={exportSelected}
      />

      <BookingDataTable
        bookings={bookings}
        loading={loading}
        isSuperAdmin={isSuperAdmin}
        orderManagers={orderManagers}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(b) => setSelectedBooking(b)}
        activeRowKey={selectedBooking?.id}
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

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
    </div>
  );
};

export default BookingManagement;
