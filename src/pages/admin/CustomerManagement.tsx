import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { useToast } from '../../contexts/ToastContext';
import { useCustomersPaginated } from '../../hooks/useCustomers';
import DataTable from '../../components/admin/DataTable';
import type { Column } from '../../components/admin/DataTable';
import FilterBar from '../../components/admin/FilterBar';
import type { FilterConfig } from '../../components/admin/FilterBar';
import SlideOverPanel from '../../components/admin/SlideOverPanel';
import Tag from '../../components/admin/Tag';
import Pagination from '../../components/admin/Pagination';
import type { Customer } from '../../types/admin';
import * as adminApi from '../../services/adminApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Default tags
// ---------------------------------------------------------------------------

const DEFAULT_TAGS = ['VIP', 'Corporate', 'First-Time'];

// ---------------------------------------------------------------------------
// Booking status → CSS modifier
// ---------------------------------------------------------------------------

const statusModifier = (status: string) => {
  switch (status) {
    case 'completed':
    case 'confirmed':
    case 'pending':
    case 'cancelled':
      return status;
    default:
      return '';
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomerManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, bookings } = useAdmin();
  const { showToast } = useToast();

  const {
    data: customers,
    total,
    page,
    pageSize,
    loading,
    setPage,
    setParams,
    refetch,
  } = useCustomersPaginated();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Notes with debounced save
  const [editNotes, setEditNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount — fixes memory leak
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    };
  }, []);

  // Tag management
  const [newTag, setNewTag] = useState('');

  // Sync editNotes when selected customer changes
  useEffect(() => {
    setEditNotes(selectedCustomer?.notes || '');
  }, [selectedCustomer?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selected customer's bookings (for detail panel history)
  const selectedBookings = useMemo(() => {
    if (!selectedCustomer) return [];
    const email = selectedCustomer.email.toLowerCase().trim();
    return bookings
      .filter((b) => b.email.toLowerCase().trim() === email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, selectedCustomer]);

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const columns = useMemo<Column<Customer>[]>(
    () => [
      {
        key: 'name',
        header: t('admin.customers.name'),
        render: (c) => (
          <div>
            <div className="customer-name-cell">
              {c.name}
              {c.completedBookings >= 2 && (
                <span className="customer-repeat-badge">{t('admin.customers.repeatCustomer')}</span>
              )}
            </div>
            <div className="customer-email-cell">{c.email}</div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('admin.customers.phone'),
        width: '130px',
        render: (c) => <span className="customer-cell-sm">{c.phone}</span>,
      },
      {
        key: 'region',
        header: t('admin.customers.region'),
        width: '110px',
        render: (c) => <span className="customer-cell-sm">{c.region}</span>,
      },
      {
        key: 'totalBookings',
        header: t('admin.customers.totalBookings'),
        sortable: true,
        width: '100px',
        render: (c) => <span className="text-bold">{c.totalBookings}</span>,
      },
      {
        key: 'totalRevenue',
        header: t('admin.customers.totalRevenue'),
        sortable: true,
        width: '110px',
        render: (c) => <span className="text-bold">{formatCurrency(c.totalRevenue)}</span>,
      },
      {
        key: 'lastBookingDate',
        header: t('admin.customers.sortLastBooking'),
        sortable: true,
        width: '130px',
        render: (c) => <span className="customer-cell-date">{formatDate(c.lastBookingDate)}</span>,
      },
      {
        key: 'tags',
        header: t('admin.customers.tags'),
        render: (c) =>
          c.tags.length > 0 ? (
            <div className="flex-row flex-wrap gap-2">
              {c.tags.map((tag) => (
                <Tag key={tag} label={tag} />
              ))}
            </div>
          ) : (
            <span className="customer-tags-empty">&mdash;</span>
          ),
      },
    ],
    [t]
  );

  // ---------------------------------------------------------------------------
  // Filter configuration
  // ---------------------------------------------------------------------------

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        key: 'search',
        label: t('admin.customers.search'),
        type: 'search' as const,
        placeholder: t('admin.customers.searchPlaceholder'),
      },
    ],
    [t]
  );

  // ---------------------------------------------------------------------------
  // Sort state (managed via DataTable onSort)
  // ---------------------------------------------------------------------------

  const [sortField, setSortField] = useState<string>('lastBookingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback(
    (field: string, dir: 'asc' | 'desc') => {
      setSortField(field);
      setSortDir(dir);
      setParams({ sort: field, dir });
    },
    [setParams]
  );

  // ---------------------------------------------------------------------------
  // Filter change handler
  // ---------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setFilterValues((prev) => ({ ...prev, [key]: value }));
      if (key === 'search') {
        setParams({ search: value });
      }
    },
    [setParams]
  );

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
    setParams({ search: '' });
  }, [setParams]);

  // ---------------------------------------------------------------------------
  // Notes save (debounced)
  // ---------------------------------------------------------------------------

  const handleNotesChange = useCallback(
    (email: string, value: string) => {
      setEditNotes(value);

      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
      notesTimeoutRef.current = setTimeout(async () => {
        setSavingNotes(true);
        const res = await adminApi.updateCustomerNotes(token, email, value);
        setSavingNotes(false);
        if (!res.success) {
          showToast(t('admin.toast.saveFailed'), 'error');
        } else {
          refetch();
        }
      }, 1000);
    },
    [token, showToast, t, refetch]
  );

  // ---------------------------------------------------------------------------
  // Tag management
  // ---------------------------------------------------------------------------

  const handleAddTag = useCallback(
    async (email: string, tag: string) => {
      const currentTags = selectedCustomer?.tags || [];
      if (currentTags.includes(tag)) return;
      const next = [...currentTags, tag];
      // Optimistic update
      setSelectedCustomer((prev) => (prev ? { ...prev, tags: next } : prev));
      const res = await adminApi.updateCustomerTags(token, email, next);
      if (!res.success) {
        showToast(t('admin.toast.saveFailed'), 'error');
        // Revert
        setSelectedCustomer((prev) => (prev ? { ...prev, tags: currentTags } : prev));
      } else {
        refetch();
      }
    },
    [token, selectedCustomer, showToast, t, refetch]
  );

  const handleRemoveTag = useCallback(
    async (email: string, tag: string) => {
      const currentTags = selectedCustomer?.tags || [];
      const next = currentTags.filter((tg) => tg !== tag);
      // Optimistic update
      setSelectedCustomer((prev) => (prev ? { ...prev, tags: next } : prev));
      const res = await adminApi.updateCustomerTags(token, email, next);
      if (!res.success) {
        showToast(t('admin.toast.saveFailed'), 'error');
        setSelectedCustomer((prev) => (prev ? { ...prev, tags: currentTags } : prev));
      } else {
        refetch();
      }
    },
    [token, selectedCustomer, showToast, t, refetch]
  );

  const handleToggleTag = useCallback(
    (email: string, tag: string) => {
      const currentTags = selectedCustomer?.tags || [];
      if (currentTags.includes(tag)) {
        handleRemoveTag(email, tag);
      } else {
        handleAddTag(email, tag);
      }
    },
    [selectedCustomer, handleAddTag, handleRemoveTag]
  );

  const handleAddCustomTag = useCallback(
    (email: string) => {
      const tag = newTag.trim();
      if (!tag) return;
      setNewTag('');
      handleAddTag(email, tag);
    },
    [newTag, handleAddTag]
  );

  // ---------------------------------------------------------------------------
  // Row click handler
  // ---------------------------------------------------------------------------

  const handleRowClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedCustomer(null);
    setNewTag('');
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="customers-page">
      {/* Header */}
      <div className="customers-page-header">
        <h2 className="customers-page-title">{t('admin.customers.title')}</h2>
        <span className="customers-total-badge">
          {total} {t('admin.customers.total')}
        </span>
      </div>

      {/* Search / Filters */}
      <FilterBar
        filters={filterConfig}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleFilterClear}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        rowKey={(c) => c.email}
        onRowClick={handleRowClick}
        activeRowKey={selectedCustomer?.email}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
        emptyTitle={t('admin.customers.noCustomers')}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Customer Detail Slide-over Panel */}
      <SlideOverPanel
        open={!!selectedCustomer}
        onClose={handleClosePanel}
        title={selectedCustomer?.name || ''}
      >
        {selectedCustomer && (
          <div className="customer-detail">
            {/* Contact info */}
            <div className="customer-detail-panel">
              <div className="customer-detail-header">{t('admin.customers.contactInfo')}</div>
              <div className="customer-detail-info">{selectedCustomer.email}</div>
              <div className="customer-detail-info">{selectedCustomer.phone}</div>
              <div className="customer-detail-info">{selectedCustomer.region}</div>
              <div className="customer-contact-actions">
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="customer-contact-btn customer-contact-btn--call"
                >
                  {t('admin.customers.call')}
                </a>
                <a
                  href={`sms:${selectedCustomer.phone}`}
                  className="customer-contact-btn customer-contact-btn--sms"
                >
                  {t('admin.customers.sms')}
                </a>
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  className="customer-contact-btn customer-contact-btn--email"
                >
                  {t('admin.customers.emailAction')}
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="customer-stats-grid">
              <div className="customer-stat-card">
                <div className="customer-stat-value">{selectedCustomer.totalBookings}</div>
                <div className="customer-stat-label">{t('admin.customers.totalBookings')}</div>
              </div>
              <div className="customer-stat-card customer-stat-card--success">
                <div className="customer-stat-value">{selectedCustomer.completedBookings}</div>
                <div className="customer-stat-label customer-stat-label--success">
                  {t('admin.customers.completed')}
                </div>
              </div>
              <div className="customer-stat-card customer-stat-card--danger">
                <div className="customer-stat-value">{selectedCustomer.cancelledBookings}</div>
                <div className="customer-stat-label customer-stat-label--danger">
                  {t('admin.customers.cancelled')}
                </div>
              </div>
            </div>

            <div className="customer-stats-grid-2col">
              <div className="customer-stat-card customer-stat-card--left">
                <div className="customer-stat-label">{t('admin.customers.totalRevenue')}</div>
                <div className="customer-stat-value customer-stat-value--sm">
                  {formatCurrency(selectedCustomer.totalRevenue)}
                </div>
              </div>
              <div className="customer-stat-card customer-stat-card--left">
                <div className="customer-stat-label">{t('admin.customers.firstBooking')}</div>
                <div className="customer-stat-value customer-stat-value--date">
                  {formatDate(selectedCustomer.firstBookingDate)}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="customer-section">
              <div className="customer-section-title">{t('admin.customers.tags')}</div>
              <div className="flex-row flex-wrap gap-3">
                {DEFAULT_TAGS.map((tag) => {
                  const active = selectedCustomer.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(selectedCustomer.email, tag)}
                      type="button"
                      className={`customer-tag-btn${active ? ' customer-tag-btn--active' : ''}`}
                    >
                      {tag}
                    </button>
                  );
                })}
                {/* Custom tags not in defaults */}
                {selectedCustomer.tags
                  .filter((tg) => !DEFAULT_TAGS.includes(tg))
                  .map((tag) => (
                    <Tag
                      key={tag}
                      label={tag}
                      onRemove={() => handleRemoveTag(selectedCustomer.email, tag)}
                    />
                  ))}
              </div>
              <div className="customer-tag-input-row">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomTag(selectedCustomer.email);
                  }}
                  placeholder={t('admin.customers.addTagPlaceholder')}
                  className="customer-tag-input"
                />
                <button
                  onClick={() => handleAddCustomTag(selectedCustomer.email)}
                  type="button"
                  className="customer-tag-add-btn"
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="customer-section">
              <div className="customer-section-title">
                {t('admin.customers.notes')}
                {savingNotes && (
                  <span className="customer-notes-status">{t('admin.customers.saving')}</span>
                )}
              </div>
              <textarea
                value={editNotes}
                onChange={(e) => handleNotesChange(selectedCustomer.email, e.target.value)}
                placeholder={t('admin.customers.notesPlaceholder')}
                rows={3}
                className="customer-notes-area"
              />
            </div>

            {/* Booking history */}
            <div>
              <div className="customer-section-title">
                {t('admin.customers.bookingHistory')} ({selectedBookings.length})
              </div>
              <div className="customer-booking-list">
                {selectedBookings.map((b) => {
                  const mod = statusModifier(b.status);
                  return (
                    <div
                      key={b.id}
                      className={`customer-booking-item${mod ? ` customer-booking-item--${mod}` : ''}`}
                    >
                      <div className="flex-between">
                        <div>
                          <div className="customer-booking-info-title">
                            {b.date} &middot; {b.time || t('admin.booking.notSpecified')}
                          </div>
                          <div className="customer-booking-info-sub">
                            {b.orderData?.packageName || b.formType} &middot; {b.guestCount}{' '}
                            {t('admin.booking.guests')}
                          </div>
                        </div>
                        <div className="customer-booking-right">
                          <span className={`status-badge${mod ? ` status-badge--${mod}` : ''}`}>
                            {b.status}
                          </span>
                          {b.orderData?.estimatedTotal ? (
                            <div className="customer-booking-amount">
                              {formatCurrency(b.orderData.estimatedTotal)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SlideOverPanel>
    </div>
  );
};

export default CustomerManagement;
