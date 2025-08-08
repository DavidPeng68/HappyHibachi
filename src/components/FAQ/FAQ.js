import React, { useState } from 'react';
import './FAQ.css';

const FAQ = () => {
  const [openItem, setOpenItem] = useState(null);

  const faqItems = [
    {
      id: 1,
      question: "How much does your service cost?",
      answer: "Our service has a base price of $60 per person with a $600 minimum spend. Suggested gratuity is 20% of total bill. Travel fees may apply and will vary based on your location. These fees will be determined after booking. Cash or Credit Card (with a 4% admin fee) are the accepted payment methods. If paying with credit card, it must be done 72 hours prior to the event! You cannot pay at the end of the party with credit card - must be done 72 hours prior."
    },
    {
      id: 2,
      question: "What time will the chef arrive?",
      answer: "The chef will arrive approximately 10 minutes prior to reservation time. Our set up process is seamless and only takes a few minutes."
    },
    {
      id: 3,
      question: "Do you set up tables and chairs?",
      answer: "No we do not! We provide the chef, grill, food, sake and the best part - ENTERTAINMENT! Customers will provide utensils and table set ups. For more information on set ups please check out our Instagram @happyhibachi to see how other customers set up!"
    },
    {
      id: 4,
      question: "Do you cook inside homes?",
      answer: "We only cook on outside premises. Our experience is open to terraces, balconies, and under awnings. At this time we do not cook in any indoor premises. Although you can set your party up inside, the chef will cook outside! We are licensed and insured."
    },
    {
      id: 5,
      question: "Do you cook with nuts or sesame products?",
      answer: "No, our food does not contain any nuts or sesame products. Please notify the booking agent of any other food allergy a customer may have."
    },
    {
      id: 6,
      question: "Can you accommodate Gluten Free?",
      answer: "Yes we have serviced many gluten free customers. We ask that you bring your favorite gluten free soy sauce and teriyaki sauce for the chef to cook your portion separate!"
    },
    {
      id: 7,
      question: "What if someone does not eat meat?",
      answer: "We can provide tofu to meet Vegetarian and Vegan needs. The price per person does not change. We will supplement their dishes with additional food such as extra veggies, salad, and noodles."
    },
    {
      id: 8,
      question: "Can the customer provide their own proteins?",
      answer: "Due to insurance and pricing requirements, we do not cook any outside protein or food at this time."
    },
    {
      id: 9,
      question: "How can I make a reservation?",
      answer: "All of our bookings are currently done through our website. If you are going to be 30+ guests, please book two reservations for the same date and time, so we can send two chefs. There are no extra fees for an additional chef."
    },
    {
      id: 10,
      question: "What is your cancellation policy?",
      answer: "48 hours notice for all cancellations and rescheduled parties or guest will be charged a fee of $200.00. If it rains, customer is required to provide some type of covering for the chef to cook under so they can stay dry. We can cook under tents, and patios. Customer is responsible for canceling due to inclement weather within 48 hours of your party."
    }
  ];

  const toggleItem = (id) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">
        <div className="faq-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about our Happy Hibachi experience</p>
        </div>
        
        <div className="faq-list">
          {faqItems.map((item) => (
            <div key={item.id} className="faq-item">
              <button 
                className={`faq-question ${openItem === item.id ? 'active' : ''}`}
                onClick={() => toggleItem(item.id)}
              >
                <span>{item.question}</span>
                <svg 
                  className={`faq-icon ${openItem === item.id ? 'rotated' : ''}`}
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none"
                >
                  <path 
                    d="M6 9L12 15L18 9" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className={`faq-answer ${openItem === item.id ? 'open' : ''}`}>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="faq-cta">
          <h3>Still have questions?</h3>
          <p>Contact us directly and we'll be happy to help!</p>
          <div className="faq-contact-info">
            <div className="contact-item">
              <span className="contact-label">Phone:</span>
              <span className="contact-value">909-615-6633</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Email:</span>
              <span className="contact-value">happyhibachi@gmail.com</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Response Time:</span>
              <span className="contact-value">Within 2 hours</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ; 