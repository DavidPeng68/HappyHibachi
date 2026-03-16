import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser, Booking } from '../../../types/admin';
import type { Column } from '../../../components/admin/DataTable';
import { StatusBadge, DataTable, Pagination } from '../../../components/admin';

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingDataTableProps {
  bookings: Booking[];
  loading: boolean;
  isSuperAdmin: boolean;
  orderManagers: Omit<AdminUser, 'passwordHash'>[];
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string, dir: 'asc' | 'desc') => void;
  onRowClick: (booking: Booking) => void;
  activeRowKey?: string;
  // Pagination
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingDataTable: React.FC<BookingDataTableProps> = ({
  bookings,
  loading,
  isSuperAdmin,
  orderManagers,
  selectedKeys,
  onSelectionChange,
  sortField,
  sortDir,
  onSort,
  onRowClick,
  activeRowKey,
  page,
  total,
  pageSize,
  onPageChange,
}) => {
  const { t } = useTranslation();

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

  const mobileCardRender = (b: Booking) => (
    <>
      <div className="card-row">
        <div>
          <div className="card-title">{b.name}</div>
          <div className="card-subtitle">{b.email}</div>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className="card-meta">
        <span className="card-meta-item">
          {formatDate(b.date)}
          {b.time ? ` ${b.time}` : ''}
        </span>
        <span className="card-meta-item">
          {b.guestCount} {t('admin.booking.guestCount')}
        </span>
        <span className="card-meta-item">{b.region}</span>
      </div>
    </>
  );

  return (
    <>
      <DataTable<Booking>
        columns={columns}
        data={bookings}
        loading={loading}
        rowKey={(b) => b.id}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        sortField={sortField}
        sortDir={sortDir}
        onSort={onSort}
        onRowClick={onRowClick}
        activeRowKey={activeRowKey}
        emptyIcon="&#128203;"
        emptyTitle={t('admin.booking.noBookings')}
        emptyDescription={t('admin.booking.noBookingsHint')}
        mobileCardRender={mobileCardRender}
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </>
  );
};

export default BookingDataTable;
