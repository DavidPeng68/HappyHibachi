import React from 'react';
import './MenuPricing.css';

const MenuPricing = () => {
  return (
    <section className="menu-pricing" id="menu">
      <h2>Pricing & Service</h2>
      <div className="pricing-container">
        <div className="pricing-section main-pricing">
          <h3>Pricing</h3>
          <div className="pricing-highlight">
            <div className="main-price">
              <span className="price-amount">$60.00</span>
              <span className="price-unit">Per person</span>
            </div>
            <div className="minimum-order">
              <span className="minimum-amount">$600 Minimum</span>
              <span className="minimum-text">for all parties</span>
            </div>
          </div>
          <p className="kids-pricing">$30.00 Per child 12 and under</p>
          <p className="cooking-note"><strong>We cook outside only.</strong></p>
          <p className="weather-note">We provide services rain or shine, as long as there is a dry area for the chef to cook under.</p>
        </div>

        <div className="pricing-section">
          <h3>Protein Choices</h3>
          <p className="protein-subtitle">2 Per Person</p>
          <div className="protein-options">
            <p><strong>Chicken · Steak · Shrimp · Scallops · Salmon · Tofu</strong></p>
            <p className="upgrade-options">Upgrade proteins: <strong>Filet Mignon $5 · Lobster $10</strong></p>
          </div>
          <div className="included-items">
            <p><strong>Includes:</strong> Salad, Fried Rice, and Vegetables</p>
            <p><strong>Add-ons:</strong> Gyoza (12pcs) $15 · Edamame $10</p>
            <p><strong>3rd Protein $10 · Filet $15 · Lobster $20</strong></p>
            <p><strong>NOODLES AVAILABLE $5 PER ORDER</strong></p>
          </div>
        </div>

        <div className="pricing-section">
          <h3>Game & Show</h3>
          <p>Egg toss, grill tricks, catching carrots, drinking games and more!</p>
        </div>

        <div className="pricing-section">
          <h3>Coupon</h3>
          <ul>
            <li>$30 for under 15 people</li>
            <li>$60 for 15-25 people</li>
            <li>$90 for 25-35 people</li>
            <li>$120 for 35+ people</li>
          </ul>
          <p>Get $30 food Coupons for every 10 guests! Available for Sunday-Friday parties</p>
          <p>Email us now to get coupon!</p>
        </div>

        <div className="pricing-section">
          <h3>Food Options</h3>
          <div className="food-options">
            <div>
              <h4>Appetizers:</h4>
              <p>Salad($5), gyoza (6pcs/person)($10), edamame($5), noodles($5)</p>
            </div>
            <div>
              <h4>Protein:</h4>
              <p>Chicken, NY steak, shrimp, scallops, tofu</p>
            </div>
            <div>
              <h4>Upgrade Proteins:</h4>
              <p>Organic Chicken($5), premium Ribeye Steak($10), premium jumbo shrimp($10), Wild Alaska Salmon($10), premium large scallops($10), Premium Filet Mignon($5), wild-caught Lobster($10)</p>
            </div>
            <div>
              <h4>3rd Protein($10):</h4>
              <p>(Chicken, steak, shrimp, scallops), Filet($15), Lobster($20)</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MenuPricing; 