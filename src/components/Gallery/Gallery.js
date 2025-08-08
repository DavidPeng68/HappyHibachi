import React, { useState } from 'react';
import gallery1 from '../../images/gallery-1.jpg';
import gallery2 from '../../images/gallery-2.jpg';
import gallery3 from '../../images/gallery-3.jpg';
import food1 from '../../images/food-1.jpg';
import food2 from '../../images/food-2.jpg';
import chefCooking from '../../images/chef-cooking.jpg';
import './Gallery.css';

const Gallery = () => {
  const [activeGallery, setActiveGallery] = useState(0);

  const galleryImages = [
    // Your local hibachi images
    chefCooking,
    gallery1,
    food1,
    gallery2,
    food2,
    gallery3,
    chefCooking,
    gallery1,
    food1,
    gallery2,
    food2,
    gallery3
  ];

  const galleryDescriptions = [
    "Professional Hibachi Chef in Action",
    "Premium Hibachi Grill Setup",
    "Delicious Hibachi Steak",
    "Fresh Hibachi Vegetables",
    "Amazing Hibachi Shrimp",
    "Beautiful Food Presentation",
    "Expert Cooking Techniques",
    "Family Gathering Atmosphere",
    "Premium Service Quality",
    "Memorable Event Setup",
    "Customer Satisfaction",
    "Professional Event Experience"
  ];

  const nextGallery = () => {
    setActiveGallery((prev) => (prev + 1) % galleryImages.length);
  };

  const prevGallery = () => {
    setActiveGallery((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <section className="gallery" id="gallery">
      <h2>GALLERY</h2>
      <p className="gallery-subtitle">Experience the Happy Hibachi difference</p>
      <div className="gallery-container">
        <div className="gallery-slide">
          <img 
            src={galleryImages[activeGallery]} 
            alt={galleryDescriptions[activeGallery]}
            loading="lazy"
          />
          <div className="gallery-caption">
            <h3>{galleryDescriptions[activeGallery]}</h3>
            <p>Image {activeGallery + 1} of {galleryImages.length}</p>
          </div>
        </div>
        <button className="gallery-btn prev" onClick={prevGallery} aria-label="Previous image">◀</button>
        <button className="gallery-btn next" onClick={nextGallery} aria-label="Next image">▶</button>
        <div className="gallery-dots">
          {galleryImages.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === activeGallery ? 'active' : ''}`}
              onClick={() => setActiveGallery(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery; 