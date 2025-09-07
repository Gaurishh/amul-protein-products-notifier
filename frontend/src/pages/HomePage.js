import React, { useState, useEffect } from 'react';
import EmailForm from '../components/EmailForm';
import ProductSelector from '../components/ProductSelector';
import SubscriptionManager from '../components/SubscriptionManager';
import { checkUser, subscribeUser, unsubscribeUser, verifyPincode, trackPincode, checkUserByToken, unsubscribeUserByToken, getPincodes } from '../api';
import { useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function HomePage({ unsubscribeMode, editMode }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [forceEdit, setForceEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const query = useQuery();

  // Dynamic city to pincode mapping from backend
  const [cityPincodeMap, setCityPincodeMap] = useState({});
  const [pincodesLoading, setPincodesLoading] = useState(false);

  // Fetch pincodes from backend when component mounts
  useEffect(() => {
    const fetchPincodes = async () => {
      try {
        setPincodesLoading(true);
        const response = await getPincodes();
        if (response.success) {
          // Convert pincodes array to city-pincode mapping
          const pincodeMap = {};
          response.pincodes.forEach(pincode => {
            pincodeMap[pincode.state] = pincode.pincode;
          });
          setCityPincodeMap(pincodeMap);
        } else {
          console.error('Failed to fetch pincodes:', response.error);
        }
      } catch (error) {
        console.error('Error fetching pincodes:', error);
      } finally {
        setPincodesLoading(false);
      }
    };

    fetchPincodes();
  }, []);

  // Auto-unsubscribe if in unsubscribeMode and token param is present
  useEffect(() => {
    if (unsubscribeMode) {
      const tokenParam = query.get('token');
      if (tokenParam) {
        setUnsubscribeLoading(true);
        (async () => {
          await unsubscribeUserByToken(tokenParam);
          setMessage('You have been unsubscribed. You will no longer receive notifications.');
          setStep('unsubscribed');
          setUnsubscribeLoading(false);
        })();
      }
    }
  }, [unsubscribeMode, query]);

  useEffect(() => {
    if (editMode) {
      const tokenParam = query.get('token');
      if (tokenParam) {
        setEditLoading(true);
        (async () => {
          const userData = await checkUserByToken(tokenParam);
          if (userData) {
            setUser(userData);
            setStep('manage');
            setForceEdit(true);
          } else {
            setStep('email');
            setMessage('No subscription found for this link.');
          }
          setEditLoading(false);
        })();
      }
    }
  }, [editMode, query]);

  const handleEmailSubmit = async ({ email: emailInput }) => {
    setEmail(emailInput);
    const userData = await checkUser(emailInput);
    if (userData) {
      setUser(userData);
      setStep('manage');
    } else {
      setStep('pincode');
    }
  };

  const handleProductSelect = (selectedProducts) => {
    setProducts(selectedProducts);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    if (!email || !products.length || !city) {
      setMessage('Please fill all fields and select at least one product.');
      setLoading(false);
      return;
    }
    
    const pincodeToSend = cityPincodeMap[city];
    
    await subscribeUser(email, products, pincodeToSend);
    const userData = await checkUser(email);
    setUser(userData);
    setMessage('Subscription saved! You will be notified when products are restocked.');
    setStep('done');
    setLoading(false);
  };

  const handleUpdate = async () => {
    try {
      if (user && user.email) {
        const userData = await checkUser(user.email);
        setUser(userData);
        setMessage('Subscription updated successfully!');
      } else if (editMode && query.get('token')) {
        const userData = await checkUserByToken(query.get('token'));
        setUser(userData);
        setMessage('Subscription updated successfully!');
      } else if (email) {
        const userData = await checkUser(email);
        setUser(userData);
        setMessage('Subscription updated successfully!');
      } else {
        setMessage('Subscription updated successfully! Please refresh to see changes.');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setMessage('Subscription updated successfully! Please refresh to see changes.');
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    if (email) {
      await unsubscribeUser(email);
    }
    setMessage('You have been unsubscribed. You will no longer receive notifications.');
    setStep('unsubscribed');
    setEmail('');
    setUser(null);
    setProducts([]);
    setLoading(false);
  };

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  const goToEmailPage = () => {
    setStep('email');
    setEmail('');
    setUser(null);
    setProducts([]);
    setMessage('');
    setCity('');
  };

  return (
    <div className="app-container">
      <div className="logo-title-row">
        <img src="/amul-logo.png" alt="Amul Logo" className="amul-logo" onClick={goToEmailPage} style={{ cursor: 'pointer' }} />
        <h1 onClick={goToEmailPage} style={{ cursor: 'pointer' }}>Amul Protein Products Notifier</h1>
      </div>
      {unsubscribeLoading && (
        <div className="confirmation-screen">
          <p>Unsubscribing you from notifications...</p>
          <div style={{ marginTop: '1.5em' }}>
            <span className="spinner"></span>
          </div>
        </div>
      )}
      {editLoading && (
        <div className="confirmation-screen">
          <p>Loading your subscription...</p>
          <div style={{ marginTop: '1.5em' }}>
            <span className="spinner"></span>
          </div>
        </div>
      )}
      {!unsubscribeLoading && !editLoading && step === 'email' && (
        <EmailForm onSubmit={handleEmailSubmit} />
      )}
      {!unsubscribeLoading && !editLoading && step === 'pincode' && (
        <div>
          <label>
            Select your city:
            {pincodesLoading ? (
              <div style={{ marginTop: 8, marginBottom: 8, padding: '8px', color: '#666' }}>
                Loading cities... <span className="spinner" style={{ marginLeft: 8 }}></span>
              </div>
            ) : Object.keys(cityPincodeMap).length === 0 ? (
              <div style={{ marginTop: 8, marginBottom: 8, padding: '8px', color: '#e53e3e' }}>
                No cities available. Please contact support.
              </div>
            ) : (
              <select
                value={city}
                onChange={handleCityChange}
                style={{ marginTop: 8, marginBottom: 8, width: '100%', padding: '8px' }}
              >
                <option value="">Choose a city</option>
                {Object.keys(cityPincodeMap).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            )}
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {city && Object.keys(cityPincodeMap).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStep('products');
                }}
                style={{
                  marginBottom: 12,
                  opacity: 1,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                Next
              </button>
            )}
            <button
              type="button"
              onClick={goToEmailPage}
              style={{
                marginBottom: 12,
                background: '#4a5568',
                color: '#fff',
                opacity: 1,
                pointerEvents: 'auto',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
      {!unsubscribeLoading && !editLoading && step === 'products' && (
        <div>
          <ProductSelector 
            selectedProducts={products} 
            onChange={handleProductSelect} 
            pincode={cityPincodeMap[city]} 
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button onClick={handleSubscribe} disabled={loading}>
              Subscribe
            </button>
            <button
              type="button"
              onClick={() => setStep('pincode')}
              style={{
                background: '#4a5568',
                color: '#fff',
                opacity: 1,
                pointerEvents: 'auto',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              Back
            </button>
            {loading && <span className="spinner" style={{ marginLeft: 10 }}></span>}
          </div>
        </div>
      )}
      {!unsubscribeLoading && !editLoading && step === 'manage' && user && (
        <SubscriptionManager
          email={email}
          user={user}
          onUpdate={handleUpdate}
          onUnsubscribe={handleUnsubscribe}
          goToEmailPage={goToEmailPage}
          startEditing={forceEdit}
          onEditingMount={() => setForceEdit(false)}
          token={editMode ? query.get('token') : null}
        />
      )}
      {!unsubscribeLoading && !editLoading && step === 'done' && (
        <div className="confirmation-screen">
          <p>{message}</p>
          {user && email && (
            <div className="button-group" style={{ marginTop: '1.5em' }}>
              <button className="UnsubscribeButton" onClick={handleUnsubscribe} disabled={loading}>Unsubscribe</button>
              {loading && <span className="spinner" style={{ marginLeft: 10 }}></span>}
            </div>
          )}
        </div>
      )}
      {!unsubscribeLoading && !editLoading && step === 'unsubscribed' && (
        <div className="confirmation-screen">
          <p>{message}</p>
          <div className="button-group" style={{ marginTop: '1.5em' }}>
            <button onClick={goToEmailPage}>Resubscribe</button>
          </div>
        </div>
      )}
      {!unsubscribeLoading && !editLoading && message && step !== 'done' && step !== 'unsubscribed' && <div style={{ color: 'green', marginTop: 10 }}>{message}</div>}
    </div>
  );
}

export default HomePage;