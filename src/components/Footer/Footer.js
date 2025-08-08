import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-nav">
          <a href="#california">CALIFORNIA</a>
          <a href="#texas">TEXAS</a>
          <a href="#miami">MIAMI</a>
          <a href="#menu">MENU</a>
          <a href="#gallery">GALLERY</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="footer-copyright">
          <p>2025 HAPPY HIBACHI All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;