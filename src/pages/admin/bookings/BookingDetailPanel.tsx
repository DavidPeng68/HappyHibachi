import React from 'react';
import type { AdminUser, Booking } from '../../../types/admin';
import BookingDetailInfo from './BookingDetailInfo';
import BookingDetailNotes from './BookingDetailNotes';
import BookingDetailComments from './BookingDetailComments';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BookingDetailPanelProps {
  booking: Booking;
  onUpdate: (data: Partial<Booking> & { id: string }) => Promise<void>;
  onDelete?: (id: string) => void;
  onClose: () => void;
  isSuperAdmin: boolean;
  orderManagers: Omit<AdminUser, 'passwordHash'>[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  token: string;
  userId: string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingDetailPanel: React.FC<BookingDetailPanelProps> = ({
  booking,
  onUpdate,
  onDelete,
  onClose: _onClose,
  isSuperAdmin,
  orderManagers,
  showToast,
  token,
  userId,
  displayName,
}) => {
  return (
    <div className="bm-detail-grid">
      <BookingDetailInfo
        booking={booking}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isSuperAdmin={isSuperAdmin}
        orderManagers={orderManagers}
        showToast={showToast}
      />

      <BookingDetailNotes booking={booking} onUpdate={onUpdate} />

      <BookingDetailComments
        bookingId={booking.id}
        token={token}
        userId={userId}
        displayName={displayName}
        orderManagers={orderManagers}
      />
    </div>
  );
};

export default BookingDetailPanel;
