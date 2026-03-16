import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import * as adminApi from '../../services/adminApi';
import type { AdminUser } from '../../types/admin';
import { isThisWeek } from '../../utils/adminHelpers';

type TeamUser = Omit<AdminUser, 'passwordHash'>;

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TeamDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { bookings, token, setActiveMenu } = useAdmin();
  const [managers, setManagers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamStatus, setTeamStatus] = useState<
    Record<string, { lastSeenAt: string | null; isOnline: boolean }>
  >({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTeamStatus = useCallback(async () => {
    try {
      const res = await adminApi.fetchTeamStatus(token);
      if (res.success && res.users) {
        const statusMap: Record<string, { lastSeenAt: string | null; isOnline: boolean }> = {};
        for (const u of res.users) {
          statusMap[u.id] = { lastSeenAt: u.lastSeenAt, isOnline: u.isOnline };
        }
        setTeamStatus(statusMap);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.fetchUsers(token);
      if (res.success) {
        setManagers(
          res.users.filter(
            (u: TeamUser) => u.role === 'order_manager' && u.enabled && u.status === 'approved'
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchManagers();
    loadTeamStatus();
  }, [fetchManagers, loadTeamStatus]);

  // Poll team status every 60 seconds
  useEffect(() => {
    intervalRef.current = setInterval(loadTeamStatus, 60_000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadTeamStatus]);

  const unassignedBookings = useMemo(
    () =>
      bookings.filter((b) => !b.assignedTo && (b.status === 'pending' || b.status === 'confirmed')),
    [bookings]
  );

  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);

  const managerStats = useMemo(() => {
    return managers.map((mgr) => {
      const assigned = bookings.filter(
        (b) => b.assignedTo === mgr.id && (b.status === 'pending' || b.status === 'confirmed')
      );
      const completedThisWeek = bookings.filter(
        (b) => b.assignedTo === mgr.id && b.status === 'completed' && isThisWeek(b.date)
      );
      const status = teamStatus[mgr.id];
      return {
        ...mgr,
        currentLoad: assigned.length,
        completedWeek: completedThisWeek.length,
        lastSeenAt: status?.lastSeenAt || null,
        isOnline: status?.isOnline || false,
      };
    });
  }, [managers, bookings, teamStatus]);

  if (loading) {
    return <div className="loading-screen">{t('admin.team.title')}...</div>;
  }

  return (
    <div className="team-dashboard">
      <h2>{t('admin.team.title')}</h2>

      {/* Summary Cards */}
      <div className="team-summary">
        <div className="team-summary-card">
          <div className="team-summary-value">{managers.length}</div>
          <div className="team-summary-label">{t('admin.team.totalManagers')}</div>
        </div>
        <div className="team-summary-card">
          <div className="team-summary-value">{unassignedBookings.length}</div>
          <div className="team-summary-label">{t('admin.team.unassignedBookings')}</div>
        </div>
        <div className="team-summary-card">
          <div className="team-summary-value">{pendingBookings.length}</div>
          <div className="team-summary-label">{t('admin.team.pendingBookings')}</div>
        </div>
      </div>

      {/* Unassigned Alert */}
      {unassignedBookings.length > 0 && (
        <div className="team-unassigned-alert">
          <span className="team-unassigned-alert-text">
            {t('admin.team.unassignedAlert', { count: unassignedBookings.length })}
          </span>
          <button className="team-unassigned-alert-link" onClick={() => setActiveMenu('dispatch')}>
            {t('admin.team.goToDispatch')}
          </button>
        </div>
      )}

      {/* Team Members Grid */}
      {managerStats.length === 0 ? (
        <p>{t('admin.team.noManagers')}</p>
      ) : (
        <div className="team-grid">
          {managerStats.map((mgr) => (
            <div key={mgr.id} className="team-member-card">
              <div className="team-member-header">
                <span className="team-member-name">{mgr.displayName}</span>
                {mgr.isOnline ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#10b981',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                    {t('admin.team.online')}
                  </span>
                ) : mgr.lastSeenAt ? (
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    {t('admin.team.lastSeen', { time: formatRelativeTime(mgr.lastSeenAt) })}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    {t('admin.team.neverSeen')}
                  </span>
                )}
              </div>
              <div className="team-member-stats">
                <div className="team-member-stat">
                  <div className="team-member-stat-value">{mgr.currentLoad}</div>
                  <div className="team-member-stat-label">{t('admin.team.currentLoad')}</div>
                </div>
                <div className="team-member-stat">
                  <div className="team-member-stat-value">{mgr.completedWeek}</div>
                  <div className="team-member-stat-label">{t('admin.team.completedWeek')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamDashboard;
