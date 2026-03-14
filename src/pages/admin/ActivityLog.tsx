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

function actionColor(action: string): { color: string; bg: string } {
  switch (action) {
    case 'created':
      return { color: '#16a34a', bg: '#dcfce7' };
    case 'updated':
      return { color: '#2563eb', bg: '#dbeafe' };
    case 'deleted':
      return { color: '#dc2626', bg: '#fef2f2' };
    default:
      return { color: '#6b7280', bg: '#f3f4f6' };
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
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        {t('admin.activity.loading')}
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
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
          {t('admin.activity.title')}
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
          {filtered.length} {t('admin.activity.entries')}
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: entityFilter === key ? '#3b82f6' : '#e2e8f0',
              background: entityFilter === key ? '#eff6ff' : '#fff',
              color: entityFilter === key ? '#2563eb' : '#64748b',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: entityFilter === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          {t('admin.activity.noEntries')}
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              top: '0',
              bottom: '0',
              width: '2px',
              background: '#e2e8f0',
            }}
          />

          {filtered.map((entry) => {
            const { color, bg } = actionColor(entry.action);
            return (
              <div
                key={entry.id}
                style={{
                  position: 'relative',
                  marginBottom: '12px',
                  padding: '12px 16px',
                  background: '#fff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {/* Dot on timeline */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-23px',
                    top: '16px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: color,
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 2px ' + color,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{entityIcon(entry.entity)}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 8px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color,
                          background: bg,
                          textTransform: 'capitalize',
                        }}
                      >
                        {entry.action}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#94a3b8',
                          textTransform: 'capitalize',
                        }}
                      >
                        {entry.entity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>{entry.details}</div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                  >
                    {relativeTime(entry.createdAt)}
                  </div>
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
