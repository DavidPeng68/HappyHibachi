import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Navigation, Footer } from './components';
import { HomePage, FreeEstimate, BookNow, TestPage, AdminDashboard } from './pages';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/free-estimate" element={<FreeEstimate />} />
          <Route path="/book-now" element={<BookNow />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
