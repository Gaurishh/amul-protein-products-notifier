import React, { useEffect, useState } from 'react';
import { getProducts } from '../api';

function ProductSelector({ selectedProducts, onChange, pincode }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pincode) {
      setLoading(true);
      setError(null);
      getProducts(pincode)
        .then(setProducts)
        .catch(err => {
          setError(err.message);
          setProducts([]);
        })
        .finally(() => setLoading(false));
    }
  }, [pincode]);

  const handleToggle = productId => {
    if (selectedProducts.includes(productId)) {
      onChange(selectedProducts.filter(id => id !== productId));
    } else {
      onChange([...selectedProducts, productId]);
    }
  };

  const handleViewProduct = (productPageUrl) => {
    if (productPageUrl) {
      window.open(productPageUrl, '_blank');
    }
  };

  const allProductIds = products.map(p => p.productId);
  const allSelected = allProductIds.length > 0 && allProductIds.every(id => selectedProducts.includes(id));

  const handleSelectDeselectAll = () => {
    if (allSelected) {
      onChange([]); // Deselect all
    } else {
      onChange(allProductIds); // Select all
    }
  };

  // Helper to extract the first number from the end of a product name for sorting
  const extractLastNumber = (name) => {
    const matches = name.match(/\d+/g);
    return matches && matches.length > 0 ? parseInt(matches[matches.length - 1], 10) : Infinity;
  };

  // Categorize products by keywords in their names
  const categorizeProducts = (products) => {
    const categories = {
      'Milkshakes': [],
      'Paneer': [],
      'Whey Protein': [],
      'Lassi': [],
      'Buttermilk': [],
      'Milk': [],
      'Other': []
    };
    products.forEach(product => {
      const name = product.name.toLowerCase();
      if (name.includes('milkshake')) categories['Milkshakes'].push(product);
      else if (name.includes('paneer')) categories['Paneer'].push(product);
      else if (name.includes('whey')) categories['Whey Protein'].push(product);
      else if (name.includes('lassi')) categories['Lassi'].push(product);
      else if (name.includes('buttermilk')) categories['Buttermilk'].push(product);
      else if (name.match(/\bmilk\b/)) categories['Milk'].push(product);
      else categories['Other'].push(product);
    });
    // Sort each category by the last number in the product name, then alphabetically
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => {
        const numA = extractLastNumber(a.name);
        const numB = extractLastNumber(b.name);
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name);
      });
    });
    return categories;
  };

  const categorized = categorizeProducts(products);

  return (
    <div>
      <h3>Select products to get notified about:</h3>
      
      {/* Amul Store Link */}
      <div style={{ 
        marginBottom: 20, 
        padding: 16, 
        backgroundColor: '#f7fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: 8,
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 12px 0', color: '#4a5568', fontSize: '14px' }}>
          Browse all Amul protein products:
        </p>
        <a 
          href="https://shop.amul.com/en/browse/protein" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            backgroundColor: '#3182ce',
            color: 'white',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3182ce'}
        >
          Visit Amul Protein Store →
        </a>
      </div>

      {loading && <div>Loading products...</div>}
      {error && <div style={{ color: 'red', marginBottom: 10 }}>Error: {error}</div>}
      {!loading && !error && products.length > 0 && (
        <button type="button" onClick={handleSelectDeselectAll} style={{ marginBottom: 10 }}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      )}
      {!loading && !error && products.length === 0 && <div>No products available for this location.</div>}
      {Object.entries(categorized).map(([cat, items]) =>
        items.length > 0 && (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 12 }}>{cat}</h4>
            <div className="product-grid">
              {items.map(product => {
                const isSelected = selectedProducts.includes(product.productId);
                return (
                  <div 
                    key={product.productId} 
                    className={`product-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggle(product.productId)}
                  >
                    <div className="product-image-container">
                      {product.productImageUrl ? (
                        <img 
                          src={product.productImageUrl} 
                          alt={product.name}
                          className="product-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="product-image-placeholder" style={{ display: product.productImageUrl ? 'none' : 'flex' }}>
                        <span>No Image</span>
                      </div>
                      {isSelected && (
                        <div className="selection-tick">
                          <span>✓</span>
                        </div>
                      )}
                    </div>
                    <div className="product-info">
                      <h5 className="product-name">{product.name}</h5>
                      {product.productPageUrl && (
                        <button 
                          className="view-product-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProduct(product.productPageUrl);
                          }}
                        >
                          View Product
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default ProductSelector;
