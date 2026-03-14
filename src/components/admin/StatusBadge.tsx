import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const statusConfig: Record<
  StatusBadgeProps['status'],
  { color: string; bg: string; label: string }
> = {
  pending: {
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    label: 'Pending',
  },
  confirmed: {
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.15)',
    label: 'Confirmed',
  },
  completed: {
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    label: 'Completed',
  },
  cancelled: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    label: 'Cancelled',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <span className="status-badge" style={{ color: config.color, background: config.bg }}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
