import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from '../../images/hero-bg.jpg';
import './Hero.css';

const Hero = () => {
  const navigate = useNavigate();

  const handleFreeEstimate = () => {
    navigate('/free-estimate');
  };

  const handleBookNow = () => {
    navigate('/book-now');
  };

  return (
    <section className="hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${heroImage})` }}>
      <div className="hero-content">
        <div className="hero-tagline">
          <h2>Top Rated Hibachi At Home Experience</h2>
          <h1>We Bring Our Hibachi Grill + Chef to Your Backyard.</h1>
        </div>
        <p>All you need to do is set up tables and chairs, and provide plates and utensils for your party. Each person gets a side salad, hibachi vegetables, fried rice and 2 proteins of their choice.</p>
        <p>Whether celebrating a wedding, marking an anniversary, hosting a birthday bash, or organizing a corporate event, our hibachi catering fits perfectly with every event catering need.</p>
        <p className="service-areas"><strong>We currently serve: California, Texas, and Florida.</strong></p>
        <div className="hero-buttons">
          <button className="btn-secondary" onClick={handleFreeEstimate}>Free Estimate</button>
          <button className="btn-primary" onClick={handleBookNow}>Book Your Backyard Hibachi Catering Today!</button>
        </div>
        <p className="hero-slogan">#MORESAKEMOREHAPPY</p>
      </div>
    </section>
  );
};

export default Hero; 