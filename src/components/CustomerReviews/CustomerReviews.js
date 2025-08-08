import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerReviews.css';

const CustomerReviews = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const reviews = [
    {
      id: 1,
      name: "Sarah M.",
      location: "Los Angeles, CA",
      rating: 5,
      review: "Amazing experience! The chef was entertaining and the food was incredible. Our backyard party was a huge success!",
      event: "Birthday Party"
    },
    {
      id: 2,
      name: "Michael T.",
      location: "Houston, TX",
      rating: 5,
      review: "Professional service from start to finish. The hibachi setup was perfect and the food was restaurant quality.",
      event: "Corporate Event"
    },
    {
      id: 3,
      name: "Jennifer L.",
      location: "Miami, FL",
      rating: 5,
      review: "Best decision for our anniversary! The intimate hibachi experience was romantic and delicious.",
      event: "Anniversary"
    },
    {
      id: 4,
      name: "David R.",
      location: "San Diego, CA",
      rating: 5,
      review: "Outstanding value for money. The chef's performance was spectacular and the food was fresh and flavorful.",
      event: "Graduation Party"
    },
    {
      id: 5,
      name: "Lisa K.",
      location: "Austin, TX",
      rating: 5,
      review: "The best hibachi experience we've ever had! Fresh ingredients, amazing flavors, and the chef's entertainment skills were top-notch.",
      event: "Graduation Party"
    },
    {
      id: 6,
      name: "Robert C.",
      location: "Orlando, FL",
      rating: 5,
      review: "Incredible value for money. The food was restaurant-quality and the service was impeccable. Our guests are still talking about it!",
      event: "Birthday Party"
    }
  ];

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % reviews.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [reviews.length]);

  const renderStars = (rating) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % reviews.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  return (
    <section className="customer-reviews" id="reviews">
      <div className="reviews-container">
        <div className="reviews-header">
          <h2>Customer Reviews</h2>
          <p className="reviews-subtitle">See what our customers are saying about their Happy Hibachi experience</p>
        </div>
        
        <div className="reviews-slider">
          <div className="slider-container">
            <div 
              className="slider-track" 
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {reviews.map((review) => (
                <div key={review.id} className="review-slide">
                  <div className="review-content">
                    <div className="review-stars">{renderStars(review.rating)}</div>
                    <p className="review-text">"{review.review}"</p>
                    <div className="reviewer-info">
                      <span className="reviewer-name">{review.name}</span>
                      <span className="reviewer-location">{review.location}</span>
                      <span className="review-event">{review.event}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button className="slider-btn prev-btn" onClick={prevSlide}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="slider-btn next-btn" onClick={nextSlide}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="slider-dots">
          {reviews.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <div className="reviews-cta">
          <h3>Ready to Create Your Own Amazing Experience?</h3>
          <p>Join hundreds of satisfied customers who have made their events unforgettable with Happy Hibachi</p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={() => navigate('/book-now')}>Book Your Event</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerReviews; 