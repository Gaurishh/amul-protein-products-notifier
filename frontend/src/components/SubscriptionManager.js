import React, { useState, useEffect } from 'react';
import ProductSelector from './ProductSelector';
import UnsubscribeButton from './UnsubscribeButton';
import { updateUser, unsubscribeUser, getProducts } from '../api';

function SubscriptionManager({ email, user, onUpdate, onUnsubscribe, goToEmailPage, startEditing, onEditingMount }) {
  const [products, setProducts] = useState(user.products);
  const [editing, setEditing] = useState(!!startEditing);
  const [message, setMessage] = useState('');
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    getProducts().then(setProductList);
  }, []);

  // If startEditing prop changes from false to true, enter editing mode
  useEffect(() => {
    if (startEditing) {
      setEditing(true);
      if (onEditingMount) onEditingMount();
    }
  }, [startEditing, onEditingMount]);

  const handleSave = async () => {
    await updateUser(email, products);
    setMessage('Subscription updated!');
    setEditing(false);
    onUpdate();
  };

  const handleUnsubscribe = async () => {
    await unsubscribeUser(email);
    onUnsubscribe();
  };

  // Helper to get product name from productId
  const getProductName = (productId) => {
    const product = productList.find(p => p.productId === productId);
    return product ? product.name : productId;
  };

  if (editing) {
    return (
      <div>
        <h2>Update your subscription</h2>
        <ProductSelector selectedProducts={products} onChange={setProducts} />
        <div className="button-group">
          <button onClick={handleSave}>Save Changes</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Your Subscription</h2>
      <p><b>Email:</b> {email}</p>
      <p><b>Products:</b></p>
      <ul>
        {user.products.map((productId, idx) => (
          <li key={idx}>{getProductName(productId)}</li>
        ))}
      </ul>
      <div className="button-group">
        <button onClick={() => setEditing(true)}>Edit Subscription</button>
        <UnsubscribeButton onUnsubscribe={handleUnsubscribe} />
        <button onClick={goToEmailPage} style={{ background: '#4a5568', color: '#fff' }}>Back</button>
      </div>
      {message && <div style={{ color: 'green' }}>{message}</div>}
    </div>
  );
}

export default SubscriptionManager;
