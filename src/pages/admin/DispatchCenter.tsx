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
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

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

  const getManagerBookings = useCallback(
    (managerId: string) =>
      bookings.filter(
        (b) => b.assignedTo === managerId && (b.status === 'pending' || b.status === 'confirmed')
      ),
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

  // Drag and drop handlers
  const handleDragStart = useCallback((bookingId: string) => {
    setDraggedBookingId(bookingId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBookingId(null);
    setDragOverTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTarget(targetId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, managerId: string | null) => {
      e.preventDefault();
      setDragOverTarget(null);
      if (!draggedBookingId) return;

      const bookingId = draggedBookingId;
      setDraggedBookingId(null);

      // Find current assignment
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const previousAssignment = booking.assignedTo || null;

      // Skip if dropping on the same target
      if (previousAssignment === managerId) return;

      try {
        await adminApi.updateBooking(token, {
          id: bookingId,
          assignedTo: managerId || '',
        });

        // Track recent assignment if assigning to a manager
        if (managerId) {
          const managerUser = managers.find((m) => m.id === managerId);
          setRecentAssignments((prev) =>
            [
              {
                bookingId,
                bookingName: booking.name || bookingId,
                managerName: managerUser?.displayName || managerId,
                timestamp: Date.now(),
              },
              ...prev,
            ].slice(0, 10)
          );
        }

        refreshAll();
      } catch {
        showToast(t('admin.dispatch.assignFailed'), 'error');
        refreshAll();
      }
    },
    [draggedBookingId, bookings, token, managers, refreshAll, showToast, t]
  );

  // Smart assignment: Round Robin
  const handleAutoAssign = useCallback(async () => {
    if (selectedBookings.size === 0) {
      showToast(t('admin.dispatch.selectBookingsFirst'), 'info');
      return;
    }

    const onlineManagers = managers.filter((m) => teamStatus[m.id]?.isOnline);
    if (onlineManagers.length === 0) return;

    setAssigning(true);
    const bookingIds = Array.from(selectedBookings);
    const results = await Promise.allSettled(
      bookingIds.map((id, idx) => {
        const mgr = onlineManagers[idx % onlineManagers.length];
        return adminApi.updateBooking(token, { id, assignedTo: mgr.id });
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    showToast(t('admin.dispatch.assigned', { count: succeeded }), 'success');

    // Track recent assignments
    const newAssignments: RecentAssignment[] = bookingIds.map((id, idx) => {
      const booking = bookings.find((b) => b.id === id);
      const mgr = onlineManagers[idx % onlineManagers.length];
      return {
        bookingId: id,
        bookingName: booking?.name || id,
        managerName: mgr.displayName,
        timestamp: Date.now(),
      };
    });
    setRecentAssignments((prev) => [...newAssignments, ...prev].slice(0, 10));

    setSelectedBookings(new Set());
    refreshAll();
    setAssigning(false);
  }, [selectedBookings, managers, teamStatus, token, bookings, showToast, t, refreshAll]);

  // Smart assignment: Least Loaded
  const handleAssignLeastLoaded = useCallback(async () => {
    if (selectedBookings.size === 0) {
      showToast(t('admin.dispatch.selectBookingsFirst'), 'info');
      return;
    }

    const onlineManagers = managers.filter((m) => teamStatus[m.id]?.isOnline);
    if (onlineManagers.length === 0) return;

    // Find manager with fewest current bookings
    let leastLoadedMgr = onlineManagers[0];
    let minLoad = getManagerLoad(onlineManagers[0].id);
    for (const mgr of onlineManagers) {
      const load = getManagerLoad(mgr.id);
      if (load < minLoad) {
        minLoad = load;
        leastLoadedMgr = mgr;
      }
    }

    setAssigning(true);
    const bookingIds = Array.from(selectedBookings);
    const results = await Promise.allSettled(
      bookingIds.map((id) => adminApi.updateBooking(token, { id, assignedTo: leastLoadedMgr.id }))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    showToast(t('admin.dispatch.assigned', { count: succeeded }), 'success');

    const newAssignments: RecentAssignment[] = bookingIds.map((id) => {
      const booking = bookings.find((b) => b.id === id);
      return {
        bookingId: id,
        bookingName: booking?.name || id,
        managerName: leastLoadedMgr.displayName,
        timestamp: Date.now(),
      };
    });
    setRecentAssignments((prev) => [...newAssignments, ...prev].slice(0, 10));

    setSelectedBookings(new Set());
    refreshAll();
    setAssigning(false);
  }, [
    selectedBookings,
    managers,
    teamStatus,
    getManagerLoad,
    token,
    bookings,
    showToast,
    t,
    refreshAll,
  ]);

  const onlineManagerCount = useMemo(
    () => managers.filter((m) => teamStatus[m.id]?.isOnline).length,
    [managers, teamStatus]
  );

  // Render a booking card (shared between list and kanban views)
  const renderBookingCard = (booking: (typeof bookings)[number], draggable: boolean) => (
    <div
      key={booking.id}
      className={`dispatch-booking-item${selectedBookings.has(booking.id) ? ' selected' : ''}`}
      draggable={draggable}
      onDragStart={() => handleDragStart(booking.id)}
      onDragEnd={handleDragEnd}
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
          {booking.date} &middot; {booking.guestCount} {t('admin.booking.guests')} &middot;{' '}
          {booking.region}
        </div>
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );

  // Render the workload bar for a manager
  const renderLoadBar = (managerId: string) => {
    const load = getManagerLoad(managerId);
    return (
      <div className="dispatch-load-bar">
        <div
          className={`dispatch-load-fill ${load > 6 ? 'high' : load > 3 ? 'medium' : 'low'}`}
          style={{ width: `${Math.min((load / 8) * 100, 100)}%` }}
        />
      </div>
    );
  };

  // Kanban view
  const renderKanbanView = () => (
    <div className="dispatch-kanban">
      {/* Unassigned column */}
      <div
        className={`dispatch-kanban-column${dragOverTarget === 'unassigned' ? ' dispatch-drop-target' : ''}`}
        onDragOver={(e) => handleDragOver(e, 'unassigned')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="dispatch-kanban-header">
          {t('admin.dispatch.unassignedQueue')}
          <span className="dispatch-kanban-count">{unassignedBookings.length}</span>
        </div>
        {unassignedBookings.map((booking) => renderBookingCard(booking, true))}
      </div>

      {/* Manager columns */}
      {managers.map((mgr) => {
        const mgrBookings = getManagerBookings(mgr.id);
        return (
          <div
            key={mgr.id}
            className={`dispatch-kanban-column${dragOverTarget === mgr.id ? ' dispatch-drop-target' : ''}`}
            onDragOver={(e) => handleDragOver(e, mgr.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, mgr.id)}
          >
            <div className="dispatch-kanban-header">
              <span>
                <span
                  className={`online-dot ${teamStatus[mgr.id]?.isOnline ? 'online' : 'offline'}`}
                />
                {mgr.displayName}
              </span>
              <span className="dispatch-kanban-count">{mgrBookings.length}</span>
            </div>
            {renderLoadBar(mgr.id)}
            {mgrBookings.map((booking) => renderBookingCard(booking, true))}
          </div>
        );
      })}
    </div>
  );

  // List view (original layout with enhancements)
  const renderListView = () => (
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
            <div className="dispatch-meta-text">
              <label className="dispatch-select-all">
                <input
                  type="checkbox"
                  checked={
                    selectedBookings.size === unassignedBookings.length &&
                    unassignedBookings.length > 0
                  }
                  onChange={toggleSelectAll}
                />
                {t('admin.booking.selectAll')}
              </label>
            </div>
            {unassignedBookings.map((booking) => renderBookingCard(booking, true))}
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

        {/* Smart assign buttons */}
        <div className="dispatch-smart-actions">
          <button
            className="dispatch-smart-btn"
            disabled={selectedBookings.size === 0 || onlineManagerCount === 0 || assigning}
            onClick={handleAutoAssign}
          >
            {t('admin.dispatch.autoAssign')}
          </button>
          <button
            className="dispatch-smart-btn"
            disabled={selectedBookings.size === 0 || onlineManagerCount === 0 || assigning}
            onClick={handleAssignLeastLoaded}
          >
            {t('admin.dispatch.assignLeastLoaded')}
          </button>
        </div>

        {managers.map((mgr) => (
          <div
            key={mgr.id}
            className={`dispatch-manager-card${selectedManager === mgr.id ? ' selected' : ''}${dragOverTarget === mgr.id ? ' dispatch-drop-target' : ''}`}
            onClick={() => setSelectedManager(mgr.id)}
            onDragOver={(e) => handleDragOver(e, mgr.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, mgr.id)}
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
            {renderLoadBar(mgr.id)}
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
  );

  return (
    <div className="dispatch-center">
      <h2>{t('admin.dispatch.title')}</h2>

      {/* View Switcher */}
      <div className="dispatch-view-switcher">
        <button
          className={`dispatch-view-btn${viewMode === 'list' ? ' active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          {t('admin.dispatch.listView')}
        </button>
        <button
          className={`dispatch-view-btn${viewMode === 'kanban' ? ' active' : ''}`}
          onClick={() => setViewMode('kanban')}
        >
          {t('admin.dispatch.kanbanView')}
        </button>
      </div>

      {/* Smart assign buttons in kanban mode */}
      {viewMode === 'kanban' && (
        <div className="dispatch-smart-actions">
          <button
            className="dispatch-smart-btn"
            disabled={selectedBookings.size === 0 || onlineManagerCount === 0 || assigning}
            onClick={handleAutoAssign}
          >
            {t('admin.dispatch.autoAssign')}
          </button>
          <button
            className="dispatch-smart-btn"
            disabled={selectedBookings.size === 0 || onlineManagerCount === 0 || assigning}
            onClick={handleAssignLeastLoaded}
          >
            {t('admin.dispatch.assignLeastLoaded')}
          </button>
        </div>
      )}

      {viewMode === 'list' ? renderListView() : renderKanbanView()}

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
