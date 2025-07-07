import React from 'react';
import HomePage from './pages/HomePage';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/unsubscribe" element={<HomePage unsubscribeMode={true} />} />
        <Route path="/edit-subscription" element={<HomePage editMode={true} />} />
        <Route path="/*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
