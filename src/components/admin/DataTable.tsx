import React from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (item: T) => string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (field: string, dir: 'asc' | 'desc') => void;
  onRowClick?: (item: T) => void;
  activeRowKey?: string;
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyIcon = '📋',
  emptyTitle,
  emptyDescription,
  rowKey,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  sortField,
  sortDir = 'asc',
  onSort,
  onRowClick,
  activeRowKey,
}: DataTableProps<T>) {
  const { t } = useTranslation();

  const allSelected = data.length > 0 && data.every((item) => selectedKeys.has(rowKey(item)));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      const allKeys = new Set(data.map((item) => rowKey(item)));
      onSelectionChange(allKeys);
    }
  };

  const handleSelectRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const nextDir = sortField === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextDir);
  };

  const renderSortIndicator = (col: Column<T>) => {
    if (!col.sortable) return null;
    if (sortField !== col.key) {
      return <span className="sort-indicator sort-indicator-inactive">↕</span>;
    }
    return <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (!loading && data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle || t('admin.dataTable.noData')}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && (
              <th className="checkbox-cell" style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  aria-label={t('admin.dataTable.selectAll')}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : undefined}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => handleSort(col)}
              >
                {col.header}
                {renderSortIndicator(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="skeleton-row">
                  {selectable && (
                    <td className="checkbox-cell">
                      <div className="skeleton-pulse" style={{ width: 16, height: 16 }} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="skeleton-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((item) => {
                const key = rowKey(item);
                return (
                  <tr
                    key={key}
                    className={activeRowKey === key ? 'row-highlight' : undefined}
                    onClick={() => onRowClick?.(item)}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {selectable && (
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(key)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(key);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} style={col.width ? { width: col.width } : undefined}>
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
