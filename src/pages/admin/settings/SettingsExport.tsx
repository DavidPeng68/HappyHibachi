import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../AdminLayout';

const SettingsExport: React.FC = () => {
  const { t } = useTranslation();
  const { showToast, settings, bookings, blockedDates } = useAdmin();

  // -------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------

  const totalBookings = bookings.length;
  const enabledSlots = settings.timeSlots.filter((s) => s.enabled).length;
  const totalSlots = settings.timeSlots.length;

  // -------------------------------------------------------------------
  // Export: CSV
  // -------------------------------------------------------------------

  const exportBookingsCSV = useCallback(() => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'error');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Date',
      'Time',
      'Guests',
      'Package',
      'Adults',
      'Kids',
      'Proteins',
      'Addons',
      'EstTotal',
      'Region',
      'Status',
      'Type',
      'Coupon',
      'Discount',
      'Referral',
      'Message',
      'Created',
    ];

    const csvContent = [
      headers.join(','),
      ...bookings.map((b) =>
        [
          b.id,
          `"${b.name.replace(/"/g, '""')}"`,
          b.email,
          b.phone,
          b.date,
          b.time,
          b.guestCount,
          `"${(b.orderData?.packageName || '').replace(/"/g, '""')}"`,
          b.orderData?.guestCount ?? '',
          b.orderData?.kidsCount ?? '',
          `"${(b.orderData?.proteins || []).join(', ')}"`,
          `"${(b.orderData?.addons || []).map((a) => `${a.name}x${a.quantity}`).join(', ')}"`,
          b.orderData?.estimatedTotal ?? '',
          b.region,
          b.status,
          b.formType,
          b.couponCode || '',
          b.couponDiscount || '',
          b.referralSource || '',
          `"${(b.message || '').replace(/"/g, '""')}"`,
          b.createdAt,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(t('admin.toast.exported', { count: bookings.length }), 'success');
  }, [bookings, showToast, t]);

  // -------------------------------------------------------------------
  // Export: Clipboard
  // -------------------------------------------------------------------

  const copyBookingsToClipboard = useCallback(async () => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataCopy'), 'error');
      return;
    }

    const statusMap: Record<string, string> = {
      pending: t('admin.export.statusPending'),
      confirmed: t('admin.export.statusConfirmed'),
      completed: t('admin.export.statusCompleted'),
      cancelled: t('admin.export.statusCancelled'),
    };

    const textContent = bookings
      .map(
        (b, i) =>
          `[${t('admin.export.bookingLabel')} ${i + 1}]\n` +
          `${t('admin.export.nameLabel')}: ${b.name}\n` +
          `${t('admin.export.phoneLabel')}: ${b.phone}\n` +
          `${t('admin.export.emailLabel')}: ${b.email}\n` +
          `${t('admin.export.dateLabel')}: ${b.date}\n` +
          `${t('admin.export.timeLabel')}: ${b.time}\n` +
          `${t('admin.export.guestsLabel')}: ${b.guestCount}\n` +
          `${t('admin.export.regionLabel')}: ${b.region}\n` +
          `${t('admin.export.statusLabel')}: ${statusMap[b.status] || b.status}\n` +
          (b.orderData
            ? `${t('admin.export.packageLabel')}: ${b.orderData.packageName} (${b.orderData.priceModel})\n` +
              `${t('admin.export.adultsKidsLabel', { adults: b.orderData.guestCount, kids: b.orderData.kidsCount })}\n` +
              `${t('admin.export.proteinsLabel')}: ${b.orderData.proteins.length > 0 ? b.orderData.proteins.join(', ') : t('admin.export.chefsChoice')}\n` +
              (b.orderData.addons.length > 0
                ? `${t('admin.export.addonsLabel')}: ${b.orderData.addons.map((a) => `${a.name} x${a.quantity}`).join(', ')}\n`
                : '') +
              `${t('admin.export.estTotalLabel')}: $${b.orderData.estimatedTotal}\n`
            : '') +
          (b.couponCode
            ? `${t('admin.export.couponLabel')}: ${b.couponCode} (${b.couponDiscount})\n`
            : '') +
          (b.message ? `${t('admin.export.messageLabel')}: ${b.message}\n` : '') +
          `${t('admin.export.createdLabel')}: ${new Date(b.createdAt).toLocaleString()}`
      )
      .join('\n\n' + '\u2500'.repeat(30) + '\n\n');

    const brand = settings.brandInfo?.name || t('admin.export.defaultBrand');
    const header = `${t('admin.export.exportHeader', { brand })}\n${t('admin.export.exportTime', { time: new Date().toLocaleString() })}\n${t('admin.export.totalRecords', { count: bookings.length })}\n\n${'='.repeat(30)}\n\n`;

    try {
      await navigator.clipboard.writeText(header + textContent);
      showToast(t('admin.toast.copied', { count: bookings.length }), 'success');
    } catch {
      showToast(t('admin.toast.copyFailed'), 'error');
    }
  }, [bookings, settings.brandInfo?.name, showToast, t]);

  // -------------------------------------------------------------------
  // Export: Image
  // -------------------------------------------------------------------

  const exportBookingsAsImage = useCallback(async () => {
    if (bookings.length === 0) {
      showToast(t('admin.toast.noDataExport'), 'error');
      return;
    }

    const statusMap: Record<string, string> = {
      pending: `\u23F3 ${t('admin.export.statusPending')}`,
      confirmed: `\u2705 ${t('admin.export.statusConfirmed')}`,
      completed: `\uD83C\uDF89 ${t('admin.export.statusCompleted')}`,
      cancelled: `\u274C ${t('admin.export.statusCancelled')}`,
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast(t('admin.toast.browserNotSupported'), 'error');
      return;
    }

    const padding = 40;
    const headerHeight = 80;
    const itemPadding = 20;
    const itemHeight = 220;
    const cols = Math.min(2, Math.ceil(bookings.length / 5));
    const rows = Math.ceil(bookings.length / cols);

    canvas.width = Math.max(800, cols * 380 + padding * 2);
    canvas.height = headerHeight + rows * itemHeight + padding * 2;

    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `\uD83C\uDF71 ${t('admin.export.bookingData', { brand: settings.brandInfo?.name || t('admin.export.defaultBrand') })}`,
      padding,
      padding + 30
    );

    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${t('admin.export.exportTime', { time: new Date().toLocaleString() })} | ${t('admin.export.totalRecords', { count: bookings.length })}`,
      padding,
      padding + 55
    );

    bookings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * 380;
      const y = headerHeight + padding + row * itemHeight;

      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(x, y, 360, itemHeight - 20, 8);
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${b.name}`, x + itemPadding, y + 30);

      ctx.fillStyle = '#FF6B35';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(statusMap[b.status] || b.status, x + 280, y + 30);

      ctx.fillStyle = '#aaa';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      const lines = [
        `\uD83D\uDCDE ${b.phone}`,
        `\uD83D\uDCE7 ${b.email}`,
        `\uD83D\uDCC5 ${b.date} ${b.time}`,
        `\uD83D\uDC65 ${t('admin.export.guests', { count: b.guestCount })} | \uD83D\uDCCD ${b.region}`,
        b.couponCode ? `\uD83C\uDFAB ${b.couponCode}` : '',
      ].filter(Boolean);

      lines.forEach((line, li) => {
        ctx.fillText(line, x + itemPadding, y + 60 + li * 26);
      });
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast(t('admin.toast.imageGenFailed'), 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `bookings_${new Date().toISOString().split('T')[0]}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast(t('admin.toast.imageSaved', { count: bookings.length }), 'success');
    }, 'image/png');
  }, [bookings, settings.brandInfo?.name, showToast, t]);

  return (
    <>
      {/* Data Export */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.dataExport')}</h2>
        </div>
        <div className="settings-section--col">
          <button className="btn-primary w-full" onClick={exportBookingsCSV} type="button">
            {t('admin.settings.exportCsv')}
          </button>
          <button className="btn-secondary w-full" onClick={copyBookingsToClipboard} type="button">
            {t('admin.settings.copyAllData')}
          </button>
          <button className="btn-secondary w-full" onClick={exportBookingsAsImage} type="button">
            {t('admin.settings.saveAsImage')}
          </button>
          <p className="settings-hint--sm">
            {t('admin.settings.totalBookingsLabel', { count: bookings.length })}
          </p>
        </div>
      </div>

      {/* System Info */}
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.systemInfo')}</h2>
        </div>
        <div className="detail-info">
          <div className="info-row">
            <span className="info-label">{t('admin.settings.version')}</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.totalBookings')}</span>
            <span className="info-value">{totalBookings}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.blockedDates')}</span>
            <span className="info-value">{blockedDates.length}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('admin.settings.enabledSlots')}</span>
            <span className="info-value">
              {enabledSlots} / {totalSlots}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsExport;
