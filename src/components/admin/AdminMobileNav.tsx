import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminMenuType } from '../../types/admin';
import Icon from '../ui/Icon/Icon';
import { MENU_ICONS, MOBILE_NAV_ITEMS } from './AdminSidebar';

interface AdminMobileNavProps {
  activeMenu: AdminMenuType;
  visibleMenus: AdminMenuType[];
  menuItems: { key: AdminMenuType; icon: string; label: string }[];
  onNavigate: (menu: AdminMenuType) => void;
}

const AdminMobileNav: React.FC<AdminMobileNavProps> = ({
  activeMenu,
  visibleMenus,
  menuItems,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const visibleMobileNavItems = useMemo(
    () => MOBILE_NAV_ITEMS.filter((key) => visibleMenus.includes(key)),
    [visibleMenus]
  );

  const moreMenuItems = useMemo(
    () => menuItems.filter((item) => !MOBILE_NAV_ITEMS.includes(item.key)),
    [menuItems]
  );

  const handleNavClick = useCallback(
    (key: AdminMenuType) => {
      onNavigate(key);
      setMoreSheetOpen(false);
    },
    [onNavigate]
  );

  const handleMoreToggle = useCallback(() => {
    setMoreSheetOpen((prev) => !prev);
  }, []);

  const closeSheet = useCallback(() => setMoreSheetOpen(false), []);

  // Swipe-down-to-close on more sheet
  useEffect(() => {
    if (!moreSheetOpen) return;
    const el = sheetRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const diff = e.changedTouches[0].clientY - touchStartY.current;
      if (diff > 60) closeSheet();
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [moreSheetOpen, closeSheet]);

  return (
    <>
      <nav className="mobile-nav" aria-label={t('admin.a11y.mobileNavigation')}>
        {visibleMobileNavItems.map((key) => (
          <button
            key={key}
            className={`mobile-nav-item${activeMenu === key ? ' active' : ''}`}
            onClick={() => handleNavClick(key)}
          >
            <span className="mobile-nav-icon">
              <Icon name={MENU_ICONS[key]} size={20} />
            </span>
            <span className="mobile-nav-label">{t(`admin.nav.${key}`)}</span>
          </button>
        ))}
        {moreMenuItems.length > 0 && (
          <button
            className={`mobile-nav-item${moreSheetOpen ? ' active' : ''}`}
            onClick={handleMoreToggle}
            aria-label={t('admin.nav.more')}
          >
            <span className="mobile-nav-icon">{'\u22EF'}</span>
            <span className="mobile-nav-label">{t('admin.nav.more')}</span>
          </button>
        )}
      </nav>

      {moreSheetOpen && (
        <>
          <div className="more-sheet-overlay" onClick={closeSheet} role="presentation" />
          <div ref={sheetRef} className="more-sheet" role="dialog" aria-label={t('admin.nav.more')}>
            <div className="more-sheet-handle" />
            {moreMenuItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item${activeMenu === item.key ? ' active' : ''}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="nav-icon">
                  <Icon name={MENU_ICONS[item.key]} size={18} />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default React.memo(AdminMobileNav);
