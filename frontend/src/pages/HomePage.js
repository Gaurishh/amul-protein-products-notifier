import React, { useState, useEffect } from 'react';
import EmailForm from '../components/EmailForm';
import ProductSelector from '../components/ProductSelector';
import SubscriptionManager from '../components/SubscriptionManager';
import { checkUser, subscribeUser, unsubscribeUser } from '../api';
import { useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function HomePage({ unsubscribeMode, editMode }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [forceEdit, setForceEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const query = useQuery();

  // Auto-unsubscribe if in unsubscribeMode and email param is present
  useEffect(() => {
    if (unsubscribeMode) {
      const emailParam = query.get('email');
      if (emailParam) {
        setEmail(emailParam);
        setUnsubscribeLoading(true);
        (async () => {
          await unsubscribeUser(emailParam);
          setMessage('You have been unsubscribed. You will no longer receive notifications.');
          setStep('unsubscribed');
          setUnsubscribeLoading(false);
        })();
      }
    }
  }, [unsubscribeMode, query]);

  useEffect(() => {
    if (editMode) {
      const emailParam = query.get('email');
      if (emailParam) {
        setEmail(emailParam);
        setEditLoading(true);
        (async () => {
          const userData = await checkUser(emailParam);
          if (userData) {
            setUser(userData);
            setStep('manage');
            setForceEdit(true);
          } else {
            setStep('email');
            setMessage('No subscription found for this email.');
          }
          setEditLoading(false);
        })();
      }
    }
  }, [editMode, query]);

  const handleEmailSubmit = async (emailInput) => {
    setEmail(emailInput);
    const userData = await checkUser(emailInput);
    if (userData) {
      setUser(userData);
      setStep('manage');
    } else {
      setStep('products');
    }
  };

  const handleProductSelect = (selectedProducts) => {
    setProducts(selectedProducts);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    if (!email || products.length === 0) {
      setMessage('Please fill all fields and select at least one product.');
      setLoading(false);
      return;
    }
    await subscribeUser(email, products);
    const userData = await checkUser(email);
    setUser(userData);
    setMessage('Subscription saved! You will be notified when products are restocked.');
    setStep('done');
    setLoading(false);
  };

  const handleUpdate = async () => {
    // Refresh user data after update
    const userData = await checkUser(email);
    setUser(userData);
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

  const goToEmailPage = () => {
    setStep('email');
    setEmail('');
    setUser(null);
    setProducts([]);
    setMessage('');
  };

  return (
    <div className="app-container">
      <div className="logo-title-row">
        <img src="/amul-logo.png" alt="Amul Logo" className="amul-logo" onClick={goToEmailPage} style={{ cursor: 'pointer' }} />
        <h1 onClick={goToEmailPage} style={{ cursor: 'pointer' }}>Amul Protein Products Restock Notifier</h1>
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
      {!unsubscribeLoading && !editLoading && step === 'products' && (
        <div>
          <ProductSelector selectedProducts={products} onChange={handleProductSelect} />
          <button onClick={handleSubscribe} style={{ marginTop: 10 }} disabled={loading}>
            Subscribe
          </button>
          {loading && <span className="spinner" style={{ marginLeft: 10 }}></span>}
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
        />
      )}
      {!unsubscribeLoading && !editLoading && step === 'done' && (
        <div className="confirmation-screen">
          <p>{message}</p>
          {user && email && (
            <div className="button-group" style={{ marginTop: '1.5em' }}>
              <button onClick={() => { setStep('manage'); setForceEdit(true); setMessage(''); }}>Edit Subscription</button>
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