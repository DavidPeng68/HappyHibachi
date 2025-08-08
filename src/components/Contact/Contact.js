import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Contact.css';

const Contact = () => {
  const navigate = useNavigate();

  const handleFreeEstimate = () => {
    navigate('/free-estimate');
  };

  const handleBookNow = () => {
    navigate('/book-now');
  };

  return (
    <section className="contact-section" id="contact">
      <div className="contact-container">
        <div className="contact-header">
          <h2>Contact Us</h2>
          <p>Ready to book your Happy Hibachi experience? Get in touch with us!</p>
        </div>
        
        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <h3>📞 Phone</h3>
              <p>909-615-6633</p>
              <span>Available 7 days a week</span>
            </div>
            
            <div className="contact-item">
              <h3>📧 Email</h3>
              <p>happyhibachi@gmail.com</p>
              <span>Response within 2 hours</span>
            </div>
            
            <div className="contact-item">
              <h3>📍 Service Areas</h3>
              <p>California, Texas, Florida</p>
              <span>No travel fees within 50 miles</span>
            </div>
            
            <div className="contact-item">
              <h3>⏰ Hours</h3>
              <p>Afternoon: 1:00 PM - 3:00 PM</p>
              <p>Evening: 4:00 PM - 6:00 PM</p>
              <p>Night: 7:00 PM - 9:00 PM</p>
            </div>
          </div>
          
          <div className="contact-cta">
            <h3>Book Your Event Today!</h3>
            <p>Don't wait - our weekends fill up quickly!</p>
            <div className="cta-buttons">
              <button className="btn-secondary" onClick={handleFreeEstimate}>Free Estimate</button>
              <button className="btn-primary" onClick={handleBookNow}>Book Now</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact; 