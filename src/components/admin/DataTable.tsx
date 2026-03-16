import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  hideable?: boolean;
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
  columnVisibilityKey?: string;
  expandable?: boolean;
  renderExpanded?: (item: T) => React.ReactNode;
  mobileCardRender?: (item: T) => React.ReactNode;
  mobileLoadingCount?: number;
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
  columnVisibilityKey,
  expandable = false,
  renderExpanded,
  mobileCardRender,
  mobileLoadingCount = 4,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();

  // Column visibility — always call both hooks to satisfy rules-of-hooks,
  // but only use the localStorage-backed one when a key is provided.
  const [lsHidden, setLsHidden] = useLocalStorage<string[]>(
    columnVisibilityKey || '__datatable_col_vis_unused__',
    []
  );
  const [localHidden, setLocalHidden] = useState<string[]>([]);
  const hiddenColumns = columnVisibilityKey ? lsHidden : localHidden;
  const setHiddenColumns = columnVisibilityKey ? setLsHidden : setLocalHidden;
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  const visibleColumns = columns.filter((col) => !hiddenColumns.includes(col.key));
  const hasHideableColumns = columns.some((col) => col.hideable);

  // Row expansion
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

  const handleSelectRow = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [onSelectionChange, selectedKeys]
  );

  // Keyboard navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
      if (data.length === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setFocusedRowIndex((prev) => Math.min(prev + 1, data.length - 1));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (focusedRowIndex >= 0 && focusedRowIndex < data.length && onRowClick) {
            onRowClick(data[focusedRowIndex]);
          }
          break;
        }
        case ' ': {
          e.preventDefault();
          if (
            focusedRowIndex >= 0 &&
            focusedRowIndex < data.length &&
            selectable &&
            onSelectionChange
          ) {
            handleSelectRow(rowKey(data[focusedRowIndex]));
          }
          break;
        }
      }
    },
    [data, focusedRowIndex, onRowClick, selectable, onSelectionChange, handleSelectRow, rowKey]
  );

  // Close column menu on outside click
  useEffect(() => {
    if (!columnMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [columnMenuOpen]);

  const toggleColumnVisibility = (colKey: string) => {
    setHiddenColumns((prev: string[]) => {
      if (prev.includes(colKey)) {
        return prev.filter((k) => k !== colKey);
      }
      return [...prev, colKey];
    });
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

  const totalColSpan =
    visibleColumns.length + (selectable ? 1 : 0) + (expandable && renderExpanded ? 1 : 0);

  if (!loading && data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle || t('admin.dataTable.noData')}
        description={emptyDescription}
      />
    );
  }

  // Mobile card view
  if (isMobile && mobileCardRender) {
    if (loading) {
      return (
        <div className="data-table-cards">
          {Array.from({ length: mobileLoadingCount }).map((_, i) => (
            <div key={`skeleton-card-${i}`} className="data-table-card data-table-card--skeleton">
              <div className="skeleton skeleton-text skeleton-text--lg" />
              <div className="skeleton skeleton-text skeleton-text--md" />
              <div className="skeleton skeleton-text skeleton-text--sm" />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="data-table-cards">
        {data.map((item) => {
          const key = rowKey(item);
          return (
            <div
              key={key}
              className={`data-table-card${onRowClick ? ' data-table-card--clickable' : ''}${activeRowKey === key ? ' data-table-card--active' : ''}`}
              onClick={() => onRowClick?.(item)}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {mobileCardRender(item)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      {hasHideableColumns && (
        <div className="data-table-toolbar">
          <div className="column-visibility-menu" ref={columnMenuRef}>
            <button
              className="column-visibility-toggle"
              onClick={() => setColumnMenuOpen((prev) => !prev)}
              aria-label={t('admin.dataTable.columns')}
              type="button"
            >
              <svg
                className="icon-gear"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.116l.094-.318z" />
              </svg>
            </button>
            {columnMenuOpen && (
              <div className="column-visibility-dropdown">
                {columns
                  .filter((col) => col.hideable)
                  .map((col) => (
                    <label key={col.key} className="column-visibility-option">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(col.key)}
                        onChange={() => toggleColumnVisibility(col.key)}
                      />
                      {col.header}
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      <table className="data-table" role="grid" aria-rowcount={data.length} aria-busy={loading}>
        <thead>
          <tr role="row">
            {expandable && renderExpanded && <th className="expand-cell" />}
            {selectable && (
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  aria-label={t('admin.dataTable.selectAll')}
                />
              </th>
            )}
            {visibleColumns.map((col) => (
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
        <tbody ref={tbodyRef} tabIndex={0} onKeyDown={handleKeyDown}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="skeleton-row" role="row">
                  {expandable && renderExpanded && <td className="expand-cell" role="gridcell" />}
                  {selectable && (
                    <td className="checkbox-cell" role="gridcell">
                      <div className="skeleton-pulse skeleton-checkbox" />
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td key={col.key} role="gridcell">
                      <div className="skeleton-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((item, index) => {
                const key = rowKey(item);
                const isExpanded = expandedRows.has(key);
                const isFocused = focusedRowIndex === index;
                return (
                  <React.Fragment key={key}>
                    <tr
                      className={
                        [
                          activeRowKey === key ? 'row-highlight' : '',
                          onRowClick ? 'cursor-pointer' : '',
                          isFocused ? 'row-focused' : '',
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                      onClick={() => onRowClick?.(item)}
                      role="row"
                      aria-rowindex={index + 1}
                    >
                      {expandable && renderExpanded && (
                        <td className="expand-cell" role="gridcell">
                          <button
                            className="expand-toggle"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(key);
                            }}
                            aria-label={
                              isExpanded
                                ? t('admin.dataTable.collapseRow')
                                : t('admin.dataTable.expandRow')
                            }
                            aria-expanded={isExpanded}
                          >
                            <span
                              className={`expand-arrow ${isExpanded ? 'expand-arrow-open' : ''}`}
                            >
                              ▶
                            </span>
                          </button>
                        </td>
                      )}
                      {selectable && (
                        <td className="checkbox-cell" role="gridcell">
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
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          style={col.width ? { width: col.width } : undefined}
                          role="gridcell"
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                    {expandable && renderExpanded && isExpanded && (
                      <tr className="expanded-row" role="row">
                        <td colSpan={totalColSpan} className="expanded-cell" role="gridcell">
                          {renderExpanded(item)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
