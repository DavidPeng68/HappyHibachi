import React, { useState, useEffect } from 'react';
import chefCooking from '../../images/chef-cooking.jpg';
import food1 from '../../images/food-1.jpg';
import food2 from '../../images/food-2.jpg';
import gallery1 from '../../images/gallery-1.jpg';
import gallery2 from '../../images/gallery-2.jpg';
import './ImageSlider.css';

const ImageSlider = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    chefCooking,
    food1,
    food2,
    gallery1,
    gallery2
  ];

  const slideTitles = [
    "Professional Hibachi Chef in Action",
    "Delicious Hibachi Steak",
    "Amazing Hibachi Shrimp",
    "Premium Hibachi Setup",
    "Beautiful Food Presentation"
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 2500); // Change slide every 2.5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setActiveSlide(index);
  };

  return (
    <section className="slider-section">
      <div className="slider">
        <div className="slide-container">
          {slides.map((slide, index) => (
            <div 
              key={index} 
              className={`slide ${index === activeSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide})` }}
            >
              <div className="slide-content">
                <h2>{slideTitles[index]}</h2>
              </div>
            </div>
          ))}
        </div>
        
        {/* Navigation buttons */}
        <button className="slider-btn prev" onClick={prevSlide}>❮</button>
        <button className="slider-btn next" onClick={nextSlide}>❯</button>
        
        {/* Slide indicators */}
        <div className="slide-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === activeSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImageSlider; 