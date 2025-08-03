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
  const [pincodeError, setPincodeError] = useState('');

  // Valid Gurgaon pincodes
  const validPincodes = [
    "110036", "122001", "122002", "122003", "122004", "122005", "122006", "122007", "122008", "122009", "122010", "122011", "122015", "122016", "122017", "122018", "122051", "122052", "122101", "122102", "122103", "122104", "122105", "122107", "122108", "122413", "122414", "122502", "122503", "122504", "122505", "122506", "122508", "123106", "123401"
  ];

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

  const validatePincode = (pincode) => {
    if (!pincode) {
      setPincodeError('');
      return false;
    }
    if (!validPincodes.includes(pincode)) {
      setPincodeError('Service is only available in Gurgaon. Please enter a valid Gurgaon pincode.');
      return false;
    }
    setPincodeError('');
    return true;
  };

  const handlePincodeChange = (e) => {
    const newPincode = e.target.value;
    setPincode(newPincode);
    validatePincode(newPincode);
  };

  const handleSave = async () => {
    setLoading(true);
    
    // Validate pincode before saving
    if (!validatePincode(pincode)) {
      setLoading(false);
      return;
    }
    
    // Send 110036 for actual 110036, but 122003 for all other pincodes
    const pincodeToSend = pincode === "110036" ? "110036" : "122003";
    
    await updateUser(email, products, pincodeToSend);
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
            placeholder="Enter your 6-digit pincode"
            onChange={handlePincodeChange}
          />
        </label>
        {pincodeError && (
          <div style={{ color: 'red', marginTop: 8, fontSize: '14px' }}>
            {pincodeError}
          </div>
        )}
        <div className="button-group">
          <button onClick={handleSave} disabled={loading || pincodeError}>Save Changes</button>
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
        {/* Removed Edit Subscription and Unsubscribe buttons */}
        <button onClick={goToEmailPage} style={{ background: '#4a5568', color: '#fff' }} disabled={loading}>Back</button>
        {loading && <span className="spinner" style={{ marginLeft: 10 }}></span>}
      </div>
      <div style={{ marginTop: 18, color: '#555', fontSize: '0.98em' }}>
        <b>Note:</b> You may edit or unsubscribe from your subscription by clicking the links provided in the emails you receive from us.
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
