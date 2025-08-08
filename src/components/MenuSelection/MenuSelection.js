import React from 'react';
import './MenuSelection.css';

const MenuSelection = () => {
  return (
    <section className="menu-selection">
      <h2>START BY SELECT YOUR DISH TYPE</h2>
      <p>ALL COURSE MEALS ARE SERVED WITH STEAMED RICE, HIBACHI VEGETABLES, AND OUR SIGNATURE SAUCES</p>
      
      <div className="menu-options">
        <div className="menu-option">
          <h3>REGULAR</h3>
          <p>2 protein/person: choosing from chicken, steak, shrimp, scallops, tofu</p>
          <p>Game & show included & service time 90min</p>
          <p className="price">$60/person</p>
        </div>

        <div className="menu-option">
          <h3>PREMIUM</h3>
          <p>2 upgrade protein/person: Premium (Chicken, steak, shrimp, scallops), Filet Mignon, Lobster</p>
          <p>Game & show included & service time 120min</p>
          <p className="price">$80/person</p>
        </div>

        <div className="menu-option">
          <h3>LARGE GATHERING CATERING</h3>
          <p>(50+ people buffet)</p>
          <p>2 protein/person: choosing from chicken, steak, shrimp, scallops, tofu</p>
          <p>Games & shows & service time 3-4 hours</p>
          <p className="price">$45/person</p>
        </div>

        <div className="menu-option">
          <h3>INTIMATE PARTY (5~7 people)</h3>
          <p>5 salads, 1 gyoza, 1 edamame, 1 noodles</p>
          <p>Protein: 1 chicken/person, 3 steak, 1 filet, 2 shrimp, 1 lobster, 1 salmon, 2 tofu</p>
          <p>Note: Protein of the same price can be substituted.</p>
          <p className="price">$600 Total</p>
        </div>
      </div>
    </section>
  );
};

export default MenuSelection; 