import React, { useState, useEffect } from 'react';
import ProductSelector from './ProductSelector';
import UnsubscribeButton from './UnsubscribeButton';
import { updateUser, unsubscribeUser, getProducts, editSubscriptionByToken, getPincodes } from '../api';

function SubscriptionManager({ email, user, onUpdate, onUnsubscribe, goToEmailPage, startEditing, onEditingMount, token }) {
  const [products, setProducts] = useState(user.products);
  const [city, setCity] = useState('');
  const [editing, setEditing] = useState(!!startEditing);
  const [message, setMessage] = useState('');
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
          
          // Set the current city based on user's pincode
          const currentCity = getCityFromPincode(user.pincode, pincodeMap);
          setCity(currentCity);
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
  }, [user.pincode]);

  // Helper function to get city from pincode using dynamic mapping
  function getCityFromPincode(pincode, pincodeMap = cityPincodeMap) {
    if (!pincode || !pincodeMap) return '';
    const pincodeToCity = {};
    Object.entries(pincodeMap).forEach(([state, pincodeValue]) => {
      pincodeToCity[pincodeValue] = state;
    });
    return pincodeToCity[pincode] || '';
  }

  useEffect(() => {
    if (user.pincode) {
      getProducts(user.pincode).then(setProductList);
    }
  }, [user.pincode]);

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

  // Check if products are still loading
  const productsLoading = user.pincode && productList.length === 0;

  if (editing) {
    return (
      <div>
        <h2>Update your subscription</h2>
        <ProductSelector 
          selectedProducts={products} 
          onChange={setProducts} 
          pincode={cityPincodeMap[city]} 
        />
        <label>
          City:
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
      {productsLoading ? (
        <div style={{ color: '#666', fontStyle: 'italic' }}>Loading product details...</div>
      ) : (
        Object.entries(categorizeProducts(user.products)).map(([cat, items]) =>
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
