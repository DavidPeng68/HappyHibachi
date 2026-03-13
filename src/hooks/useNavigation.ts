import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ANIMATION, ROUTES, SECTION_IDS } from '../constants';

/**
 * Custom hook for navigation actions
 * Centralizes navigation logic to avoid code duplication
 */
export const useAppNavigation = () => {
  const navigate = useNavigate();

  const goToHome = useCallback(() => {
    navigate(ROUTES.HOME);
  }, [navigate]);

  const goToFreeEstimate = useCallback(() => {
    navigate(ROUTES.FREE_ESTIMATE);
  }, [navigate]);

  const goToBookNow = useCallback(() => {
    navigate(ROUTES.BOOK_NOW);
  }, [navigate]);

  const goToBookNowWithHash = useCallback(
    (hash: string) => {
      navigate(`${ROUTES.BOOK_NOW}${hash}`);
    },
    [navigate]
  );

  const goToAdmin = useCallback(() => {
    navigate(ROUTES.ADMIN);
  }, [navigate]);

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const navigateAndScroll = useCallback(
    (path: string, sectionId: string) => {
      navigate(path);
      setTimeout(() => {
        scrollToSection(sectionId);
      }, ANIMATION.SCROLL_DELAY_MS);
    },
    [navigate, scrollToSection]
  );

  const goToMenu = useCallback(() => {
    navigateAndScroll(ROUTES.HOME, SECTION_IDS.MENU);
  }, [navigateAndScroll]);

  const goToGallery = useCallback(() => {
    navigateAndScroll(ROUTES.HOME, SECTION_IDS.GALLERY);
  }, [navigateAndScroll]);

  const goToFAQ = useCallback(() => {
    navigateAndScroll(ROUTES.HOME, SECTION_IDS.FAQ);
  }, [navigateAndScroll]);

  const goToContact = useCallback(() => {
    navigateAndScroll(ROUTES.HOME, SECTION_IDS.CONTACT);
  }, [navigateAndScroll]);

  // Region navigation helpers
  const goToCaliforniaBooking = useCallback(() => {
    goToBookNowWithHash('#california');
  }, [goToBookNowWithHash]);

  const goToTexasBooking = useCallback(() => {
    goToBookNowWithHash('#texas');
  }, [goToBookNowWithHash]);

  const goToFloridaBooking = useCallback(() => {
    goToBookNowWithHash('#florida');
  }, [goToBookNowWithHash]);

  return {
    navigate,
    goToHome,
    goToFreeEstimate,
    goToBookNow,
    goToBookNowWithHash,
    goToAdmin,
    scrollToSection,
    navigateAndScroll,
    goToMenu,
    goToGallery,
    goToFAQ,
    goToContact,
    goToCaliforniaBooking,
    goToTexasBooking,
    goToFloridaBooking,
  };
};

export default useAppNavigation;
