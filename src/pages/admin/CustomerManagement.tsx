import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import type { Customer, Booking } from '../../types/admin';
import * as adminApi from '../../services/adminApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CustomerSortField = 'totalBookings' | 'totalRevenue' | 'lastBookingDate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function aggregateCustomers(bookings: Booking[]): Customer[] {
  const map = new Map<string, { bookings: Booking[]; regions: Map<string, number> }>();

  for (const b of bookings) {
    const key = b.email.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { bookings: [], regions: new Map() });
    }
    const entry = map.get(key)!;
    entry.bookings.push(b);
    entry.regions.set(b.region, (entry.regions.get(b.region) || 0) + 1);
  }

  const customers: Customer[] = [];

  for (const [, { bookings: cBookings, regions }] of map) {
    cBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = cBookings[0];
    const oldest = cBookings[cBookings.length - 1];

    let topRegion = '';
    let topCount = 0;
    for (const [region, count] of regions) {
      if (count > topCount) {
        topRegion = region;
        topCount = count;
      }
    }

    const completed = cBookings.filter((b) => b.status === 'completed');
    const cancelled = cBookings.filter((b) => b.status === 'cancelled');
    const totalRevenue = completed.reduce((sum, b) => sum + (b.orderData?.estimatedTotal || 0), 0);

    customers.push({
      email: latest.email,
      name: latest.name,
      phone: latest.phone,
      region: topRegion,
      totalBookings: cBookings.length,
      completedBookings: completed.length,
      cancelledBookings: cancelled.length,
      totalRevenue,
      firstBookingDate: oldest.createdAt,
      lastBookingDate: latest.createdAt,
      notes: '',
      tags: [],
    });
  }

  return customers;
}

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
// Component
// ---------------------------------------------------------------------------

