
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './Dashboard';
import EMIForm from './EMIForm';

function App() {
  return (
    <Router>
      <div>
        <nav style={{ padding: '10px', background: '#f0f0f0' }}>
          <Link to="/" style={{ marginRight: '10px' }}>Dashboard</Link>
          <Link to="/emi-reminder">AI Reminder (Test)</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/emi-reminder" element={<EMIForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
