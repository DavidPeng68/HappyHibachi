import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Booking.css';

const Booking = () => {
  const navigate = useNavigate();

  const handleBookCalifornia = () => {
    navigate('/book-now#california');
  };

  const handleBookTexas = () => {
    navigate('/book-now#texas');
  };

  const handleBookFlorida = () => {
    navigate('/book-now#florida');
  };

  return (
    <section className="booking">
      <h2>Book Your Party</h2>
      <h3>Select Your Region To Start</h3>
      
      <div className="regions">
        <div className="region">
          <h4>CALIFORNIA</h4>
          <p>Los Angeles, Orange County, San Francisco, San Diego, San Jose, Sacramento, Palm Springs, Lake Tahoe, Bay Area, Central Valley, Inland Empire, Ventura County, Santa Barbara, Monterey, Fresno, Bakersfield</p>
          <button className="btn-primary" onClick={handleBookCalifornia}>Book California</button>
        </div>

        <div className="region">
          <h4>TEXAS</h4>
          <p>Houston, Dallas, Fort Worth, Austin, San Antonio, Arlington, Plano, Irving, Corpus Christi, Lubbock, El Paso, Amarillo, Waco, College Station, Galveston, Beaumont</p>
          <button className="btn-primary" onClick={handleBookTexas}>Book Texas</button>
        </div>

        <div className="region">
          <h4>FLORIDA</h4>
          <p>Miami, Miami Beach, Fort Lauderdale, Hollywood, Coral Gables, Doral, Hialeah, Aventura, Sunny Isles, North Miami, South Miami, Kendall, Homestead, Key West, Boca Raton, West Palm Beach</p>
          <button className="btn-primary" onClick={handleBookFlorida}>Book Florida</button>
        </div>
      </div>
    </section>
  );
};

export default Booking; 