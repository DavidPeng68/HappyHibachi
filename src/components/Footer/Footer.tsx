import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppNavigation, useSettings } from '../../hooks';
import { ROUTES } from '../../constants';
import { Icon } from '../ui';
import logo from '../../images/logo.jpg';
import './Footer.css';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { goToMenu, goToGallery, goToFAQ } = useAppNavigation();
  const { settings } = useSettings();
  const { socialLinks, contactInfo, brandInfo } = settings;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-main">
          {/* Brand */}
          <div className="footer-brand">
            <img
              src={brandInfo.logoImage || logo}
              alt={brandInfo.name}
              className="footer-logo"
              width={120}
              height={40}
            />
            <p>{t('footer.description')}</p>
            <div className="footer-social">
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Icon name="instagram" size={20} />
              </a>
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Icon name="facebook" size={20} />
              </a>
              <a
                href={socialLinks.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <Icon name="tiktok" size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-column">
            <h4>{t('footer.quickLinks')}</h4>
            <ul>
              <li>
                <Link to={`${ROUTES.BOOK_NOW}#california`}>{t('nav.california')}</Link>
              </li>
              <li>
                <Link to={`${ROUTES.BOOK_NOW}#texas`}>{t('nav.texas')}</Link>
              </li>
              <li>
                <Link to={`${ROUTES.BOOK_NOW}#florida`}>{t('nav.florida')}</Link>
              </li>
              <li>
                <button onClick={goToMenu} type="button">
                  {t('nav.menu')}
                </button>
              </li>
              <li>
                <button onClick={goToGallery} type="button">
                  {t('gallery.title')}
                </button>
              </li>
              <li>
                <button onClick={goToFAQ} type="button">
                  {t('nav.faq')}
                </button>
              </li>
              <li>
                <Link to={ROUTES.MY_BOOKING}>{t('nav.myBooking')}</Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer-column">
            <h4>{t('contact.address')}</h4>
            <ul>
              <li>{t('booking.california')}</li>
              <li>{t('booking.texas')}</li>
              <li>{t('booking.florida')}</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-column footer-contact">
            <h4>{t('footer.contact')}</h4>
            <p>
              <span>
                <Icon name="phone" size={16} />
              </span>
              <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>
            </p>
            <p>
              <span>
                <Icon name="email" size={16} />
              </span>
              <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom">
          <p>
            &copy; {currentYear} {brandInfo.name.toUpperCase()}. {t('footer.allRightsReserved')}
          </p>
          <div className="footer-legal">
            <Link to="/privacy">{t('footer.privacyPolicy')}</Link>
            <Link to="/terms">{t('footer.termsOfService')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
