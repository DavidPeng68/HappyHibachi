import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../images/logo.png';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenuClick = () => {
    // Navigate to home page and scroll to menu section
    navigate('/');
    setTimeout(() => {
      const menuSection = document.getElementById('menu');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleGalleryClick = () => {
    // Navigate to home page and scroll to gallery section
    navigate('/');
    setTimeout(() => {
      const gallerySection = document.getElementById('gallery');
      if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleFAQClick = () => {
    // Navigate to home page and scroll to FAQ section
    navigate('/');
    setTimeout(() => {
      const faqSection = document.getElementById('faq');
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/">
            <img src={logo} alt="Happy Hibachi Logo" className="logo-image" />
          </Link>
        </div>
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>HOME</Link>
          <Link to="/book-now#california">CALIFORNIA</Link>
          <Link to="/book-now#texas">TEXAS</Link>
          <Link to="/book-now#florida">FLORIDA</Link>
          <button onClick={handleMenuClick} className="nav-link-btn">MENU</button>
          <button onClick={handleGalleryClick} className="nav-link-btn">GALLERY</button>
          <button onClick={handleFAQClick} className="nav-link-btn">FAQ</button>
        </div>
        <div className="nav-buttons">
          <Link to="/free-estimate" className="btn-secondary">Free Estimate</Link>
          <Link to="/book-now" className="btn-primary">BOOK NOW</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 