import React, { useState, useEffect } from 'react';
import { getPincodes, deletePincode, addPincode, verifyPincodePassword } from '../api.js';

function PincodeManager() {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingPincode, setDeletingPincode] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newPincode, setNewPincode] = useState('');
  const [newState, setNewState] = useState('');
  const [addingPincode, setAddingPincode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchPincodes();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await verifyPincodePassword(password);
      if (response.success) {
        setIsAuthenticated(true);
        setPasswordError('');
        setPassword('');
      } else {
        setPasswordError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setPasswordError('Error verifying password. Please try again.');
      setPassword('');
    }
  };

  const fetchPincodes = async () => {
    try {
      setLoading(true);
      const response = await getPincodes();
      if (response.success) {
        setPincodes(response.pincodes);
      } else {
        setError('Failed to fetch pincodes');
      }
    } catch (err) {
      setError('Error fetching pincodes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePincode = async (pincodeToDelete) => {
    if (!window.confirm(`Are you sure you want to delete pincode ${pincodeToDelete}?`)) {
      return;
    }

    try {
      setDeletingPincode(pincodeToDelete);
      const response = await deletePincode(pincodeToDelete);

      if (response.success) {
        // Remove the deleted pincode from the local state
        setPincodes(prevPincodes => prevPincodes.filter(p => p.pincode !== pincodeToDelete));
        setError(''); // Clear any previous errors
      } else {
        setError(response.error || 'Failed to delete pincode');
      }
    } catch (err) {
      setError('Error deleting pincode: ' + err.message);
    } finally {
      setDeletingPincode(null);
    }
  };

  const handleAddPincode = async (e) => {
    e.preventDefault();
    if (!newPincode.trim() || !/^\d{6}$/.test(newPincode.trim())) {
      return;
    }

    if (!newState.trim()) {
      setError('Please enter a state name');
      return;
    }

    try {
      setAddingPincode(true);
      setError('');
      const response = await addPincode(newPincode.trim(), newState.trim());

      if (response.success) {
        setShowModal(false);
        setNewPincode('');
        setNewState('');
        fetchPincodes(); // Refresh the list
      } else {
        setError(response.error || 'Failed to add pincode');
      }
    } catch (err) {
      setError('Error adding pincode: ' + err.message);
    } finally {
      setAddingPincode(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setNewPincode('');
    setNewState('');
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setNewPincode('');
    setNewState('');
    setError('');
  };

  const goToHomePage = () => {
    window.location.href = '/';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isValidPincode = (pincode) => {
    return /^\d{6}$/.test(pincode.trim());
  };

  return (
    <div className="app-container">
      <div className="logo-title-row">
        <img src="/amul-logo.png" alt="Amul Logo" className="amul-logo" onClick={goToHomePage} style={{ cursor: 'pointer' }} />
        <h1 onClick={goToHomePage} style={{ cursor: 'pointer' }}>Pincode Manager</h1>
      </div>

      {!isAuthenticated ? (
        // Password Screen
        <div className="confirmation-screen">
          <h2>Enter Password</h2>
          <p>Please enter the password to access the Pincode Manager</p>
          
          <form onSubmit={handlePasswordSubmit} style={{ marginTop: '1rem' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '12px',
                border: passwordError ? '1px solid #e53e3e' : '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '1rem',
                marginBottom: '1rem',
                boxSizing: 'border-box'
              }}
            />
            
            {passwordError && (
              <div style={{ 
                color: '#e53e3e', 
                marginBottom: '1rem', 
                fontSize: '0.9rem'
              }}>
                {passwordError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={!password.trim()}
              style={{
                background: '#3182ce',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: password.trim() ? 'pointer' : 'not-allowed',
                opacity: password.trim() ? 1 : 0.6,
                transition: 'all 0.2s ease',
                marginLeft: '12px'
              }}
              onMouseEnter={(e) => {
                if (password.trim()) {
                  e.target.style.background = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (password.trim()) {
                  e.target.style.background = '#3182ce';
                }
              }}
            >
              Submit
            </button>
          </form>
        </div>
      ) : (
        // Main Content (existing code)
        <>
          {loading && (
            <div className="confirmation-screen">
              <p>Loading pincodes...</p>
              <div style={{ marginTop: '1.5em' }}>
                <span className="spinner"></span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#e53e3e', marginBottom: '1rem', padding: '8px', backgroundColor: '#fff5f5', borderRadius: '4px' }}>
              {error}
            </div>
          )}

          {!loading && !error && (
            <div>
              <h2>Current Pincodes ({pincodes.length})</h2>

              {pincodes.length === 0 ? (
                <div className="confirmation-screen">
                  <p>No pincodes found.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {pincodes.map((pincode) => (
                    <div
                      key={pincode.pincode}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#2d3748' }}>
                            {pincode.pincode}
                          </h3>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#4a5568', fontWeight: '500' }}>
                            {pincode.state}
                          </p>
                          <p style={{ margin: '0', fontSize: '0.9rem', color: '#718096' }}>
                            Last interacted: {formatDate(pincode.lastInteracted)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePincode(pincode.pincode)}
                          disabled={deletingPincode === pincode.pincode}
                          style={{
                            background: 'transparent',
                            color: '#a0aec0',
                            border: '1px solid #e2e8f0',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: deletingPincode === pincode.pincode ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            opacity: deletingPincode === pincode.pincode ? 0.6 : 1,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px',
                            minHeight: '32px'
                          }}
                          title="Delete pincode"
                          onMouseEnter={(e) => {
                            if (deletingPincode !== pincode.pincode) {
                              e.target.style.background = '#f7fafc';
                              e.target.style.borderColor = '#cbd5e1';
                              e.target.style.color = '#718096';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (deletingPincode !== pincode.pincode) {
                              e.target.style.background = 'transparent';
                              e.target.style.borderColor = '#e2e8f0';
                              e.target.style.color = '#a0aec0';
                            }
                          }}
                        >
                          {deletingPincode === pincode.pincode ? (
                            <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Pincode Button */}
              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    onClick={openModal}
                    style={{
                      background: '#3182ce',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                    onMouseLeave={(e) => e.target.style.background = '#3182ce'}
                  >
                    + Add Pincode
                  </button>

                  <button
                    onClick={goToHomePage}
                    style={{
                      background: '#4a5568',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#2d3748'}
                    onMouseLeave={(e) => e.target.style.background = '#4a5568'}
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Pincode Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              maxWidth: '400px',
              width: '90%',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#2d3748' }}>Add New Pincode & State</h3>

            <form onSubmit={handleAddPincode}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
                Pincode (6 digits):
              </label>
              <input
                type="text"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                placeholder="e.g., 122003"
                maxLength="6"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  marginBottom: '1.5rem',
                  boxSizing: 'border-box'
                }}
              />

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
                State:
              </label>
              <input
                type="text"
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                placeholder="e.g., New Delhi"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  marginBottom: '1.5rem',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: '#4a5568',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Back
                </button>

                {isValidPincode(newPincode) && newState.trim() && (
                  <button
                    type="submit"
                    disabled={addingPincode}
                    style={{
                      background: '#3182ce',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: addingPincode ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      opacity: addingPincode ? 0.6 : 1
                    }}
                  >
                    {addingPincode ? 'Adding...' : 'Submit'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PincodeManager;
