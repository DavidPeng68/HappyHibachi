import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../ui/Icon/Icon';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'dateRange' | 'search';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, values, onChange, onClear }) => {
  const { t } = useTranslation();

  const activeCount = Object.values(values).filter((v) => v !== '').length;

  return (
    <div className="filter-bar">
      {filters.map((filter) => {
        switch (filter.type) {
          case 'search':
            return (
              <div key={filter.key} className="filter-field">
                <div className="filter-search-wrapper">
                  <span className="filter-search-icon">
                    <Icon name="search" size={16} />
                  </span>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder={filter.placeholder || t('admin.filterBar.search')}
                    value={values[filter.key] || ''}
                    onChange={(e) => onChange(filter.key, e.target.value)}
                  />
                </div>
              </div>
            );

          case 'select':
            return (
              <div key={filter.key} className="filter-field">
                <select
                  className="filter-select"
                  value={values[filter.key] || ''}
                  onChange={(e) => onChange(filter.key, e.target.value)}
                >
                  <option value="">{filter.label}</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );

          case 'dateRange':
            return (
              <div key={filter.key} className="filter-field filter-date-range">
                <input
                  type="date"
                  className="filter-input filter-date"
                  value={values[`${filter.key}From`] || ''}
                  onChange={(e) => onChange(`${filter.key}From`, e.target.value)}
                />
                <span className="filter-date-separator">–</span>
                <input
                  type="date"
                  className="filter-input filter-date"
                  value={values[`${filter.key}To`] || ''}
                  onChange={(e) => onChange(`${filter.key}To`, e.target.value)}
                />
              </div>
            );

          default:
            return null;
        }
      })}

      {activeCount > 0 && (
        <button type="button" className="filter-clear-btn" onClick={onClear}>
          {t('admin.filterBar.clearAll')}
          <span className="filter-clear-badge">{activeCount}</span>
        </button>
      )}
    </div>
  );
};

export default FilterBar;
