import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showJumpToPage?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  showJumpToPage,
}) => {
  const { t } = useTranslation();
  const [jumpValue, setJumpValue] = useState('');
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  // Build page number list with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
    setJumpValue('');
  };

  const handleJumpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  const showPageSizeSelector = pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange;

  return (
    <nav className="pagination" aria-label={t('admin.pagination.page')}>
      {showPageSizeSelector && (
        <select
          className="pagination-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange!(Number(e.target.value))}
          aria-label={t('admin.pagination.pageSize', { size: pageSize })}
        >
          {pageSizeOptions!.map((size) => (
            <option key={size} value={size}>
              {t('admin.pagination.pageSize', { size })}
            </option>
          ))}
        </select>
      )}
      <span className="pagination-info" aria-live="polite">
        {t('admin.pagination.showing', { start, end, total: totalItems })}
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          type="button"
          aria-label={t('admin.a11y.previousPage')}
        >
          {t('admin.pagination.prev')}
        </button>
        {getPageNumbers().map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
              type="button"
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          type="button"
          aria-label={t('admin.a11y.nextPage')}
        >
          {t('admin.pagination.next')}
        </button>
      </div>
      {showJumpToPage && (
        <div className="pagination-jump">
          <label>
            {t('admin.pagination.page')}
            <input
              type="number"
              className="pagination-jump-input"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={handleJumpKeyDown}
              aria-label={t('admin.pagination.page')}
            />
          </label>
          <button type="button" className="pagination-btn pagination-jump-btn" onClick={handleJump}>
            {t('admin.pagination.jumpTo')}
          </button>
        </div>
      )}
    </nav>
  );
};

export default Pagination;
