import React from 'react';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  return <span className={`status-badge status-badge--${status}`}>{t(`status.${status}`)}</span>;
};

export default StatusBadge;
