import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAdmin } from './AdminLayout';
import * as adminApi from '../../services/adminApi';
import type { AdminUser } from '../../types/admin';
import { isThisWeek } from '../../utils/adminHelpers';
import Sparkline from '../../components/admin/Sparkline';
import AnimatedStatValue from '../../components/admin/AnimatedStatValue';

type TeamUser = Omit<AdminUser, 'passwordHash'>;

function formatRelativeTime(dateStr: string, t: TFunction): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return t('admin.time.justNow');

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return t('admin.time.secondsAgo', { count: seconds });

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('admin.time.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('admin.time.hoursAgo', { count: hours });

  const days = Math.floor(hours / 24);
  return t('admin.time.daysAgo', { count: days });
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
      const today = new Date();
      const sparklineData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const dateStr = d.toISOString().slice(0, 10);
        return bookings.filter((b) => b.assignedTo === mgr.id && b.date.slice(0, 10) === dateStr)
          .length;
      });
      return {
        ...mgr,
        currentLoad: assigned.length,
        completedWeek: completedThisWeek.length,
        lastSeenAt: status?.lastSeenAt || null,
        isOnline: status?.isOnline || false,
        sparklineData,
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
          <AnimatedStatValue value={managers.length} className="team-summary-value" />
          <div className="team-summary-label">{t('admin.team.totalManagers')}</div>
        </div>
        <div className="team-summary-card">
          <AnimatedStatValue value={unassignedBookings.length} className="team-summary-value" />
          <div className="team-summary-label">{t('admin.team.unassignedBookings')}</div>
        </div>
        <div className="team-summary-card">
          <AnimatedStatValue value={pendingBookings.length} className="team-summary-value" />
          <div className="team-summary-label">{t('admin.team.pendingBookings')}</div>
        </div>
      </div>

      {/* Workload Distribution */}
      {managerStats.length > 0 &&
        (() => {
          const maxLoad = Math.max(...managerStats.map((m) => m.currentLoad), 1);
          return (
            <div className="team-workload-chart">
              <h3>{t('admin.team.workloadDistribution')}</h3>
              <div className="team-workload-bars">
                {managerStats.map((mgr) => (
                  <div key={mgr.id} className="team-workload-row">
                    <span className="team-workload-name">{mgr.displayName}</span>
                    <div className="team-workload-bar">
                      <div
                        className={`team-workload-fill ${mgr.currentLoad > 6 ? 'high' : mgr.currentLoad > 3 ? 'medium' : 'low'}`}
                        style={{ width: `${Math.min((mgr.currentLoad / maxLoad) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="team-workload-count">{mgr.currentLoad}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
                  <span className="team-online-text">
                    <span className="team-online-dot" />
                    {t('admin.team.online')}
                  </span>
                ) : mgr.lastSeenAt ? (
                  <span className="team-last-seen">
                    {t('admin.team.lastSeen', { time: formatRelativeTime(mgr.lastSeenAt, t) })}
                  </span>
                ) : (
                  <span className="team-offline-text">{t('admin.team.neverSeen')}</span>
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
              <div className="team-member-sparkline">
                <span className="team-member-sparkline-label">7d</span>
                <Sparkline
                  data={mgr.sparklineData}
                  width={120}
                  height={28}
                  color="var(--admin-primary)"
                />
              </div>
              <div className="team-member-actions">
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={() => setActiveMenu('bookings')}
                >
                  {t('admin.team.viewBookings')}
                </button>
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={() => setActiveMenu('dispatch')}
                >
                  {t('admin.team.reassign')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamDashboard;
