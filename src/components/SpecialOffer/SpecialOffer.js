import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SpecialOffer.css';

const SpecialOffer = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  const handleFreeEstimate = () => {
    navigate('/free-estimate');
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Auto-hide after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="special-offer">
      <div className="offer-content">
        <button className="close-btn" onClick={handleClose} aria-label="Close offer">
          ×
        </button>
        <h3>No travel fees within 50 miles</h3>
        <h3>No hidden charges</h3>
        <h3>Exclusive discounts</h3>
        <h3>Just for you!</h3>
        <p>Sunday to Friday Special! free tables and chairs Happy Hibachi Catering</p>
        <p className="service-note">Serving California, Texas & Florida</p>
        <button className="btn-primary" onClick={handleFreeEstimate}>Free estimate</button>
      </div>
    </div>
  );
};

export default SpecialOffer;