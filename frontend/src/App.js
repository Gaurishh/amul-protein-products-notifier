import React from 'react';
import HomePage from './pages/HomePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PincodeManager from './components/PincodeManager';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/pincodes" element={<PincodeManager />} />
        <Route path="/unsubscribe" element={<HomePage unsubscribeMode={true} />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/edit-subscription" element={<HomePage editMode={true} />} />
        <Route path="/*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
