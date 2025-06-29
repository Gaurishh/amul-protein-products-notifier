import React, { useState } from 'react';
import EmailForm from '../components/EmailForm';
import ProductSelector from '../components/ProductSelector';
import SubscriptionManager from '../components/SubscriptionManager';
import { checkUser, subscribeUser, unsubscribeUser } from '../api';

function HomePage() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [forceEdit, setForceEdit] = useState(false);

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
    if (!email || products.length === 0) {
      setMessage('Please fill all fields and select at least one product.');
      return;
    }
    await subscribeUser(email, products);
    const userData = await checkUser(email);
    setUser(userData);
    setMessage('Subscription saved! You will be notified when products are restocked.');
    setStep('done');
  };

  const handleUpdate = async () => {
    // Refresh user data after update
    const userData = await checkUser(email);
    setUser(userData);
  };

  const handleUnsubscribe = async () => {
    if (email) {
      await unsubscribeUser(email);
    }
    setMessage('You have been unsubscribed. You will no longer receive notifications.');
    setStep('unsubscribed');
    setEmail('');
    setUser(null);
    setProducts([]);
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
      {step === 'email' && (
        <EmailForm onSubmit={handleEmailSubmit} />
      )}
      {step === 'products' && (
        <div>
          <ProductSelector selectedProducts={products} onChange={handleProductSelect} />
          <button onClick={handleSubscribe} style={{ marginTop: 10 }}>
            Subscribe
          </button>
        </div>
      )}
      {step === 'manage' && user && (
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
      {step === 'done' && (
        <div className="confirmation-screen">
          <p>{message}</p>
          {user && email && (
            <div className="button-group" style={{ marginTop: '1.5em' }}>
              <button onClick={() => { setStep('manage'); setForceEdit(true); setMessage(''); }}>Edit Subscription</button>
              <button className="UnsubscribeButton" onClick={handleUnsubscribe}>Unsubscribe</button>
            </div>
          )}
        </div>
      )}
      {step === 'unsubscribed' && (
        <div className="confirmation-screen">
          <p>{message}</p>
          <div className="button-group" style={{ marginTop: '1.5em' }}>
            <button onClick={goToEmailPage}>Resubscribe</button>
          </div>
        </div>
      )}
      {message && step !== 'done' && step !== 'unsubscribed' && <div style={{ color: 'green', marginTop: 10 }}>{message}</div>}
    </div>
  );
}

export default HomePage;