import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import type { AuditLogEntry } from '../../types/admin';
import * as adminApi from '../../services/adminApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EntityFilter = 'all' | 'booking' | 'coupon' | 'review' | 'settings';

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function actionModifier(action: string): string {
  switch (action) {
    case 'created':
      return 'created';
    case 'updated':
      return 'updated';
    case 'deleted':
      return 'deleted';
    default:
      return 'default';
  }
}

function entityIcon(entity: string): string {
  switch (entity) {
    case 'booking':
      return '\u{1F4CB}';
    case 'coupon':
      return '\u{1F39F}\uFE0F';
    case 'review':
      return '\u2B50';
    case 'settings':
      return '\u2699\uFE0F';
    default:
      return '\u{1F4DD}';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ActivityLog: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast } = useAdmin();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');

  // Fetch audit log
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .fetchAuditLog(token)
      .then((res) => {
        if (cancelled) return;
        setLoading(false);
        if (res.success) {
          setEntries(res.entries);
        } else {
          showToast(t('admin.toast.fetchFailed'), 'error');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          showToast(t('admin.toast.fetchFailed'), 'error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, showToast, t]);

  // Filter
  const filtered = useMemo(() => {
    if (entityFilter === 'all') return entries;
    return entries.filter((e) => e.entity === entityFilter);
  }, [entries, entityFilter]);

  const handleFilterChange = useCallback((filter: EntityFilter) => {
    setEntityFilter(filter);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const filters: { key: EntityFilter; label: string }[] = [
    { key: 'all', label: t('admin.activity.filterAll') },
    { key: 'booking', label: t('admin.activity.filterBookings') },
    { key: 'coupon', label: t('admin.activity.filterCoupons') },
    { key: 'review', label: t('admin.activity.filterReviews') },
    { key: 'settings', label: t('admin.activity.filterSettings') },
  ];

  if (loading) {
    return (
      <div className="activity-loading activity-loading--full">{t('admin.activity.loading')}</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <h2>{t('admin.activity.title')}</h2>
        <span className="count-badge">
          {filtered.length} {t('admin.activity.entries')}
        </span>
      </div>

      {/* Filters */}
      <div className="activity-filters">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`activity-filter-btn ${entityFilter === key ? 'activity-filter-btn--active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="activity-empty">{t('admin.activity.noEntries')}</div>
      ) : (
        <div className="activity-timeline">
          {/* Vertical line */}
          <div className="activity-timeline-line" />

          {filtered.map((entry) => {
            const mod = actionModifier(entry.action);
            return (
              <div key={entry.id} className="activity-entry">
                {/* Dot on timeline */}
                <div className={`activity-dot activity-dot--${mod}`} />

                <div className="activity-entry-header">
                  <div className="activity-entry-body">
                    <div className="activity-entry-meta">
                      <span className="activity-entry-icon">{entityIcon(entry.entity)}</span>
                      <span className={`activity-action-badge activity-action-badge--${mod}`}>
                        {entry.action}
                      </span>
                      <span className="activity-entity">{entry.entity}</span>
                    </div>
                    <div className="activity-details">{entry.details}</div>
                  </div>
                  <div className="activity-timestamp">{relativeTime(entry.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
