import React, { useState, useEffect } from 'react';
import ProductSelector from './ProductSelector';
import UnsubscribeButton from './UnsubscribeButton';
import { updateUser, unsubscribeUser, getProducts, editSubscriptionByToken } from '../api';

function SubscriptionManager({ email, user, onUpdate, onUnsubscribe, goToEmailPage, startEditing, onEditingMount, token }) {
  const [products, setProducts] = useState(user.products);
  const [city, setCity] = useState(getCityFromPincode(user.pincode) || '');
  const [editing, setEditing] = useState(!!startEditing);
  const [message, setMessage] = useState('');
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(false);

  // City to pincode mapping
  const cityPincodeMap = {
    'Delhi': '110036',
    'Haryana': '122003',
    'Karnataka': '560001'
  };

  // Helper function to get city from pincode
  function getCityFromPincode(pincode) {
    if (!pincode) return '';
    const pincodeToCity = {
      '110036': 'Delhi',
      '122003': 'Haryana',
      '560001': 'Karnataka'
    };
    return pincodeToCity[pincode] || '';
  }

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

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  const handleSave = async () => {
    setLoading(true);
    
    if (!city) {
      setLoading(false);
      return;
    }
    
    const pincodeToSend = cityPincodeMap[city];
    
         try {
       // Use token-based API if token is provided, otherwise use email-based API
       if (token) {
         await editSubscriptionByToken(token, products, pincodeToSend);
       } else {
         await updateUser(email, products, pincodeToSend);
       }
      
             setEditing(false);
       onUpdate();
    } catch (error) {
      console.error('Error updating subscription:', error);
      setMessage('Error updating subscription. Please try again.');
    } finally {
      setLoading(false);
    }
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
          City:
          <select
            value={city}
            onChange={handleCityChange}
            style={{ marginTop: 8, marginBottom: 8, width: '100%', padding: '8px' }}
          >
            <option value="">Choose a city</option>
                          <option value="Delhi">Delhi</option>
              <option value="Haryana">Haryana</option>
              <option value="Karnataka">Karnataka</option>
          </select>
        </label>
        <div className="button-group">
          <button onClick={handleSave} disabled={loading || !city}>Save Changes</button>
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
      <p><b>City:</b> {getCityFromPincode(user.pincode) || 'Unknown'}</p>
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
