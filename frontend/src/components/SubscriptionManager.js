import React, { useState, useEffect } from 'react';
import ProductSelector from './ProductSelector';
import UnsubscribeButton from './UnsubscribeButton';
import { updateUser, unsubscribeUser, getProducts } from '../api';

function SubscriptionManager({ email, user, onUpdate, onUnsubscribe, goToEmailPage, startEditing, onEditingMount }) {
  const [products, setProducts] = useState(user.products);
  const [pincode, setPincode] = useState(user.pincode || '');
  const [editing, setEditing] = useState(!!startEditing);
  const [message, setMessage] = useState('');
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    await updateUser(email, products, pincode);
    setMessage('Subscription updated!');
    setEditing(false);
    setLoading(false);
    onUpdate();
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    await unsubscribeUser(email);
    setLoading(false);
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
        <label>
          Pincode:
          <input
            type="text"
            value={pincode}
            required
            pattern="\\d{6}"
            title="Please enter a valid 6-digit pincode"
            onChange={e => setPincode(e.target.value)}
          />
        </label>
        <div className="button-group">
          <button onClick={handleSave} disabled={loading}>Save Changes</button>
          <button onClick={() => setEditing(false)} disabled={loading}>Cancel</button>
          {loading && <span className="spinner" style={{ marginLeft: 10 }}></span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Your Subscription</h2>
      <p><b>Email:</b> {email}</p>
      <p><b>Pincode:</b> {user.pincode}</p>
      <p><b>Products:</b></p>
      {Object.entries(categorizeProducts(user.products)).map(([cat, items]) =>
        items.length > 0 && (
          <div key={cat} style={{ marginBottom: 12 }}>
            <h4 style={{ marginBottom: 6 }}>{cat}</h4>
            <ul>
              {items.map((productId, idx) => (
                <li key={idx}>{getProductName(productId)}</li>
              ))}
            </ul>
          </div>
        )
      )}
      <div className="button-group">
        <button onClick={() => setEditing(true)} disabled={loading}>Edit Subscription</button>
        <UnsubscribeButton onUnsubscribe={handleUnsubscribe} disabled={loading} />
        <button onClick={goToEmailPage} style={{ background: '#4a5568', color: '#fff' }} disabled={loading}>Back</button>
        {loading && <span className="spinner" style={{ marginLeft: 10 }}></span>}
      </div>
      {message && <div style={{ color: 'green' }}>{message}</div>}
    </div>
  );
}

// Helper to categorize products (reuse from previous code)
function categorizeProducts(productIds) {
  const categories = {
    'Milkshakes': [],
    'Paneer': [],
    'Whey Protein': [],
    'Lassi': [],
    'Buttermilk': [],
    'Milk': [],
    'Other': []
  };
  productIds.forEach(productId => {
    const name = productId.toLowerCase();
    if (name.includes('milkshake')) categories['Milkshakes'].push(productId);
    else if (name.includes('paneer')) categories['Paneer'].push(productId);
    else if (name.includes('whey')) categories['Whey Protein'].push(productId);
    else if (name.includes('lassi')) categories['Lassi'].push(productId);
    else if (name.includes('buttermilk')) categories['Buttermilk'].push(productId);
    else if (name.match(/\bmilk\b/)) categories['Milk'].push(productId);
    else categories['Other'].push(productId);
  });
  return categories;
}

export default SubscriptionManager;
