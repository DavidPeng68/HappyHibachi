import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterBar } from '../../../components/admin';
import type { FilterConfig } from '../../../components/admin/FilterBar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGIONS = ['California', 'Texas', 'Florida'] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingFilterBarProps {
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onExportAll: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingFilterBar: React.FC<BookingFilterBarProps> = ({
  filterValues,
  onFilterChange,
  onClearFilters,
  onExportAll,
}) => {
  const { t } = useTranslation();

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

  return (
    <div className="bm-toolbar">
      <FilterBar
        filters={filterConfig}
        values={filterValues}
        onChange={onFilterChange}
        onClear={onClearFilters}
      />
      <button className="admin-btn admin-btn-primary" onClick={onExportAll} type="button">
        {t('admin.booking.export')}
      </button>
    </div>
  );
};

export default BookingFilterBar;
