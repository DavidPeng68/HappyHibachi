import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUser } from '../../../types/admin';
import { CommentsThread } from '../../../components/admin';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BookingDetailCommentsProps {
  bookingId: string;
  token: string;
  userId: string;
  displayName: string;
  orderManagers: Omit<AdminUser, 'passwordHash'>[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingDetailComments: React.FC<BookingDetailCommentsProps> = ({
  bookingId,
  token,
  userId,
  displayName,
  orderManagers,
}) => {
  const { t } = useTranslation();

  return (
    <div className="admin-card bm-card" style={{ gridColumn: '1 / -1' }}>
      <h3 className="bm-card-title">{t('admin.comments.title')}</h3>
      <CommentsThread
        bookingId={bookingId}
        token={token}
        userId={userId}
        displayName={displayName}
        approvedUsers={orderManagers.map((m) => ({ id: m.id, displayName: m.displayName }))}
      />
    </div>
  );
};

export default BookingDetailComments;
