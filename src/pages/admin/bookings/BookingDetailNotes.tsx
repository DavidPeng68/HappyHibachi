import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../../../types/admin';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BookingDetailNotesProps {
  booking: Booking;
  onUpdate: (data: Partial<Booking> & { id: string }) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingDetailNotes: React.FC<BookingDetailNotesProps> = ({ booking: b, onUpdate }) => {
  const { t } = useTranslation();

  const [adminNotes, setAdminNotes] = useState(b.adminNotes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);

  const saveAdminNotes = useCallback(async () => {
    if (adminNotes === (b.adminNotes ?? '')) return;
    setNotesSaving(true);
    try {
      await onUpdate({ id: b.id, adminNotes });
    } finally {
      setNotesSaving(false);
    }
  }, [b.id, b.adminNotes, adminNotes, onUpdate]);

  return (
    <div className="admin-card bm-card">
      <h3 className="bm-card-title">
        {t('admin.booking.adminNotes')}
        {notesSaving && <span className="bm-saving-indicator">{t('admin.booking.saving')}</span>}
      </h3>
      <textarea
        className="bm-notes-textarea"
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        onBlur={saveAdminNotes}
        placeholder={t('admin.booking.adminNotesPlaceholder')}
        rows={4}
      />
    </div>
  );
};

export default BookingDetailNotes;
