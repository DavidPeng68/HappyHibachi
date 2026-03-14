import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../images/logo.jpg';
import { useAppNavigation, useSettings } from '../../hooks';
import { ROUTES } from '../../constants';
import LanguageSwitcher from '../LanguageSwitcher';
import { ThemeToggle } from '../ui';
import './Navigation.css';

/**
 * Main navigation component
 * Fixed header with scroll-aware shrinking, progress bar, and active section highlighting
 */
const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { goToMenu, goToGallery, goToFAQ } = useAppNavigation();
  const { settings } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Scroll-aware shrinking header + active section detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    // Section highlighting via IntersectionObserver
    const sectionIds = ['menu-pricing', 'gallery', 'booking', 'faq', 'contact'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observers.forEach((obs) => obs.disconnect());
    };
  }, [location.pathname]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    // Return focus to toggle button when menu closes
    toggleBtnRef.current?.focus();
  }, []);

  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);

  // Escape key closes mobile menu + focus trap
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
        return;
      }

      // Focus trap: Tab/Shift+Tab within mobile menu
      if (e.key === 'Tab' && navLinksRef.current) {
        const focusable = navLinksRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Lock body scroll when mobile menu is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Scroll progress bar */}
      <div className="scroll-progress-bar scroll-progress" aria-hidden="true" />
      <div className="nav-container">
        <div className="nav-logo">
          <Link to={ROUTES.HOME} aria-label={`${settings.brandInfo.name} Home`}>
            <img
              src={settings.brandInfo.logoImage || logo}
              alt={`${settings.brandInfo.name} Logo`}
              className="logo-image"
              width={120}
              height={40}
            />
          </Link>
        </div>

        {/* Compact language switcher (visible on mobile only) */}
        <div className="nav-language-compact">
          <LanguageSwitcher />
        </div>

        {/* Mobile menu toggle */}
        <button
          ref={toggleBtnRef}
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div ref={navLinksRef} className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <Link
            to={ROUTES.HOME}
            className={location.pathname === '/' ? 'active' : ''}
            onClick={closeMobileMenu}
          >
            {t('nav.home')}
          </Link>
          <Link to={`${ROUTES.BOOK_NOW}#california`} onClick={closeMobileMenu}>
            {t('nav.california')}
          </Link>
          <Link to={`${ROUTES.BOOK_NOW}#texas`} onClick={closeMobileMenu}>
            {t('nav.texas')}
          </Link>
          <Link to={`${ROUTES.BOOK_NOW}#florida`} onClick={closeMobileMenu}>
            {t('nav.florida')}
          </Link>
          <button
            onClick={() => {
              goToMenu();
              closeMobileMenu();
            }}
            className="nav-link-btn"
            type="button"
          >
            {t('nav.menu')}
          </button>
          <button
            onClick={() => {
              goToGallery();
              closeMobileMenu();
            }}
            className="nav-link-btn"
            type="button"
          >
            {t('gallery.title')}
          </button>
          <button
            onClick={() => {
              goToFAQ();
              closeMobileMenu();
            }}
            className="nav-link-btn"
            type="button"
          >
            {t('nav.faq')}
          </button>

          {/* Mobile CTA buttons (shown inside mobile menu) */}
          <div className="mobile-nav-buttons">
            <Link to={ROUTES.FREE_ESTIMATE} className="btn-secondary" onClick={closeMobileMenu}>
              {t('nav.freeEstimate')}
            </Link>
            <Link to={ROUTES.BOOK_NOW} className="btn-primary" onClick={closeMobileMenu}>
              {t('nav.bookNow')}
            </Link>
          </div>

          {/* Mobile language switcher & theme toggle */}
          <div className="mobile-language-switcher">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="nav-buttons">
          <ThemeToggle />
          <LanguageSwitcher />
          <Link to={ROUTES.FREE_ESTIMATE} className="btn-secondary">
            {t('nav.freeEstimate')}
          </Link>
          <Link to={ROUTES.BOOK_NOW} className="btn-primary">
            {t('nav.bookNow')}
          </Link>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>}
    </nav>
  );
};

export default Navigation;
