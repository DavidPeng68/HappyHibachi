import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from './AdminLayout';
import { StatusBadge, ConfirmDialog } from '../../components/admin';
import * as adminApi from '../../services/adminApi';
import type { AdminUser } from '../../types/admin';

type TeamUser = Omit<AdminUser, 'passwordHash'>;

interface RecentAssignment {
  bookingId: string;
  bookingName: string;
  managerName: string;
  timestamp: number;
}

const DispatchCenter: React.FC = () => {
  const { t } = useTranslation();
  const { bookings, token, showToast, refreshAll } = useAdmin();

  const [managers, setManagers] = useState<TeamUser[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([]);
  const [teamStatus, setTeamStatus] = useState<Record<string, { isOnline: boolean }>>({});

  const fetchTeamStatus = useCallback(async () => {
    try {
      const res = await adminApi.fetchTeamStatus(token);
      if (res.success) {
        const statusMap: Record<string, { isOnline: boolean }> = {};
        for (const user of res.users) {
          statusMap[user.id] = { isOnline: user.isOnline };
        }
        setTeamStatus(statusMap);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchManagers = useCallback(async () => {
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
    }
  }, [token]);

  useEffect(() => {
    fetchManagers();
    fetchTeamStatus();
  }, [fetchManagers, fetchTeamStatus]);

  const unassignedBookings = useMemo(
    () =>
      bookings.filter((b) => !b.assignedTo && (b.status === 'pending' || b.status === 'confirmed')),
    [bookings]
  );

  const getManagerLoad = useCallback(
    (managerId: string) =>
      bookings.filter(
        (b) => b.assignedTo === managerId && (b.status === 'pending' || b.status === 'confirmed')
      ).length,
    [bookings]
  );

  const toggleBooking = useCallback((id: string) => {
    setSelectedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedBookings.size === unassignedBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(unassignedBookings.map((b) => b.id)));
    }
  }, [selectedBookings.size, unassignedBookings]);

  const handleBatchAssign = async () => {
    if (selectedBookings.size === 0 || !selectedManager) return;
    setAssigning(true);
    const managerUser = managers.find((m) => m.id === selectedManager);
    const results = await Promise.allSettled(
      Array.from(selectedBookings).map((id) =>
        adminApi.updateBooking(token, { id, assignedTo: selectedManager })
      )
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    showToast(t('admin.dispatch.assigned', { count: succeeded }), 'success');

    // Track recent assignments
    const newAssignments: RecentAssignment[] = Array.from(selectedBookings).map((id) => {
      const booking = bookings.find((b) => b.id === id);
      return {
        bookingId: id,
        bookingName: booking?.name || id,
        managerName: managerUser?.displayName || selectedManager,
        timestamp: Date.now(),
      };
    });
    setRecentAssignments((prev) => [...newAssignments, ...prev].slice(0, 10));

    setSelectedBookings(new Set());
    setSelectedManager(null);
    setConfirmOpen(false);
    refreshAll();
    setAssigning(false);
  };

  const handleAssignClick = () => {
    if (selectedBookings.size === 0) {
      showToast(t('admin.dispatch.selectBookingsFirst'), 'info');
      return;
    }
    if (!selectedManager) {
      showToast(t('admin.dispatch.selectManager'), 'info');
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="dispatch-center">
      <h2>{t('admin.dispatch.title')}</h2>

      <div className="dispatch-layout">
        {/* Left Panel: Unassigned Queue */}
        <div className="dispatch-queue">
          <div className="dispatch-section-title">
            {t('admin.dispatch.unassignedQueue')} ({unassignedBookings.length})
          </div>

          {unassignedBookings.length === 0 ? (
            <div className="dispatch-empty">{t('admin.dispatch.noUnassigned')}</div>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedBookings.size === unassignedBookings.length &&
                      unassignedBookings.length > 0
                    }
                    onChange={toggleSelectAll}
                    style={{ marginRight: 6 }}
                  />
                  {t('admin.booking.selectAll')}
                </label>
              </div>
              {unassignedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`dispatch-booking-item${selectedBookings.has(booking.id) ? ' selected' : ''}`}
                  onClick={() => toggleBooking(booking.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedBookings.has(booking.id)}
                    onChange={() => toggleBooking(booking.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="dispatch-booking-info">
                    <div className="dispatch-booking-name">{booking.name}</div>
                    <div className="dispatch-booking-details">
                      {booking.date} &middot; {booking.guestCount} {t('admin.booking.guests')}{' '}
                      &middot; {booking.region}
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </>
          )}

          {/* Assign Button */}
          <div className="dispatch-actions">
            <button
              className="admin-btn admin-btn-primary"
              disabled={selectedBookings.size === 0 || !selectedManager || assigning}
              onClick={handleAssignClick}
            >
              {assigning
                ? '...'
                : t('admin.dispatch.assignSelected', { count: selectedBookings.size })}
            </button>
          </div>
        </div>

        {/* Right Panel: Managers */}
        <div className="dispatch-managers">
          <div className="dispatch-section-title">{t('admin.dispatch.selectManager')}</div>
          {managers.map((mgr) => (
            <div
              key={mgr.id}
              className={`dispatch-manager-card${selectedManager === mgr.id ? ' selected' : ''}`}
              onClick={() => setSelectedManager(mgr.id)}
            >
              <div className="dispatch-manager-name">
                <span
                  className={`online-dot ${teamStatus[mgr.id]?.isOnline ? 'online' : 'offline'}`}
                />
                {mgr.displayName}
              </div>
              <div className="dispatch-manager-load">
                {t('admin.team.currentLoad')}: {getManagerLoad(mgr.id)}
              </div>
            </div>
          ))}

          {/* Recent Assignments */}
          {recentAssignments.length > 0 && (
            <div className="dispatch-recent">
              <div className="dispatch-section-title">{t('admin.dispatch.recentAssignments')}</div>
              {recentAssignments.map((ra, idx) => (
                <div key={`${ra.bookingId}-${idx}`} className="dispatch-recent-item">
                  <span>{ra.bookingName}</span>
                  <span>&rarr;</span>
                  <span>{ra.managerName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('admin.dispatch.assignSelected', { count: selectedBookings.size })}
        message={t('admin.dispatch.assigned', { count: selectedBookings.size })}
        onConfirm={handleBatchAssign}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default DispatchCenter;
