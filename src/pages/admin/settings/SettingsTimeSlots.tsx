import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../AdminLayout';
import { ConfirmDialog } from '../../../components/admin';
import * as adminApi from '../../../services/adminApi';
import { useSettings } from '../../../hooks/useSettings';
import type { AppSettings, TimeSlot } from '../../../types';

const SettingsTimeSlots: React.FC = () => {
  const { t } = useTranslation();
  const { token, showToast, settings, setSettings } = useAdmin();
  const { refreshSettings: refreshGlobalSettings } = useSettings();

  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  const saveSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      try {
        const result = await adminApi.saveSettings(token, newSettings);
        if (result.success && result.settings) {
          setSettings(result.settings);
          showToast(t('admin.toast.settingsSaved'), 'success');
          refreshGlobalSettings();
        } else {
          showToast(t('admin.toast.saveFailed'), 'error');
        }
      } catch {
        showToast(t('admin.toast.saveFailed'), 'error');
      }
    },
    [token, setSettings, showToast, t, refreshGlobalSettings]
  );

  const addTimeSlot = useCallback(() => {
    const newSlot: TimeSlot = {
      id: `custom_${Date.now()}`,
      label: t('admin.settings.newSlotLabel'),
      startTime: '12:00',
      endTime: '14:00',
      enabled: true,
    };
    const newTimeSlots = [...settings.timeSlots, newSlot];
    saveSettings({ timeSlots: newTimeSlots });
  }, [settings.timeSlots, saveSettings, t]);

  const toggleTimeSlot = useCallback(
    (slotId: string) => {
      const newTimeSlots = settings.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, enabled: !slot.enabled } : slot
      );
      saveSettings({ timeSlots: newTimeSlots });
    },
    [settings.timeSlots, saveSettings]
  );

  const updateTimeSlotLabel = useCallback(
    (slotId: string, label: string) => {
      const newTimeSlots = settings.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, label } : slot
      );
      setSettings((prev) => ({ ...prev, timeSlots: newTimeSlots }));
    },
    [settings.timeSlots, setSettings]
  );

  const updateTimeSlotTime = useCallback(
    (slotId: string, field: 'startTime' | 'endTime', value: string) => {
      const newTimeSlots = settings.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      );
      setSettings((prev) => ({ ...prev, timeSlots: newTimeSlots }));
    },
    [settings.timeSlots, setSettings]
  );

  const confirmDeleteTimeSlot = useCallback(() => {
    if (!deleteSlotId) return;
    const newTimeSlots = settings.timeSlots.filter((slot) => slot.id !== deleteSlotId);
    saveSettings({ timeSlots: newTimeSlots });
    setDeleteSlotId(null);
  }, [deleteSlotId, settings.timeSlots, saveSettings]);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>{t('admin.settings.timeSlots')}</h2>
          <button className="btn-sm-success" onClick={addTimeSlot} type="button">
            {t('admin.settings.addSlot')}
          </button>
        </div>
        <div className="time-slots-list">
          {settings.timeSlots.map((slot) => (
            <div key={slot.id} className={`time-slot-item${!slot.enabled ? ' disabled' : ''}`}>
              <div className="slot-main">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={() => toggleTimeSlot(slot.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <input
                  type="text"
                  className="slot-label-input"
                  value={slot.label}
                  onChange={(e) => updateTimeSlotLabel(slot.id, e.target.value)}
                  onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                  placeholder={t('admin.settings.slotNamePlaceholder')}
                />
              </div>
              <div className="slot-times">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateTimeSlotTime(slot.id, 'startTime', e.target.value)}
                  onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                />
                <span>&mdash;</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateTimeSlotTime(slot.id, 'endTime', e.target.value)}
                  onBlur={() => saveSettings({ timeSlots: settings.timeSlots })}
                />
              </div>
              <button
                className="btn-icon-sm"
                onClick={() => setDeleteSlotId(slot.id)}
                title={t('admin.settings.deleteSlot')}
                type="button"
              >
                &#128465;
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleteSlotId !== null}
        title={t('admin.settings.confirmDeleteSlotTitle')}
        message={t('admin.settings.confirmDeleteSlotMessage')}
        variant="danger"
        onConfirm={confirmDeleteTimeSlot}
        onCancel={() => setDeleteSlotId(null)}
      />
    </>
  );
};

export default SettingsTimeSlots;