const CustomerManagement: React.FC = () => {
  const { t } = useTranslation();
  const { token, bookings, showToast } = useAdmin();

  // State
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<CustomerSortField>('lastBookingDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>({});
  const [customerTags, setCustomerTags] = useState<Record<string, string[]>>({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [newTag, setNewTag] = useState('');
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch customer notes & tags from API on mount
  useEffect(() => {
    let cancelled = false;
    adminApi.fetchCustomers(token).then((res) => {
      if (cancelled || !res.success) return;
      const notes: Record<string, string> = {};
      const tags: Record<string, string[]> = {};
      for (const c of res.customers) {
        const key = c.email.toLowerCase().trim();
        if (c.notes) notes[key] = c.notes;
        if (c.tags?.length) tags[key] = c.tags;
      }
      setCustomerNotes(notes);
      setCustomerTags(tags);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Aggregate customers from bookings
  const customers = useMemo(() => {
    const base = aggregateCustomers(bookings);
    // Merge notes & tags
    return base.map((c) => {
      const key = c.email.toLowerCase().trim();
      return {
        ...c,
        notes: customerNotes[key] || '',
        tags: customerTags[key] || [],
      };
    });
  }, [bookings, customerNotes, customerTags]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let diff = 0;
      if (sortField === 'totalBookings') diff = a.totalBookings - b.totalBookings;
      else if (sortField === 'totalRevenue') diff = a.totalRevenue - b.totalRevenue;
      else diff = new Date(a.lastBookingDate).getTime() - new Date(b.lastBookingDate).getTime();
      return sortAsc ? diff : -diff;
    });
    return arr;
  }, [filtered, sortField, sortAsc]);

  // Selected customer
  const selectedCustomer = useMemo(
    () => (selectedEmail ? customers.find((c) => c.email === selectedEmail) : null),
    [customers, selectedEmail]
  );

  // Customer's bookings
  const selectedBookings = useMemo(() => {
    if (!selectedEmail) return [];
    return bookings
      .filter((b) => b.email.toLowerCase().trim() === selectedEmail.toLowerCase().trim())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, selectedEmail]);

  // Sort toggle
  const handleSort = useCallback(
    (field: CustomerSortField) => {
      if (sortField === field) {
        setSortAsc((prev) => !prev);
      } else {
        setSortField(field);
        setSortAsc(false);
      }
    },
    [sortField]
  );

  // Notes save (debounced)
  const handleNotesChange = useCallback(
    (email: string, value: string) => {
      const key = email.toLowerCase().trim();
      setCustomerNotes((prev) => ({ ...prev, [key]: value }));

      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
      notesTimeoutRef.current = setTimeout(async () => {
        setSavingNotes(true);
        const res = await adminApi.updateCustomerNotes(token, email, value);
        setSavingNotes(false);
        if (!res.success) {
          showToast(t('admin.toast.saveFailed'), 'error');
        }
      }, 1000);
    },
    [token, showToast, t]
  );

  // Tags
  const handleToggleTag = useCallback(
    async (email: string, tag: string) => {
      const key = email.toLowerCase().trim();
      const current = customerTags[key] || [];
      const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
      setCustomerTags((prev) => ({ ...prev, [key]: next }));

      const res = await adminApi.updateCustomerTags(token, email, next);
      if (!res.success) {
        showToast(t('admin.toast.saveFailed'), 'error');
      }
    },
    [token, customerTags, showToast, t]
  );

  const handleAddCustomTag = useCallback(
    (email: string) => {
      const tag = newTag.trim();
      if (!tag) return;
      setNewTag('');
      handleToggleTag(email, tag);
    },
    [newTag, handleToggleTag]
  );

  // Status badge colors
  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#16a34a';
      case 'confirmed':
        return '#2563eb';
      case 'pending':
        return '#d97706';
      case 'cancelled':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ padding: '0' }}>
      {/* Header & Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          {t('admin.customers.title')}
        </h2>
        <span
          style={{
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '2px 10px',
            fontSize: '0.85rem',
            color: '#64748b',
          }}
        >
          {customers.length} {t('admin.customers.total')}
        </span>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.customers.searchPlaceholder')}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      {/* Sort buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(
          [
            ['lastBookingDate', t('admin.customers.sortLastBooking')],
            ['totalBookings', t('admin.customers.sortTotalBookings')],
            ['totalRevenue', t('admin.customers.sortRevenue')],
          ] as [CustomerSortField, string][]
        ).map(([field, label]) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: sortField === field ? '#3b82f6' : '#e2e8f0',
              background: sortField === field ? '#eff6ff' : '#fff',
              color: sortField === field ? '#2563eb' : '#64748b',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: sortField === field ? 600 : 400,
            }}
          >
            {label} {sortField === field ? (sortAsc ? '\u2191' : '\u2193') : ''}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Customer list */}
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          {sorted.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
              }}
            >
              {t('admin.customers.noCustomers')}
            </div>
          )}
          {sorted.map((customer) => (
            <div
              key={customer.email}
              onClick={() => setSelectedEmail(customer.email)}
              style={{
                padding: '14px 16px',
                marginBottom: '8px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: selectedEmail === customer.email ? '#3b82f6' : '#e2e8f0',
                background: selectedEmail === customer.email ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {customer.name}
                    {customer.completedBookings >= 2 && (
                      <span
                        style={{
                          marginLeft: '8px',
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '1px 8px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        {t('admin.customers.repeatCustomer')}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#64748b',
                      marginTop: '2px',
                    }}
                  >
                    {customer.email}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      marginTop: '2px',
                    }}
                  >
                    {customer.phone} &middot; {customer.region}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {formatCurrency(customer.totalRevenue)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#64748b',
                      marginTop: '2px',
                    }}
                  >
                    {customer.totalBookings} {t('admin.customers.bookings')}
                  </div>
                </div>
              </div>
              {/* Tags */}
              {customer.tags.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        padding: '1px 8px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selectedCustomer && (
          <div
            style={{
              flex: '1 1 400px',
              minWidth: 0,
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              alignSelf: 'flex-start',
              position: 'sticky',
              top: '20px',
            }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedCustomer.name}</h3>
              <button
                onClick={() => setSelectedEmail(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                &times;
              </button>
            </div>

            {/* Contact info */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                {t('admin.customers.contactInfo')}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                {selectedCustomer.email}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                {selectedCustomer.phone}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                {selectedCustomer.region}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  style={{
                    padding: '4px 12px',
                    background: '#dbeafe',
                    color: '#2563eb',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                  }}
                >
                  {t('admin.customers.call')}
                </a>
                <a
                  href={`sms:${selectedCustomer.phone}`}
                  style={{
                    padding: '4px 12px',
                    background: '#dcfce7',
                    color: '#16a34a',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                  }}
                >
                  {t('admin.customers.sms')}
                </a>
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  style={{
                    padding: '4px 12px',
                    background: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                  }}
                >
                  {t('admin.customers.emailAction')}
                </a>
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {selectedCustomer.totalBookings}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t('admin.customers.totalBookings')}
                </div>
              </div>
              <div
                style={{
                  background: '#dcfce7',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {selectedCustomer.completedBookings}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                  {t('admin.customers.completed')}
                </div>
              </div>
              <div
                style={{
                  background: '#fef2f2',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {selectedCustomer.cancelledBookings}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                  {t('admin.customers.cancelled')}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t('admin.customers.totalRevenue')}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {formatCurrency(selectedCustomer.totalRevenue)}
                </div>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t('admin.customers.firstBooking')}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                  {formatDate(selectedCustomer.firstBookingDate)}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                {t('admin.customers.tags')}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {DEFAULT_TAGS.map((tag) => {
                  const active = selectedCustomer.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(selectedCustomer.email, tag)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: active ? '#4338ca' : '#e2e8f0',
                        background: active ? '#e0e7ff' : '#fff',
                        color: active ? '#4338ca' : '#64748b',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
                {/* Custom tags not in defaults */}
                {selectedCustomer.tags
                  .filter((t) => !DEFAULT_TAGS.includes(t))
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(selectedCustomer.email, tag)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '14px',
                        border: '1px solid #4338ca',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {tag} &times;
                    </button>
                  ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomTag(selectedCustomer.email);
                  }}
                  placeholder={t('admin.customers.addTagPlaceholder')}
                  style={{
                    flex: 1,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                  }}
                />
                <button
                  onClick={() => handleAddCustomTag(selectedCustomer.email)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                {t('admin.customers.notes')}
                {savingNotes && (
                  <span
                    style={{
                      fontWeight: 400,
                      color: '#94a3b8',
                      marginLeft: '8px',
                      fontSize: '0.8rem',
                    }}
                  >
                    {t('admin.customers.saving')}
                  </span>
                )}
              </div>
              <textarea
                value={selectedCustomer.notes}
                onChange={(e) => handleNotesChange(selectedCustomer.email, e.target.value)}
                placeholder={t('admin.customers.notesPlaceholder')}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Booking history */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                {t('admin.customers.bookingHistory')} ({selectedBookings.length})
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {selectedBookings.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '10px 12px',
                      marginBottom: '6px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      borderLeft: `3px solid ${statusColor(b.status)}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {b.date} &middot; {b.time || t('admin.booking.notSpecified')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {b.orderData?.packageName || b.formType} &middot; {b.guestCount}{' '}
                          {t('admin.booking.guests')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: statusColor(b.status),
                            background:
                              b.status === 'completed'
                                ? '#dcfce7'
                                : b.status === 'confirmed'
                                  ? '#dbeafe'
                                  : b.status === 'pending'
                                    ? '#fef3c7'
                                    : '#fef2f2',
                          }}
                        >
                          {b.status}
                        </span>
                        {b.orderData?.estimatedTotal ? (
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>
                            {formatCurrency(b.orderData.estimatedTotal)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;
