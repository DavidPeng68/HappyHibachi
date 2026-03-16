import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BookingStatus } from '../../../types/admin';
import { ConfirmDialog } from '../../../components/admin';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingBatchActionsProps {
  selectedCount: number;
  isSuperAdmin: boolean;
  // Batch status
  batchStatusConfirm: { open: boolean; status: BookingStatus };
  statusLoading: boolean;
  onBatchStatusOpen: (status: BookingStatus) => void;
  onBatchStatusConfirm: () => void;
  onBatchStatusCancel: () => void;
  // Batch delete
  batchDeleteConfirm: boolean;
  deleteLoading: boolean;
  onBatchDeleteOpen: () => void;
  onBatchDeleteConfirm: () => void;
  onBatchDeleteCancel: () => void;
  // Export
  onExportSelected: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingBatchActions: React.FC<BookingBatchActionsProps> = ({
  selectedCount,
  isSuperAdmin,
  batchStatusConfirm,
  statusLoading,
  onBatchStatusOpen,
  onBatchStatusConfirm,
  onBatchStatusCancel,
  batchDeleteConfirm,
  deleteLoading,
  onBatchDeleteOpen,
  onBatchDeleteConfirm,
  onBatchDeleteCancel,
  onExportSelected,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Batch actions bar */}
      {selectedCount > 0 && (
        <div className="bm-batch-bar">
          <span className="bm-batch-count">
            {t('admin.booking.selectedCount', { count: selectedCount })}
          </span>
          <div className="bm-batch-actions">
            <select
              className="bm-batch-status-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onBatchStatusOpen(e.target.value as BookingStatus);
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>
                {t('admin.booking.updateStatus')}
              </option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`admin.tabs.${s}`)}
                </option>
              ))}
            </select>
            {isSuperAdmin && (
              <button className="admin-btn bm-delete-btn" onClick={onBatchDeleteOpen} type="button">
                {t('admin.booking.deleteSelected')}
              </button>
            )}
            <button className="admin-btn" onClick={onExportSelected} type="button">
              {t('admin.booking.exportSelected')}
            </button>
          </div>
        </div>
      )}

      {/* Batch delete confirmation */}
      <ConfirmDialog
        open={batchDeleteConfirm}
        title={t('admin.booking.deleteSelected')}
        message={t('admin.booking.batchDeleteConfirmMessage', {
          count: selectedCount,
        })}
        variant="danger"
        loading={deleteLoading}
        onConfirm={onBatchDeleteConfirm}
        onCancel={onBatchDeleteCancel}
      />

      {/* Batch status update confirmation */}
      <ConfirmDialog
        open={batchStatusConfirm.open}
        title={t('admin.booking.updateStatus')}
        message={t('admin.booking.batchStatusConfirmMessage', {
          count: selectedCount,
          status: t(`admin.tabs.${batchStatusConfirm.status}`),
        })}
        variant="warning"
        loading={statusLoading}
        onConfirm={onBatchStatusConfirm}
        onCancel={onBatchStatusCancel}
      />
    </>
  );
};

export default BookingBatchActions;
